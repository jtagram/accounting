import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '../page';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push, refresh }),
}));

const fetchMock = vi.fn();

async function fillAndSubmit() {
	const user = userEvent.setup();
	await user.type(screen.getByLabelText('Correo electrónico'), 'a@b.com');
	await user.type(screen.getByLabelText('Contraseña'), 'secret');
	await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('LoginPage', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('shows the heading and the credential fields', () => {
		render(<LoginPage />);

		expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
		expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email');
		expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('posts the credentials and redirects on success', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
		render(<LoginPage />);

		await fillAndSubmit();

		await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
		expect(refresh).toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/auth/login',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
			}),
		);
	});

	it('shows the server error message when login fails', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: 'Bad credentials' }), {
				status: 401,
			}),
		);
		render(<LoginPage />);

		await fillAndSubmit();

		expect(await screen.findByRole('alert')).toHaveTextContent('Bad credentials');
		expect(push).not.toHaveBeenCalled();
	});

	it('shows a fallback message when the error body is not JSON', async () => {
		fetchMock.mockResolvedValue(new Response('oops', { status: 500 }));
		render(<LoginPage />);

		await fillAndSubmit();

		expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo iniciar sesión.');
	});

	it('shows a fallback message when the error body has no message', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 500 }));
		render(<LoginPage />);

		await fillAndSubmit();

		expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo iniciar sesión.');
	});

	it('shows a connection error when fetch rejects', async () => {
		fetchMock.mockRejectedValue(new Error('network down'));
		render(<LoginPage />);

		await fillAndSubmit();

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'No se pudo conectar con el servidor.',
		);
		expect(push).not.toHaveBeenCalled();
	});

	it('clears a previous error when submitting again', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 }),
		);
		render(<LoginPage />);
		await fillAndSubmit();
		expect(await screen.findByRole('alert')).toBeInTheDocument();

		fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
		await userEvent.setup().click(screen.getByRole('button', { name: 'Ingresar' }));

		await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('disables the button while submitting', async () => {
		let resolveFetch!: (value: Response) => void;
		fetchMock.mockReturnValue(
			new Promise<Response>((resolve) => {
				resolveFetch = resolve;
			}),
		);
		render(<LoginPage />);

		await fillAndSubmit();

		expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled();

		resolveFetch(new Response(JSON.stringify({ ok: true })));
		await waitFor(() => expect(push).toHaveBeenCalled());
	});
});
