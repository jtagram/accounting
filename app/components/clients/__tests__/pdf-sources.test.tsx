import { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClientsProvider, useClients } from '@/app/lib/clients/clients-provider';
import type { ClientKind } from '@/app/lib/clients/models';

import { ClientsTable } from '../clients-table';
import { PdfSources } from '../pdf-sources';

const DOCUMENTS = [
	'Comprobantes emitidos',
	'Comprobantes recibidos',
	'Retenciones',
	'Acuse de recibo',
	'Monotributo',
	'Ingresos brutos',
	'Declaración jurada',
];

const APPS: Record<ClientKind, string[]> = {
	arca: ['ARCA', 'ARCA', 'ARCA', 'ARCA', 'ARCA', 'ARCA', 'ARCA'],
	'arca-agip': ['ARCA', 'ARCA', 'ARCA', 'ARCA', 'ARCA', 'ARCA', 'AGIP'],
	'arca-arba': ['ARCA', 'ARCA', 'ARCA', 'ARBA', 'ARCA', 'ARCA', 'ARBA'],
};

const KINDS = Object.keys(APPS) as ClientKind[];

function expectList(kind: ClientKind) {
	const region = screen.getByRole('region', { name: 'Origen de cada PDF' });
	const rows = within(region).getAllByRole('row').slice(1);
	expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual(
		DOCUMENTS.map((document, index) => [document, APPS[kind][index]]),
	);
}

describe('PdfSources', () => {
	it.each(KINDS)('renders the exact entries for %s', (kind) => {
		render(<PdfSources kind={kind} />);
		expectList(kind);
	});

	it.each(KINDS)('is shown by ClientsTable empty state for %s', (kind) => {
		render(
			<ClientsProvider>
				<ClientsTable kind={kind} />
			</ClientsProvider>,
		);
		expectList(kind);
	});

	it.each(KINDS)('is shown by ClientsTable with data for %s', (kind) => {
		function Seed() {
			const { replace } = useClients(kind);
			useEffect(() => {
				replace([{ nombre: 'ana', cuit: '20111111111', claveFiscal: 'x', claveCiudad: 'y', claveCit: 'z' }]);
			}, []);
			return null;
		}
		render(
			<ClientsProvider>
				<Seed />
				<ClientsTable kind={kind} />
			</ClientsProvider>,
		);
		expect(screen.getByText('ANA')).toBeInTheDocument();
		expectList(kind);
	});
});
