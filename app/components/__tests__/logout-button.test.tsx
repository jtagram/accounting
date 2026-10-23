import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('LogoutButton', () => {
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
