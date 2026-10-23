import { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ClientsProvider, useClients } from '@/app/lib/clients/clients-provider';
import { CLIENT_KIND_CONFIG, type ClientKind, type ClientOf } from '@/app/lib/clients/models';

import { ClientsTable } from '../clients-table';

function Seed<K extends ClientKind>({ kind, clients }: { kind: K; clients: ClientOf<K>[] }) {
	const { replace } = useClients(kind);
	useEffect(() => {
		replace(clients);
	}, []);
	return null;
}

// The PDF sources table renders first; the clients table is the last one.
function clientsTable() {
	return screen.getAllByRole('table').at(-1)!;
}

const arca = [{ nombre: 'juan perez', cuit: '20123456789', claveFiscal: 'top-secret' }];

describe('ClientsTable', () => {
	it.each(Object.keys(CLIENT_KIND_CONFIG) as ClientKind[])(
		'shows an empty state pointing to the header file selector for %s',
		(kind) => {
			render(
				<ClientsProvider>
					<ClientsTable kind={kind} />
				</ClientsProvider>,
			);
			expect(screen.getByText(/No hay clientes cargados/)).toBeInTheDocument();
			expect(screen.getByText(/selector de la esquina superior derecha/)).toBeInTheDocument();
			expect(screen.queryByRole('link')).not.toBeInTheDocument();
		},
	);

	it('shows only nombre and cuit, never the claves, and shows the count', () => {
		render(
			<ClientsProvider>
				<Seed
					kind='arca'
					clients={arca}
				/>
				<ClientsTable kind='arca' />
			</ClientsProvider>,
		);
		expect(screen.getByText('JUAN PEREZ')).toBeInTheDocument();
		expect(screen.queryByText('juan perez')).not.toBeInTheDocument();
		expect(screen.getByText('20123456789')).toBeInTheDocument();
		expect(within(clientsTable()).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
			'',
			'Nombre',
			'CUIT',
		]);
		expect(screen.queryByText('top-secret')).not.toBeInTheDocument();
		expect(screen.getByText('Clientes cargados: 1')).toBeInTheDocument();
	});

	it('does not render any clave column for ARCA-AGIP', () => {
		render(
			<ClientsProvider>
				<Seed
					kind='arca-agip'
					clients={[{ ...arca[0], claveCiudad: 'city-secret' }]}
				/>
				<ClientsTable kind='arca-agip' />
			</ClientsProvider>,
		);
		expect(within(clientsTable()).getAllByRole('columnheader')).toHaveLength(3);
		expect(screen.queryByText('top-secret')).not.toBeInTheDocument();
		expect(screen.queryByText('city-secret')).not.toBeInTheDocument();
	});

	it('clears the list with "Limpiar lista"', async () => {
		render(
			<ClientsProvider>
				<Seed
					kind='arca'
					clients={arca}
				/>
				<ClientsTable kind='arca' />
			</ClientsProvider>,
		);
		await userEvent.click(screen.getByRole('button', { name: 'Limpiar lista' }));
		expect(screen.getByText(/No hay clientes cargados/)).toBeInTheDocument();
		expect(screen.queryByText('JUAN PEREZ')).not.toBeInTheDocument();
	});

	it('shows when the list will be erased (HH:mm)', () => {
		render(
			<ClientsProvider>
				<Seed
					kind='arca'
					clients={arca}
				/>
				<ClientsTable kind='arca' />
			</ClientsProvider>,
		);
		expect(
			screen.getByText(/^La lista se borra automáticamente a las \d{2}:\d{2}\.$/),
		).toBeInTheDocument();
	});
});
