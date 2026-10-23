'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Spinner, Table } from 'react-bootstrap';

import { buildProcessPayload } from '@/app/lib/clients/build-process-payload';
import { useClients } from '@/app/lib/clients/clients-provider';
import { CLIENT_KIND_CONFIG, type ClientKind } from '@/app/lib/clients/models';
import { type ProcessOutcome, submitProcess } from '@/app/lib/clients/submit-process';

import { ClientsFileLoader, type LoaderFeedback, LoaderFeedbackAlert } from './clients-file-loader';
import { PdfSources } from './pdf-sources';

const EXPIRY_TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
});

/**
 * Selection of cuits tied to the exact list it was made on: when the list is
 * cleared, replaced or expires (new array identity) the selection is dropped.
 */
function useSelection<T extends { cuit: string }>(clients: T[]) {
	const [state, setState] = useState<{ list: T[]; cuits: ReadonlySet<string> }>({
		list: clients,
		cuits: new Set(),
	});
	const selected = state.list === clients ? state.cuits : new Set<string>();

	function update(next: ReadonlySet<string>) {
		setState({ list: clients, cuits: next });
	}

	return {
		selected,
		toggle: (cuit: string) => {
			const next = new Set(selected);
			if (!next.delete(cuit)) next.add(cuit);
			update(next);
		},
		setAll: (checked: boolean) => {
			update(checked ? new Set(clients.map((client) => client.cuit)) : new Set());
		},
	};
}

type Feedback = { variant: 'success' | 'warning' | 'danger'; message: string };

function feedbackFor(outcome: ProcessOutcome): Feedback {
	switch (outcome.kind) {
		case 'success':
			return { variant: 'success', message: 'Proceso finalizado. Se descargó el ZIP con el resultado.' };
		case 'errors-zip':
			return {
				variant: 'warning',
				message: 'El proceso terminó con errores. Revisá el ZIP descargado.',
			};
		case 'error':
			return { variant: 'danger', message: outcome.message };
	}
}

export function ClientsTable({ kind }: { kind: ClientKind }) {
	const config = CLIENT_KIND_CONFIG[kind];
	const { clients, clear, expiresAt } = useClients(kind);
	const { selected, toggle, setAll } = useSelection(clients);
	const [pendingCount, setPendingCount] = useState<number | null>(null);
	const [feedback, setFeedback] = useState<Feedback | null>(null);
	const [loadFeedback, setLoadFeedback] = useState<LoaderFeedback | null>(null);
	const inFlight = useRef(false);
	const mounted = useRef(true);
	const headerCheckbox = useRef<HTMLInputElement>(null);

	useEffect(() => {
		mounted.current = true;
		return () => {
			// The request is not aborted on unmount: the server-side job keeps
			// running either way, so the ZIP is still downloaded when it ends.
			mounted.current = false;
		};
	}, []);

	const allSelected = clients.length > 0 && selected.size === clients.length;
	const someSelected = selected.size > 0 && !allSelected;

	useEffect(() => {
		if (headerCheckbox.current) headerCheckbox.current.indeterminate = someSelected;
	}, [someSelected]);

	const isProcessing = pendingCount !== null;

	async function handleProcess() {
		if (inFlight.current || selected.size === 0) return;
		inFlight.current = true;
		const chosen = clients.filter((client) => selected.has(client.cuit));
		setFeedback(null);
		setPendingCount(chosen.length);
		let outcome: ProcessOutcome;
		try {
			outcome = await submitProcess(kind, buildProcessPayload(kind, chosen));
		} finally {
			inFlight.current = false;
		}
		if (!mounted.current) return;
		setPendingCount(null);
		setFeedback(feedbackFor(outcome));
	}

	return (
		<div>
			<div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
				<h1 className='h4 mb-0'>{config.processTitle}</h1>
				<ClientsFileLoader
					kind={kind}
					onFeedback={setLoadFeedback}
				/>
			</div>
			<LoaderFeedbackAlert feedback={loadFeedback} />
			<PdfSources kind={kind} />

			{clients.length === 0 ? (
				<Alert
					variant='info'
					role='note'
				>
					No hay clientes cargados en memoria. Seleccioná un archivo JSON con el selector de la esquina superior
						derecha.
				</Alert>
			) : (
				<>
					<div className='d-flex align-items-center justify-content-between mb-3'>
						<span>{`Clientes cargados: ${clients.length}`}</span>
						<Button
							type='button'
							variant='outline-danger'
							onClick={clear}
							disabled={isProcessing}
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
								<th>
									<Form.Check
										type='checkbox'
										ref={headerCheckbox}
										aria-label='Seleccionar todos'
										checked={allSelected}
										disabled={isProcessing}
										onChange={(event) => setAll(event.target.checked)}
									/>
								</th>
								<th>Nombre</th>
								<th>CUIT</th>
							</tr>
						</thead>
						<tbody>
							{clients.map((client) => (
								<tr key={client.cuit}>
									<td>
										<Form.Check
											type='checkbox'
											aria-label={`Seleccionar ${client.nombre}`}
											checked={selected.has(client.cuit)}
											disabled={isProcessing}
											onChange={() => toggle(client.cuit)}
										/>
									</td>
									<td>{client.nombre.toLocaleUpperCase('es-AR')}</td>
									<td>{client.cuit}</td>
								</tr>
							))}
						</tbody>
					</Table>
					<p className='small'>{`Seleccionados: ${selected.size} de ${clients.length}`}</p>
					<Button
						type='button'
						onClick={handleProcess}
						disabled={selected.size === 0 || isProcessing}
					>
						{isProcessing && (
							<Spinner
								as='span'
								animation='border'
								size='sm'
								role='presentation'
								aria-hidden='true'
								className='me-2'
							/>
						)}
						{`Procesar clientes (${selected.size})`}
					</Button>
					{isProcessing && (
						<Alert
							variant='info'
							className='mt-3'
							role='alert'
						>
							{`Procesando ${pendingCount} clientes. Puede tardar varios minutos, no cierres esta pestaña.`}
						</Alert>
					)}
					{feedback && (
						<Alert
							variant={feedback.variant}
							className='mt-3'
							role='alert'
						>
							{feedback.message}
						</Alert>
					)}
				</>
			)}
		</div>
	);
}
