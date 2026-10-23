import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClientsProvider } from '@/app/lib/clients/clients-provider';

import { ClientsTable } from '../clients-table';

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
			<ClientsTable kind={kind} />
		</ClientsProvider>,
	);
	return {
		file: screen.getByLabelText('Archivo JSON'),
		load: screen.getByRole('button', { name: 'Cargar' }),
	};
}

function fileInput() {
	// The input is remounted after a successful load, so always query it fresh.
	return screen.getByLabelText<HTMLInputElement>('Archivo JSON');
}

async function upload(content: string, name = 'clientes.json') {
	await userEvent.upload(fileInput(), new File([content], name, { type: 'application/json' }));
}

describe('ClientsFileLoader inside the process page', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('loads a file, reports only the count and clears the file input', async () => {
		const { load } = setup();
		await upload(json([client('ana'), client('beto')]));
		await userEvent.click(load);

		expect(await screen.findByRole('status')).toHaveTextContent(
			'Se cargaron 2 clientes en memoria. La lista se borra automáticamente a las 2 horas.',
		);
		expect(fileInput().files).toHaveLength(0);
		expect(screen.getByText('ANA')).toBeInTheDocument();
		expect(screen.queryByText(SECRET)).not.toBeInTheDocument();
	});

	it('replaces the previous list on a new load', async () => {
		const { load } = setup();
		await upload(json([client('ana'), client('beto')]));
		await userEvent.click(load);
		await screen.findByRole('status');
		await upload(json([client('carla')]));
		await userEvent.click(load);

		await waitFor(() => expect(screen.getByText('Clientes cargados: 1')).toBeInTheDocument());
		expect(screen.getByText('CARLA')).toBeInTheDocument();
		expect(screen.queryByText('ANA')).not.toBeInTheDocument();
	});

	it('shows validation errors without echoing values and keeps the previous list', async () => {
		const { load } = setup();
		await upload(json([client('ana')]));
		await userEvent.click(load);
		await screen.findByRole('status');

		await upload(json([{ nombre: 'x', cuit: `bad-${SECRET}`, claveFiscal: SECRET }]));
		await userEvent.click(load);

		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent('Cliente 1: el campo cuit es inválido.');
		expect(alert).not.toHaveTextContent(SECRET);
		expect(screen.getByText('ANA')).toBeInTheDocument();
	});

	it('shows a located syntax error without echoing content and keeps the previous list', async () => {
		const { load } = setup();
		await upload(json([client('ana')]));
		await userEvent.click(load);
		await screen.findByRole('status');

		await upload(`{"clientes": [{"nombre": "${SECRET}"\n"cuit": 1}]}`);
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
		const { load } = setup();
		await upload(json([client('ana')]));
		await userEvent.click(load);
		await screen.findByRole('status');

		const dup = { ...client('beto'), cuit: CUITS.carla };
		await upload(json([client('carla'), dup]));
		await userEvent.click(load);

		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent('Clientes 1 y 2: el cuit está repetido.');
		expect(alert).not.toHaveTextContent(CUITS.carla);
		expect(alert).not.toHaveTextContent(SECRET);
		expect(screen.getByText('ANA')).toBeInTheDocument();
		expect(screen.queryByText('CARLA')).not.toBeInTheDocument();
		expect(screen.getByText('Clientes cargados: 1')).toBeInTheDocument();
	});

	it('renders the loader in the header row next to the page title', () => {
		setup();
		const heading = screen.getByRole('heading', { level: 1 });
		expect(heading).toHaveTextContent('Procesar clientes ARCA');
		expect(heading.parentElement).toContainElement(screen.getByLabelText('Archivo JSON'));
		expect(heading.parentElement).toContainElement(screen.getByRole('button', { name: 'Cargar' }));
	});

	it('shows the empty state without a link to a load page', () => {
		setup();
		expect(
			screen.getByText(
				/No hay clientes cargados en memoria\. Seleccioná un archivo JSON con el selector de la esquina superior derecha\./,
			),
		).toBeInTheDocument();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('has no paste textarea', () => {
		setup();
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
	});

	it('asks for a file when none was selected', async () => {
		const { load } = setup();
		await userEvent.click(load);
		expect(await screen.findByRole('alert')).toHaveTextContent('Seleccione un archivo JSON.');
	});

	it('rejects an empty file and keeps the previous list', async () => {
		const { load } = setup();
		await upload(json([client('ana')]));
		await userEvent.click(load);
		await screen.findByRole('status');

		await upload('   ');
		await userEvent.click(load);
		expect(await screen.findByRole('alert')).toHaveTextContent('El archivo está vacío.');
		expect(screen.getByText('ANA')).toBeInTheDocument();
	});

	it('rejects oversize files without reading them', async () => {
		const { load } = setup();
		const big = new File(['x'], 'grande.json', { type: 'application/json' });
		Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
		const textSpy = vi.spyOn(big, 'text');
		await userEvent.upload(fileInput(), big);
		await userEvent.click(load);
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'El archivo es demasiado grande (máximo 5 MB).',
		);
		expect(textSpy).not.toHaveBeenCalled();
	});

	it('shows a generic message when reading fails', async () => {
		const { load } = setup();
		const broken = new File(['{}'], 'roto.json', { type: 'application/json' });
		vi.spyOn(broken, 'text').mockRejectedValue(new Error(SECRET));
		await userEvent.upload(fileInput(), broken);
		await userEvent.click(load);
		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent('No se pudo leer el archivo.');
		expect(alert).not.toHaveTextContent(SECRET);
	});

	it('requires the ARCA-AGIP shape for that kind', async () => {
		const { load } = setup('arca-agip');
		await upload(json([client('ana')]));
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

		const { load } = setup();
		await upload(json([client('ana')]));
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
