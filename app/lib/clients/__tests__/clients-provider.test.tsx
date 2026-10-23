import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	CLIENTS_TTL_MS,
	ClientsProvider,
	useClearAllClients,
	useClients,
} from '../clients-provider';
import type { ArcaAgipClient, ArcaClient } from '../models';

const wrapper = ({ children }: { children: ReactNode }) => (
	<ClientsProvider>{children}</ClientsProvider>
);

const a: ArcaClient = { nombre: 'a', cuit: '20123456789', claveFiscal: 'k1' };
const b: ArcaClient = { nombre: 'b', cuit: '20123456780', claveFiscal: 'k2' };
const agip: ArcaAgipClient = { ...a, claveCiudad: 'c' };

function useAll() {
	return {
		arca: useClients('arca'),
		agip: useClients('arca-agip'),
		arba: useClients('arca-arba'),
		clearAll: useClearAllClients(),
	};
}

describe('ClientsProvider', () => {
	it('starts with three empty independent lists', () => {
		const { result } = renderHook(useAll, { wrapper });
		expect(result.current.arca.clients).toEqual([]);
		expect(result.current.agip.clients).toEqual([]);
		expect(result.current.arba.clients).toEqual([]);
	});

	it('replaces (not appends) only the targeted list', () => {
		const { result } = renderHook(useAll, { wrapper });
		act(() => result.current.arca.replace([a]));
		act(() => result.current.agip.replace([agip]));
		act(() => result.current.arca.replace([b]));
		expect(result.current.arca.clients).toEqual([b]);
		expect(result.current.agip.clients).toEqual([agip]);
		expect(result.current.arba.clients).toEqual([]);
	});

	it('clears only the targeted list', () => {
		const { result } = renderHook(useAll, { wrapper });
		act(() => result.current.arca.replace([a]));
		act(() => result.current.agip.replace([agip]));
		act(() => result.current.arca.clear());
		expect(result.current.arca.clients).toEqual([]);
		expect(result.current.agip.clients).toEqual([agip]);
	});

	it('throws a data-free error outside the provider', () => {
		expect(() => renderHook(() => useClients('arca'))).toThrow(
			'useClients must be used within a ClientsProvider.',
		);
	});
});

describe('ClientsProvider auto-expiry', () => {
	const MIN = 60 * 1000;

	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('exposes a 2 hour TTL', () => {
		expect(CLIENTS_TTL_MS).toBe(2 * 60 * 60 * 1000);
	});

	it('wipes a list 2h after load, not before, and exposes expiresAt', () => {
		const { result } = renderHook(useAll, { wrapper });
		const loadedAt = Date.now();
		act(() => result.current.arca.replace([a]));
		expect(result.current.arca.expiresAt).toBe(loadedAt + CLIENTS_TTL_MS);
		act(() => {
			vi.advanceTimersByTime(119 * MIN);
		});
		expect(result.current.arca.clients).toEqual([a]);
		act(() => {
			vi.advanceTimersByTime(1 * MIN);
		});
		expect(result.current.arca.clients).toEqual([]);
		expect(result.current.arca.expiresAt).toBeNull();
	});

	it('restarts only that kind clock when reloading', () => {
		const { result } = renderHook(useAll, { wrapper });
		act(() => result.current.arca.replace([a]));
		act(() => result.current.agip.replace([agip]));
		act(() => {
			vi.advanceTimersByTime(90 * MIN);
		});
		act(() => result.current.arca.replace([b]));
		act(() => {
			vi.advanceTimersByTime(60 * MIN);
		});
		expect(result.current.agip.clients).toEqual([]);
		expect(result.current.arca.clients).toEqual([b]);
		act(() => {
			vi.advanceTimersByTime(60 * MIN);
		});
		expect(result.current.arca.clients).toEqual([]);
	});

	it('clearing cancels the pending timer', () => {
		const { result } = renderHook(useAll, { wrapper });
		act(() => result.current.arca.replace([a]));
		expect(vi.getTimerCount()).toBe(1);
		act(() => result.current.arca.clear());
		expect(vi.getTimerCount()).toBe(0);
		act(() => result.current.arca.replace([b]));
		act(() => result.current.arca.clear());
		act(() => result.current.arca.replace([a]));
		act(() => {
			vi.advanceTimersByTime(119 * MIN);
		});
		expect(result.current.arca.clients).toEqual([a]);
	});

	it.each([
		['document', 'visibilitychange'],
		['window', 'focus'],
	] as const)('purges expired lists on %s %s when timers did not fire', (target, type) => {
		const { result } = renderHook(useAll, { wrapper });
		act(() => result.current.arca.replace([a]));
		const base = Date.now();
		act(() => result.current.agip.replace([agip]));
		// Simulate a suspended machine: the clock jumps but timers never run.
		vi.setSystemTime(base + CLIENTS_TTL_MS + 1);
		expect(result.current.arca.clients).toEqual([a]);
		act(() => {
			(target === 'document' ? document : window).dispatchEvent(new Event(type));
		});
		expect(result.current.arca.clients).toEqual([]);
		expect(result.current.agip.clients).toEqual([]);
	});

	it('does not purge lists that have not expired on focus', () => {
		const { result } = renderHook(useAll, { wrapper });
		act(() => result.current.arca.replace([a]));
		vi.setSystemTime(Date.now() + 60 * MIN);
		act(() => {
			window.dispatchEvent(new Event('focus'));
		});
		expect(result.current.arca.clients).toEqual([a]);
	});

	it('clearAll wipes every list and cancels all timers', () => {
		const { result } = renderHook(useAll, { wrapper });
		act(() => result.current.arca.replace([a]));
		act(() => result.current.agip.replace([agip]));
		act(() => result.current.clearAll());
		expect(result.current.arca.clients).toEqual([]);
		expect(result.current.agip.clients).toEqual([]);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('leaves no timers or listeners after unmount', () => {
		const docRemove = vi.spyOn(document, 'removeEventListener');
		const winRemove = vi.spyOn(window, 'removeEventListener');
		const { result, unmount } = renderHook(useAll, { wrapper });
		act(() => result.current.arca.replace([a]));
		act(() => result.current.arba.replace([{ ...a, claveCit: 'z' }]));
		expect(vi.getTimerCount()).toBe(2);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
		expect(docRemove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
		expect(winRemove).toHaveBeenCalledWith('focus', expect.any(Function));
		docRemove.mockRestore();
		winRemove.mockRestore();
	});

	it('useClearAllClients is a no-op outside a provider', () => {
		const { result } = renderHook(() => useClearAllClients());
		expect(() => result.current()).not.toThrow();
	});
});
