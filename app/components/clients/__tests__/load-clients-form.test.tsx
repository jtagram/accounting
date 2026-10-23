import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClientsProvider } from '@/app/lib/clients/clients-provider';

import { ClientsTable } from '../clients-table';
import { LoadClientsForm } from '../load-clients-form';

const SECRET = 'top-secret-key';

function json(clients: unknown[]) {
	return JSON.stringify({ clientes: clients });
}

const CUITS: Record<string, string> = {
	ana: '20111111111',
	beto: '20222222222',
	carla: '20333333333',
};

function client(nombre: string, extra: Record<string, string> = { claveFiscal: SECRET }) {
	return { nombre, cuit: CUITS[nombre] ?? '20444444444', ...extra };
}

function setup(kind: 'arca' | 'arca-agip' = 'arca') {
	render(
		<ClientsProvider>
			<LoadClientsForm kind={kind} />
			<ClientsTable kind={kind} />
		</ClientsProvider>,
	);
	return {
		textarea: screen.getByLabelText('O pegue el JSON'),
		file: screen.getByLabelText('Archivo JSON'),
		load: screen.getByRole('button', { name: 'Cargar' }),
	};
}

async function paste(textarea: HTMLElement, value: string) {
	await userEvent.click(textarea);
	await userEvent.paste(value);
}

describe('LoadClientsForm', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('loads pasted JSON, reports only the count and clears the textarea', async () => {
		const { textarea, load } = setup();
		await paste(textarea, json([client('ana'), client('beto')]));
		await userEvent.click(load);

		expect(await screen.findByRole('status')).toHaveTextContent(
			'Se cargaron 2 clientes en memoria. La lista se borra automáticamente a las 2 horas.',
		);
		expect(textarea).toHaveValue('');
		expect(screen.getByText('ANA')).toBeInTheDocument();
		expect(screen.queryByText(SECRET)).not.toBeInTheDocument();
	});

	it('replaces the previous list on a new load', async () => {
		const { textarea, load } = setup();
		await paste(textarea, json([client('ana'), client('beto')]));
		await userEvent.click(load);
		await screen.findByRole('status');
		await paste(textarea, json([client('carla')]));
		await userEvent.click(load);

		await waitFor(() => expect(screen.getByText('Clientes cargados: 1')).toBeInTheDocument());
		expect(screen.getByText('CARLA')).toBeInTheDocument();
		expect(screen.queryByText('ANA')).not.toBeInTheDocument();
	});

	it('loads from a selected file', async () => {
		const { file, load } = setup();
		await userEvent.upload(
			file,
			new File([json([client('desde archivo')])], 'clientes.json', { type: 'application/json' }),
		);
		await userEvent.click(load);

		expect(await screen.findByRole('status')).toHaveTextContent(
			'Se cargaron 1 clientes en memoria. La lista se borra automáticamente a las 2 horas.',
		);
		expect(screen.getByText('DESDE ARCHIVO')).toBeInTheDocument();
	});

	it('shows validation errors without echoing values and keeps the previous list', async () => {
		const { textarea, load } = setup();
		await paste(textarea, json([client('ana')]));
		await userEvent.click(load);
		await screen.findByRole('status');

		await paste(textarea, json([{ nombre: 'x', cuit: `bad-${SECRET}`, claveFiscal: SECRET }]));
		await userEvent.click(load);

		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent('Cliente 1: el campo cuit es inválido.');
		expect(alert).not.toHaveTextContent(SECRET);
		expect(screen.getByText('ANA')).toBeInTheDocument();
	});

	it('shows a located syntax error without echoing content and keeps the previous list', async () => {
		const { textarea, load } = setup();
		await paste(textarea, json([client('ana')]));
		await userEvent.click(load);
		await screen.findByRole('status');

		await paste(textarea, `{"clientes": [{"nombre": "${SECRET}"\n"cuit": 1}]}`);
		await userEvent.click(load);

		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent(
			'JSON inválido en la línea 2, columna 1: comillas inesperadas, probablemente falta una coma entre elementos.',
		);
		expect(alert).not.toHaveTextContent(SECRET);
		expect(screen.getByText('ANA')).toBeInTheDocument();
		expect(screen.getByText('Clientes cargados: 1')).toBeInTheDocument();
	});

	it('rejects duplicate cuits and keeps the previous list', async () => {
		const { textarea, load } = setup();
		await paste(textarea, json([client('ana')]));
		await userEvent.click(load);
		await screen.findByRole('status');

		const dup = { ...client('beto'), cuit: CUITS.carla };
		await paste(textarea, json([client('carla'), dup]));
		await userEvent.click(load);

		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent('Clientes 1 y 2: el cuit está repetido.');
		expect(alert).not.toHaveTextContent(CUITS.carla);
		expect(alert).not.toHaveTextContent(SECRET);
		expect(screen.getByText('ANA')).toBeInTheDocument();
		expect(screen.queryByText('CARLA')).not.toBeInTheDocument();
		expect(screen.getByText('Clientes cargados: 1')).toBeInTheDocument();
	});

	it('asks for input when nothing was provided', async () => {
		const { load } = setup();
		await userEvent.click(load);
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Seleccione un archivo o pegue el JSON.',
		);
	});

	it('requires the ARCA-AGIP shape for that kind', async () => {
		const { textarea, load } = setup('arca-agip');
		await paste(textarea, json([client('ana')]));
		await userEvent.click(load);
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Cliente 1: falta el campo claveCiudad.',
		);
	});

	it('never touches web storage or the network', async () => {
		const storageGet = vi.spyOn(Storage.prototype, 'getItem');
		const storageSet = vi.spyOn(Storage.prototype, 'setItem');
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);

		const { textarea, load } = setup();
		await paste(textarea, json([client('ana')]));
		await userEvent.click(load);
		await screen.findByRole('status');
		await userEvent.click(screen.getByRole('button', { name: 'Limpiar lista' }));

		expect(storageGet).not.toHaveBeenCalled();
		expect(storageSet).not.toHaveBeenCalled();
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(document.cookie).toBe('');
		vi.unstubAllGlobals();
	});
});
