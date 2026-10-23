'use client';

import Link from 'next/link';
import { Alert, Button, Table } from 'react-bootstrap';

import { useClients } from '@/app/lib/clients/clients-provider';
import { CLIENT_KIND_CONFIG, type ClientKind } from '@/app/lib/clients/models';

const EXPIRY_TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
});

export function ClientsTable({ kind }: { kind: ClientKind }) {
	const config = CLIENT_KIND_CONFIG[kind];
	const { clients, clear, expiresAt } = useClients(kind);

	return (
		<div>
			<h1 className='h4 mb-3'>{config.processTitle}</h1>

			{clients.length === 0 ? (
				<Alert
					variant='info'
					role='note'
				>
					No hay clientes cargados en memoria. <Link href={config.loadHref}>Cargar clientes</Link>
				</Alert>
			) : (
				<>
					<div className='d-flex align-items-center justify-content-between mb-3'>
						<span>{`Clientes cargados: ${clients.length}`}</span>
						<Button
							type='button'
							variant='outline-danger'
							onClick={clear}
						>
							Limpiar lista
						</Button>
					</div>
					{expiresAt !== null && (
						<p className='text-muted small'>
							{`La lista se borra automáticamente a las ${EXPIRY_TIME_FORMAT.format(expiresAt)}.`}
						</p>
					)}
					<Table
						striped
						bordered
						size='sm'
					>
						<thead>
							<tr>
								<th>Nombre</th>
								<th>CUIT</th>
							</tr>
						</thead>
						<tbody>
							{clients.map((client, index) => (
								<tr key={index}>
									<td>{client.nombre.toLocaleUpperCase('es-AR')}</td>
									<td>{client.cuit}</td>
								</tr>
							))}
						</tbody>
					</Table>
				</>
			)}
		</div>
	);
}
