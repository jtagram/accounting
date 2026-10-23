'use client';

import { type FormEvent, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';

import { useClients } from '@/app/lib/clients/clients-provider';
import type { ClientKind } from '@/app/lib/clients/models';
import { parseClientsJson } from '@/app/lib/clients/validators';

const MAX_VISIBLE_ERRORS = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type LoaderFeedback = { type: 'success'; count: number } | { type: 'error'; errors: string[] };

/** Compact file input + "Cargar" button. Reports its outcome through `onFeedback`. */
export function ClientsFileLoader({
	kind,
	onFeedback,
}: {
	kind: ClientKind;
	onFeedback: (feedback: LoaderFeedback | null) => void;
}) {
	const { replace } = useClients(kind);
	const [file, setFile] = useState<File | null>(null);
	// Changing the key remounts the file input so the chosen file is dropped.
	const [fileInputKey, setFileInputKey] = useState(0);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onFeedback(null);

		if (!file) {
			onFeedback({ type: 'error', errors: ['Seleccione un archivo JSON.'] });
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			onFeedback({ type: 'error', errors: ['El archivo es demasiado grande (máximo 5 MB).'] });
			return;
		}

		let source: string;
		try {
			source = await file.text();
		} catch {
			onFeedback({ type: 'error', errors: ['No se pudo leer el archivo.'] });
			return;
		}
		if (!source.trim()) {
			onFeedback({ type: 'error', errors: ['El archivo está vacío.'] });
			return;
		}

		const result = parseClientsJson(kind, source);
		if (!result.ok) {
			onFeedback({ type: 'error', errors: result.errors });
			return;
		}

		replace(result.clients);
		setFile(null);
		setFileInputKey((current) => current + 1);
		onFeedback({ type: 'success', count: result.clients.length });
	}

	return (
		<Form
			onSubmit={handleSubmit}
			className='d-flex align-items-center gap-2'
		>
			<Form.Group controlId={`${kind}-file`}>
				<Form.Label className='visually-hidden'>Archivo JSON</Form.Label>
				<Form.Control
					key={fileInputKey}
					type='file'
					size='sm'
					accept='.json,application/json'
					onChange={(event) => setFile((event.target as HTMLInputElement).files?.[0] ?? null)}
				/>
			</Form.Group>
			<Button
				type='submit'
				variant='dark'
				size='sm'
			>
				Cargar
			</Button>
		</Form>
	);
}

export function LoaderFeedbackAlert({ feedback }: { feedback: LoaderFeedback | null }) {
	if (feedback?.type === 'error') {
		return (
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
		);
	}
	if (feedback?.type === 'success') {
		return (
			<Alert
				variant='success'
				role='status'
			>
				{`Se cargaron ${feedback.count} clientes en memoria. La lista se borra automáticamente a las 2 horas.`}
			</Alert>
		);
	}
	return null;
}
