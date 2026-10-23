export type ProcessOutcome =
	| { kind: 'success' }
	| { kind: 'errors-zip' }
	| { kind: 'error'; message: string };

const DEFAULT_ZIP_NAME = 'resultado.zip';

const GENERIC_ERROR = 'No se pudo procesar los clientes. Intentá nuevamente.';

/** Extracts a safe file name from Content-Disposition (filename* first, then filename). */
export function filenameFromContentDisposition(header: string | null): string {
	if (!header) return DEFAULT_ZIP_NAME;
	let name: string | undefined;
	const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
	if (extended) {
		try {
			name = decodeURIComponent(extended[1].trim());
		} catch {
			name = undefined;
		}
	}
	if (!name) {
		const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
		name = plain?.[1].trim();
	}
	// Drop any path component so the name cannot escape the downloads folder.
	const safe = name?.split(/[\\/]/).pop()?.trim();
	return safe ? safe : DEFAULT_ZIP_NAME;
}

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

function isZip(response: Response) {
	return (response.headers.get('Content-Type') ?? '').toLowerCase().includes('application/zip');
}

/**
 * POSTs the payload to the Next route handler and downloads the resulting ZIP.
 * Neither the payload nor the response body outlive this call and no message
 * ever contains client data.
 */
export async function submitProcess(kind: string, payload: unknown): Promise<ProcessOutcome> {
	let response: Response;
	try {
		response = await fetch(`/api/contabilidad/${kind}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	} catch {
		return { kind: 'error', message: 'No se pudo conectar con el servidor. Intentá nuevamente.' };
	}

	if ((response.status === 201 || response.status === 500) && isZip(response)) {
		try {
			const blob = await response.blob();
			downloadBlob(blob, filenameFromContentDisposition(response.headers.get('Content-Disposition')));
		} catch {
			return { kind: 'error', message: 'No se pudo descargar el resultado. Intentá nuevamente.' };
		}
		return response.status === 201 ? { kind: 'success' } : { kind: 'errors-zip' };
	}

	switch (response.status) {
		case 400:
			return {
				kind: 'error',
				message: 'Los datos enviados no son válidos. Revisá la lista de clientes.',
			};
		case 401:
			return { kind: 'error', message: 'Tu sesión expiró, volvé a iniciar sesión.' };
		case 403:
			return {
				kind: 'error',
				message: 'No tenés permisos (rol ADMIN) para procesar clientes.',
			};
		default:
			return { kind: 'error', message: GENERIC_ERROR };
	}
}
