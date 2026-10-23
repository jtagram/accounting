import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientsProvider, useClients } from '@/app/lib/clients/clients-provider';

import { LogoutButton } from '../logout-button';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push, refresh }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

function Seed() {
	const { replace } = useClients('arca');
	useEffect(() => {
		replace([{ nombre: 'n', cuit: '20123456789', claveFiscal: 'k' }]);
	}, []);
	return null;
}

function Probe({ onRender }: { onRender: (count: number) => void }) {
	onRender(useClients('arca').clients.length);
	return null;
}

describe('LogoutButton', () => {
	it('wipes all client lists before navigating to /login', async () => {
		let resolveFetch!: (value: Response) => void;
		fetchMock.mockReturnValue(
			new Promise<Response>((resolve) => {
				resolveFetch = resolve;
			}),
		);
		const counts: number[] = [];
		render(
			<ClientsProvider>
				<Seed />
				<Probe onRender={(count) => counts.push(count)} />
				<LogoutButton />
			</ClientsProvider>,
		);
		expect(counts.at(-1)).toBe(1);

		await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));

		expect(counts.at(-1)).toBe(0);
		expect(push).not.toHaveBeenCalled();
		resolveFetch(new Response(JSON.stringify({ ok: true })));
		await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
	});

	it('calls the logout endpoint and redirects to /login', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
		render(<LogoutButton />);

		await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));

		await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
		expect(refresh).toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
	});

	it('still redirects to /login and refreshes when the logout request fails, without an unhandled rejection', async () => {
		fetchMock.mockRejectedValue(new TypeError('network down'));
		const originalListeners = process.listeners('unhandledRejection');
		const unhandled: unknown[] = [];
		process.removeAllListeners('unhandledRejection');
		process.on('unhandledRejection', (reason) => unhandled.push(reason));

		try {
			render(<LogoutButton />);

			await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));

			await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
			expect(refresh).toHaveBeenCalled();
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(unhandled).toEqual([]);
		} finally {
			process.removeAllListeners('unhandledRejection');
			originalListeners.forEach((listener) => process.on('unhandledRejection', listener));
		}
	});

	it('disables the button while logging out', async () => {
		let resolveFetch!: (value: Response) => void;
		fetchMock.mockReturnValue(
			new Promise<Response>((resolve) => {
				resolveFetch = resolve;
			}),
		);
		render(<LogoutButton />);

		await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));

		expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeDisabled();

		resolveFetch(new Response(JSON.stringify({ ok: true })));
		await waitFor(() => expect(push).toHaveBeenCalled());
	});
});
