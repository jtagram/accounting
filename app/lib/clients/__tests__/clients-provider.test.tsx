import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ClientsProvider, useClients } from '../clients-provider';
import type { ArcaAgipClient, ArcaClient } from '../models';

const wrapper = ({ children }: { children: ReactNode }) => (
	<ClientsProvider>{children}</ClientsProvider>
);

const a: ArcaClient = { nombre: 'a', cuit: '20123456789', claveFiscal: 'k1' };
const b: ArcaClient = { nombre: 'b', cuit: '20123456780', claveFiscal: 'k2' };
const agip: ArcaAgipClient = { ...a, claveCiudad: 'c' };

function useAll() {
	return { arca: useClients('arca'), agip: useClients('arca-agip'), arba: useClients('arca-arba') };
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
