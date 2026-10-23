'use client';

import Link from 'next/link';
import { Alert, Button, Table } from 'react-bootstrap';

import { useClients } from '@/app/lib/clients/clients-provider';
import { CLIENT_KIND_CONFIG, type ClientKind } from '@/app/lib/clients/models';

export const MASKED_SECRET = '••••••••';

export function ClientsTable({ kind }: { kind: ClientKind }) {
	const config = CLIENT_KIND_CONFIG[kind];
	const { clients, clear } = useClients(kind);

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
					<Table
						striped
						bordered
						size='sm'
					>
						<thead>
							<tr>
								<th>Nombre</th>
								<th>CUIT</th>
								{config.secretFields.map((field) => (
									<th key={field.key}>{field.label}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{clients.map((client, index) => (
								<tr key={index}>
									<td>{client.nombre}</td>
									<td>{client.cuit}</td>
									{config.secretFields.map((field) => (
										<td key={field.key}>{MASKED_SECRET}</td>
									))}
								</tr>
							))}
						</tbody>
					</Table>
				</>
			)}
		</div>
	);
}
