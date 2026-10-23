import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as postArca } from '../arca/route';
import { POST as postArcaAgip } from '../arca-agip/route';
import { POST as postArcaArba } from '../arca-arba/route';

let cookieValue: string | undefined;
vi.mock('next/headers', () => ({
	cookies: () => Promise.resolve({ get: () => (cookieValue ? { value: cookieValue } : undefined) }),
}));

interface Captured {
	url?: string;
	headers?: IncomingHttpHeaders;
	body?: string;
}

let server: Server;
let captured: Captured;
let reply: (res: import('node:http').ServerResponse) => void;

beforeAll(async () => {
	server = createServer((req, res) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => chunks.push(chunk));
		req.on('end', () => {
			captured = { url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() };
			reply(res);
		});
	});
	await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
	process.env.ACCOUNTING_API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

beforeEach(() => {
	cookieValue = 'jwt-token';
	captured = {};
	reply = (res) => {
		res.writeHead(201, {
			'Content-Type': 'application/zip',
			'Content-Disposition': "attachment; filename*=UTF-8''out.zip",
		});
		res.end('ZIPDATA');
	};
});
afterEach(() => vi.restoreAllMocks());

const request = (body = '{"clientes":[{"cuit":"1"}]}') =>
	new Request('http://localhost/api/contabilidad/x', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Cookie: 'accounting_access_token=jwt-token' },
		body,
	});

describe.each([
	['arca', postArca],
	['arca-agip', postArcaAgip],
	['arca-arba', postArcaArba],
])('POST /api/contabilidad/%s', (kind, handler) => {
	it('returns 401 JSON without cookie and does not call the API', async () => {
		cookieValue = undefined;
		const res = await handler(request());
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ message: 'No autenticado.' });
		expect(captured.url).toBeUndefined();
	});

	it('forwards Bearer token and body, preserves status and headers, no cookies', async () => {
		const res = await handler(request());
		expect(captured.url).toBe(`/contabilidad/${kind}`);
		expect(captured.headers?.authorization).toBe('Bearer jwt-token');
		expect(captured.headers?.cookie).toBeUndefined();
		expect(captured.body).toBe('{"clientes":[{"cuit":"1"}]}');
		expect(res.status).toBe(201);
		expect(res.headers.get('content-type')).toBe('application/zip');
		expect(res.headers.get('content-disposition')).toBe("attachment; filename*=UTF-8''out.zip");
		expect(await res.text()).toBe('ZIPDATA');
	});
});

describe('proxy behaviour', () => {
	it('keeps the 500 zip', async () => {
		reply = (res) => {
			res.writeHead(500, { 'Content-Type': 'application/zip' });
			res.end('ZIP');
		};
		const res = await postArca(request());
		expect(res.status).toBe(500);
		expect(res.headers.get('content-type')).toBe('application/zip');
		expect(await res.text()).toBe('ZIP');
	});

	it.each([400, 401, 403])('passes through %s JSON', async (status) => {
		reply = (res) => {
			res.writeHead(status, { 'Content-Type': 'application/json' });
			res.end('{"message":"x"}');
		};
		const res = await postArca(request());
		expect(res.status).toBe(status);
		expect(await res.json()).toEqual({ message: 'x' });
	});

	it('answers 502 when the API is unreachable', async () => {
		const previous = process.env.ACCOUNTING_API_URL;
		process.env.ACCOUNTING_API_URL = 'http://127.0.0.1:1';
		const res = await postArca(request());
		process.env.ACCOUNTING_API_URL = previous;
		expect(res.status).toBe(502);
	});

	it('does not call console', async () => {
		const spies = (['log', 'error', 'warn', 'info', 'debug'] as const).map((m) =>
			vi.spyOn(console, m).mockImplementation(() => {}),
		);
		await postArca(request());
		cookieValue = undefined;
		await postArca(request());
		spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
	});

	it('requires ACCOUNTING_API_URL', async () => {
		const previous = process.env.ACCOUNTING_API_URL;
		delete process.env.ACCOUNTING_API_URL;
		await expect(postArca(request())).rejects.toThrow('ACCOUNTING_API_URL');
		process.env.ACCOUNTING_API_URL = previous;
	});
});
