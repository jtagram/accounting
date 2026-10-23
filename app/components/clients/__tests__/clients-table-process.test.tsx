import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { ClientsProvider, useClients } from '@/app/lib/clients/clients-provider';

import { ClientsTable } from '../clients-table';

const clients = [
	{ nombre: 'ana', cuit: '20111111111', claveFiscal: 'secret-a' },
	{ nombre: 'beto', cuit: '20222222222', claveFiscal: 'secret-b' },
];

function Seed() {
	const { replace } = useClients('arca');
	useEffect(() => {
		replace(clients);
	}, []);
	return null;
}

function setup() {
	return render(
		<ClientsProvider>
			<Seed />
			<ClientsTable kind='arca' />
		</ClientsProvider>,
	);
}

const processButton = () => screen.getByRole('button', { name: /^Procesar clientes/ });

describe('ClientsTable selection and processing', () => {
	const fetchMock = vi.fn();
	let setItem: MockInstance;

	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);
		URL.createObjectURL = vi.fn(() => 'blob:x');
		URL.revokeObjectURL = vi.fn();
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		setItem = vi.spyOn(Storage.prototype, 'setItem');
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		fetchMock.mockReset();
	});

	it('starts with nothing selected and the button disabled', () => {
		setup();
		expect(screen.getByText('Seleccionados: 0 de 2')).toBeInTheDocument();
		expect(processButton()).toBeDisabled();
		expect(screen.getByRole('checkbox', { name: 'Seleccionar ana' })).not.toBeChecked();
	});

	it('supports select all, none and indeterminate', async () => {
		setup();
		const all = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Seleccionar todos' });
		await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar ana' }));
		expect(all.indeterminate).toBe(true);
		expect(screen.getByText('Seleccionados: 1 de 2')).toBeInTheDocument();
		expect(processButton()).toBeEnabled();
		expect(processButton()).toHaveTextContent('Procesar clientes (1)');

		await userEvent.click(all);
		expect(all.checked).toBe(true);
		expect(all.indeterminate).toBe(false);
		expect(screen.getByText('Seleccionados: 2 de 2')).toBeInTheDocument();

		await userEvent.click(all);
		expect(screen.getByText('Seleccionados: 0 de 2')).toBeInTheDocument();
		expect(processButton()).toBeDisabled();
	});

	it('drops the selection when the list is replaced', async () => {
		function Reload() {
			const { replace } = useClients('arca');
			return (
				<button
					type='button'
					onClick={() => replace([...clients])}
				>
					recargar
				</button>
			);
		}
		render(
			<ClientsProvider>
				<Seed />
				<Reload />
				<ClientsTable kind='arca' />
			</ClientsProvider>,
		);
		await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar ana' }));
		expect(screen.getByText('Seleccionados: 1 de 2')).toBeInTheDocument();
		await userEvent.click(screen.getByRole('button', { name: 'recargar' }));
		expect(screen.getByText('Seleccionados: 0 de 2')).toBeInTheDocument();
		await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar ana' }));
		await userEvent.click(screen.getByRole('button', { name: 'Limpiar lista' }));
		expect(screen.getByText(/No hay clientes cargados/)).toBeInTheDocument();
	});

	it('sends only the selected clients (no nombre), disabling the button while pending', async () => {
		let resolve!: (response: Response) => void;
		fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
		setup();
		await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar beto' }));
		await userEvent.click(processButton());

		expect(JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body)).toEqual({
			clientes: [{ cuit: '20222222222', claveFiscal: 'secret-b' }],
		});
		expect(processButton()).toBeDisabled();
		expect(
			screen.getByText(
				'Procesando 1 clientes. Puede tardar varios minutos, no cierres esta pestaña.',
			),
		).toBeInTheDocument();
		await userEvent.click(processButton());
		expect(fetchMock).toHaveBeenCalledTimes(1);

		resolve(
			new Response(new Uint8Array([1]), {
				status: 201,
				headers: { 'Content-Type': 'application/zip' },
			}),
		);
		await waitFor(() => expect(screen.getByText(/Se descargó el ZIP/)).toBeInTheDocument());
		expect(processButton()).toBeEnabled();
		expect(setItem).not.toHaveBeenCalled();
	});

	it('warns when the run finished with errors (500 zip)', async () => {
		fetchMock.mockResolvedValue(
			new Response(new Uint8Array([1]), {
				status: 500,
				headers: { 'Content-Type': 'application/zip' },
			}),
		);
		setup();
		await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todos' }));
		await userEvent.click(processButton());
		expect(
			await screen.findByText('El proceso terminó con errores. Revisá el ZIP descargado.'),
		).toBeInTheDocument();
	});

	it.each([
		[401, 'Tu sesión expiró, volvé a iniciar sesión.'],
		[403, 'No tenés permisos (rol ADMIN) para procesar clientes.'],
	])('shows the %s message', async (status, message) => {
		fetchMock.mockResolvedValue(new Response('{}', { status }));
		setup();
		await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar ana' }));
		await userEvent.click(processButton());
		expect(await screen.findByText(message)).toBeInTheDocument();
		expect(document.body.textContent).not.toContain('secret-');
	});
});
