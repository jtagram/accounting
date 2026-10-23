import { NextResponse } from 'next/server';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';

import { getAuthToken } from '@/app/lib/backend-proxy';
import { requireEnv } from '@/app/lib/require-env';

const FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'content-length'];

/**
 * Forwards a processing request to accounting-api with the session JWT and
 * streams the answer (usually a ZIP) back.
 *
 * It uses node:http(s) instead of fetch on purpose: undici (behind fetch) aborts
 * when response headers take more than 300 s, and the RPA run only answers once
 * it has finished (many minutes). node:http has no headers timeout by default and
 * no timeout is set here. Nothing is logged and the browser cookies are never
 * forwarded; only the Bearer token and the JSON body are sent.
 */
export async function proxyProcessRequest(request: Request, path: string): Promise<Response> {
	const baseUrl = requireEnv('ACCOUNTING_API_URL', process.env.ACCOUNTING_API_URL);
	const { token, unauthorized } = await getAuthToken();
	if (unauthorized) {
		return unauthorized;
	}

	const body = Buffer.from(await request.text(), 'utf8');
	const target = new URL(`${baseUrl.replace(/\/+$/, '')}/contabilidad/${path}`);
	const send = target.protocol === 'https:' ? httpsRequest : httpRequest;

	return new Promise<Response>((resolve) => {
		const upstream = send(
			target,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': body.length,
					Accept: 'application/zip, application/json',
					Authorization: `Bearer ${token}`,
				},
			},
			(upstreamResponse) => {
				const headers = new Headers();
				for (const name of FORWARDED_RESPONSE_HEADERS) {
					const value = upstreamResponse.headers[name];
					if (typeof value === 'string') headers.set(name, value);
				}
				resolve(
					new Response(Readable.toWeb(upstreamResponse) as ReadableStream, {
						status: upstreamResponse.statusCode ?? 502,
						headers,
					}),
				);
			},
		);

		upstream.on('error', () => {
			resolve(
				NextResponse.json(
					{ message: 'No se pudo conectar con el servicio de contabilidad.' },
					{ status: 502 },
				),
			);
		});
		// The browser gave up: stop waiting. The server-side job keeps running anyway.
		request.signal.addEventListener('abort', () => upstream.destroy(), { once: true });
		upstream.end(body);
	});
}
