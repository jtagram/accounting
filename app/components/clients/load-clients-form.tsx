'use client';

import { type FormEvent, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';

import { useClients } from '@/app/lib/clients/clients-provider';
import { CLIENT_KIND_CONFIG, type ClientKind } from '@/app/lib/clients/models';
import { parseClientsJson } from '@/app/lib/clients/validators';

import { PdfSources } from './pdf-sources';

const MAX_VISIBLE_ERRORS = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Feedback = { type: 'success'; count: number } | { type: 'error'; errors: string[] };

export function LoadClientsForm({ kind }: { kind: ClientKind }) {
	const config = CLIENT_KIND_CONFIG[kind];
	const { replace } = useClients(kind);
	const [file, setFile] = useState<File | null>(null);
	// Changing the key remounts the file input so the chosen file is dropped.
	const [fileInputKey, setFileInputKey] = useState(0);
	const [feedback, setFeedback] = useState<Feedback | null>(null);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFeedback(null);

		if (!file) {
			setFeedback({ type: 'error', errors: ['Seleccione un archivo JSON.'] });
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			setFeedback({
				type: 'error',
				errors: ['El archivo es demasiado grande (máximo 5 MB).'],
			});
			return;
		}

		let source: string;
		try {
			source = await file.text();
		} catch {
			setFeedback({ type: 'error', errors: ['No se pudo leer el archivo.'] });
			return;
		}
		if (!source.trim()) {
			setFeedback({ type: 'error', errors: ['El archivo está vacío.'] });
			return;
		}

		const result = parseClientsJson(kind, source);
		if (!result.ok) {
			setFeedback({ type: 'error', errors: result.errors });
			return;
		}

		replace(result.clients);
		setFile(null);
		setFileInputKey((current) => current + 1);
		setFeedback({ type: 'success', count: result.clients.length });
	}

	return (
		<Form onSubmit={handleSubmit}>
			<h1 className='h4 mb-3'>{config.loadTitle}</h1>
			<PdfSources kind={kind} />
			<p className='text-muted'>
				Los datos se leen en este navegador y quedan solo en memoria: no se envían ni se guardan, y
				se pierden al recargar la página.
			</p>

			<Form.Group
				className='mb-3'
				controlId={`${kind}-file`}
			>
				<Form.Label>Archivo JSON</Form.Label>
				<Form.Control
					key={fileInputKey}
					type='file'
					accept='.json,application/json'
					onChange={(event) => setFile((event.target as HTMLInputElement).files?.[0] ?? null)}
				/>
			</Form.Group>

			{feedback?.type === 'error' && (
				<Alert
					variant='danger'
					role='alert'
				>
					<ul className='mb-0'>
						{feedback.errors.slice(0, MAX_VISIBLE_ERRORS).map((message) => (
							<li key={message}>{message}</li>
						))}
						{feedback.errors.length > MAX_VISIBLE_ERRORS && (
							<li>{`… y ${feedback.errors.length - MAX_VISIBLE_ERRORS} errores más.`}</li>
						)}
					</ul>
				</Alert>
			)}
			{feedback?.type === 'success' && (
				<Alert
					variant='success'
					role='status'
				>
					{`Se cargaron ${feedback.count} clientes en memoria. La lista se borra automáticamente a las 2 horas.`}
				</Alert>
			)}

			<Button
				type='submit'
				variant='dark'
			>
				Cargar
			</Button>
		</Form>
	);
}
