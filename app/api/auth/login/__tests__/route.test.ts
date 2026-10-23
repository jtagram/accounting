import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIE_NAME } from '@/app/lib/auth-cookie';

import { POST } from '../route';

const cookieSet = vi.fn();

vi.mock('next/headers', () => ({
	cookies: () => Promise.resolve({ set: cookieSet }),
}));

const fetchMock = vi.fn();

function loginRequest(body: unknown) {
	return new Request('http://localhost/api/auth/login', {
		method: 'POST',
		body: typeof body === 'string' ? body : JSON.stringify(body),
	});
}

function iamResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status });
}

describe('POST /api/auth/login', () => {
	beforeEach(() => {
		vi.stubEnv('IAM_API_URL', 'http://iam.test');
		vi.stubEnv('ACCOUNTING_APPLICATION_NAME', 'accounting');
		vi.stubEnv('ACCOUNTING_TARGET_APPLICATION_NAME', 'target-app');
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('returns 400 when the body is not valid JSON', async () => {
		const res = await POST(loginRequest('not-json'));

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			message: 'Cuerpo de la petición inválido.',
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each([
		['password', { email: 'a@b.com' }],
		['email', { password: 'x' }],
	])('returns 400 when %s is missing', async (_field, body) => {
		const res = await POST(loginRequest(body));

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			message: 'Correo y contraseña son obligatorios.',
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('forwards the IAM error status and message', async () => {
		fetchMock.mockResolvedValue(iamResponse({ message: 'Bad credentials' }, 401));

		const res = await POST(loginRequest({ email: 'a@b.com', password: 'x' }));

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ message: 'Bad credentials' });
		expect(cookieSet).not.toHaveBeenCalled();
	});

	it('joins array messages from IAM', async () => {
		fetchMock.mockResolvedValue(iamResponse({ message: ['one', 'two'] }, 400));

		const res = await POST(loginRequest({ email: 'a@b.com', password: 'x' }));

		expect(await res.json()).toEqual({ message: 'one, two' });
	});

	it('uses a fallback message when IAM sends none', async () => {
		fetchMock.mockResolvedValue(iamResponse({}, 500));

		const res = await POST(loginRequest({ email: 'a@b.com', password: 'x' }));

		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ message: 'No se pudo iniciar sesión.' });
		expect(cookieSet).not.toHaveBeenCalled();
	});

	it('sets the auth cookie and returns ok on success', async () => {
		fetchMock.mockResolvedValue(iamResponse({ access_token: 'tok123' }));

		const res = await POST(loginRequest({ email: 'a@b.com', password: 'x' }));

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledWith('http://iam.test/internal-users/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-origin-application': 'accounting',
				'x-target-application': 'target-app',
			},
			body: JSON.stringify({ email: 'a@b.com', password: 'x' }),
		});
		expect(cookieSet).toHaveBeenCalledWith(
			AUTH_COOKIE_NAME,
			'tok123',
			expect.objectContaining({
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
			}),
		);
	});

	it('marks the cookie secure unless running in development', async () => {
		fetchMock.mockImplementation(() => Promise.resolve(iamResponse({ access_token: 'tok123' })));

		vi.stubEnv('NODE_ENV', 'production');
		await POST(loginRequest({ email: 'a@b.com', password: 'x' }));
		vi.stubEnv('NODE_ENV', 'development');
		await POST(loginRequest({ email: 'a@b.com', password: 'x' }));

		expect(cookieSet.mock.calls[0][2]).toMatchObject({ secure: true });
		expect(cookieSet.mock.calls[1][2]).toMatchObject({ secure: false });
	});

	it.each(['IAM_API_URL', 'ACCOUNTING_APPLICATION_NAME', 'ACCOUNTING_TARGET_APPLICATION_NAME'])(
		'throws when %s is missing',
		async (name) => {
			vi.stubEnv(name, '');

			await expect(POST(loginRequest({ email: 'a@b.com', password: 'x' }))).rejects.toThrow(
				`${name} environment variable is required`,
			);
		},
	);

	it("uses the fallback message with IAM's status when an error body is not JSON", async () => {
		fetchMock.mockResolvedValue(new Response('<html>', { status: 503 }));

		const res = await POST(loginRequest({ email: 'a@b.com', password: 'x' }));

		expect(res.status).toBe(503);
		expect(await res.json()).toEqual({ message: 'No se pudo iniciar sesión.' });
		expect(cookieSet).not.toHaveBeenCalled();
	});

	it('returns 502 and sets no cookie when an OK body is not JSON', async () => {
		fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }));

		const res = await POST(loginRequest({ email: 'a@b.com', password: 'x' }));

		expect(res.status).toBe(502);
		expect(await res.json()).toEqual({ message: 'No se pudo iniciar sesión.' });
		expect(cookieSet).not.toHaveBeenCalled();
	});

	it('returns 502 and sets no cookie when IAM returns no access_token', async () => {
		fetchMock.mockResolvedValue(iamResponse({}));

		const res = await POST(loginRequest({ email: 'a@b.com', password: 'x' }));

		expect(res.status).toBe(502);
		expect(await res.json()).toEqual({ message: 'No se pudo iniciar sesión.' });
		expect(cookieSet).not.toHaveBeenCalled();
	});
});
