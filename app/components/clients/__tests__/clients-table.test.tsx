import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ClientsProvider, useClients } from '@/app/lib/clients/clients-provider';
import { CLIENT_KIND_CONFIG, type ClientKind, type ClientOf } from '@/app/lib/clients/models';

import { ClientsTable, MASKED_SECRET } from '../clients-table';

function Seed<K extends ClientKind>({ kind, clients }: { kind: K; clients: ClientOf<K>[] }) {
	const { replace } = useClients(kind);
	useEffect(() => {
		replace(clients);
	}, []);
	return null;
}

const arca = [{ nombre: 'juan perez', cuit: '20123456789', claveFiscal: 'top-secret' }];

describe('ClientsTable', () => {
	it.each(Object.keys(CLIENT_KIND_CONFIG) as ClientKind[])(
		'shows an empty state linking to the load page for %s',
		(kind) => {
			render(
				<ClientsProvider>
					<ClientsTable kind={kind} />
				</ClientsProvider>,
			);
			expect(screen.getByText(/No hay clientes cargados/)).toBeInTheDocument();
			expect(screen.getByRole('link', { name: 'Cargar clientes' })).toHaveAttribute(
				'href',
				CLIENT_KIND_CONFIG[kind].loadHref,
			);
		},
	);

	it('shows nombre and cuit in clear, masks claves and shows the count', () => {
		render(
			<ClientsProvider>
				<Seed
					kind='arca'
					clients={arca}
				/>
				<ClientsTable kind='arca' />
			</ClientsProvider>,
		);
		expect(screen.getByText('juan perez')).toBeInTheDocument();
		expect(screen.getByText('20123456789')).toBeInTheDocument();
		expect(screen.getByText(MASKED_SECRET)).toBeInTheDocument();
		expect(screen.queryByText('top-secret')).not.toBeInTheDocument();
		expect(screen.getByText('Clientes cargados: 1')).toBeInTheDocument();
	});

	it('renders one masked column per clave for ARCA-AGIP', () => {
		render(
			<ClientsProvider>
				<Seed
					kind='arca-agip'
					clients={[{ ...arca[0], claveCiudad: 'city-secret' }]}
				/>
				<ClientsTable kind='arca-agip' />
			</ClientsProvider>,
		);
		expect(screen.getAllByText(MASKED_SECRET)).toHaveLength(2);
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
		expect(screen.queryByText('juan perez')).not.toBeInTheDocument();
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
		expect(screen.getByText(/^La lista se borra automáticamente a las \d{2}:\d{2}\.$/)).toBeInTheDocument();
	});
});
