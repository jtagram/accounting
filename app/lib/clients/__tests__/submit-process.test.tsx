import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { filenameFromContentDisposition, submitProcess } from '../submit-process';

describe('filenameFromContentDisposition', () => {
	it.each([
		[null, 'resultado.zip'],
		["attachment; filename*=UTF-8''res%20%C3%BAltimo.zip", 'res último.zip'],
		['attachment; filename="a.zip"', 'a.zip'],
		["attachment; filename*=UTF-8''..%2F..%2Fevil.zip", 'evil.zip'],
		['attachment', 'resultado.zip'],
	])('%s -> %s', (header, expected) => {
		expect(filenameFromContentDisposition(header)).toBe(expected);
	});
});

function zipResponse(status: number) {
	return new Response(new Uint8Array([1, 2, 3]), {
		status,
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': "attachment; filename*=UTF-8''out.zip",
		},
	});
}

describe('submitProcess', () => {
	const fetchMock = vi.fn();
	const revokeMock = vi.fn();
	let anchorClick: MockInstance;

	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);
		URL.createObjectURL = vi.fn(() => 'blob:x');
		URL.revokeObjectURL = revokeMock;
		anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		fetchMock.mockReset();
	});

	it('downloads the zip on 201', async () => {
		fetchMock.mockResolvedValue(zipResponse(201));
		const outcome = await submitProcess('arca', { clientes: [] });
		expect(outcome).toEqual({ kind: 'success' });
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/contabilidad/arca',
			expect.objectContaining({ method: 'POST', body: '{"clientes":[]}' }),
		);
		expect(anchorClick).toHaveBeenCalledTimes(1);
		expect(revokeMock).toHaveBeenCalledWith('blob:x');
	});

	it('downloads the zip and warns on 500 zip', async () => {
		fetchMock.mockResolvedValue(zipResponse(500));
		expect(await submitProcess('arca', {})).toEqual({ kind: 'errors-zip' });
		expect(anchorClick).toHaveBeenCalledTimes(1);
	});

	it.each([
		[400, 'Los datos enviados no son válidos. Revisá la lista de clientes.'],
		[401, 'Tu sesión expiró, volvé a iniciar sesión.'],
		[403, 'No tenés permisos (rol ADMIN) para procesar clientes.'],
		[500, 'No se pudo procesar los clientes. Intentá nuevamente.'],
	])('maps %s to a generic message', async (status, message) => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: 'secret-detail' }), {
				status,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		expect(await submitProcess('arca', {})).toEqual({ kind: 'error', message });
		expect(anchorClick).not.toHaveBeenCalled();
	});

	it('handles network errors', async () => {
		fetchMock.mockRejectedValue(new TypeError('boom'));
		const outcome = await submitProcess('arca', {});
		expect(outcome.kind).toBe('error');
	});
});
