import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME } from '@/app/lib/auth-cookie';
import { readBackendBody, UNREADABLE_BACKEND_BODY_STATUS } from '@/app/lib/backend-proxy';
import { requireEnv } from '@/app/lib/require-env';

interface LoginRequestBody {
	email?: string;
	password?: string;
}

/** IAM envelope: `{ ok, msg, data }`; `data` is `{ access_token }` on a successful login. */
interface IamLoginEnvelope {
	ok?: boolean;
	msg?: string;
	data?: { access_token?: string } | null;
}

export async function POST(request: Request) {
	const IAM_API_URL = requireEnv('IAM_API_URL', process.env.IAM_API_URL);
	const ACCOUNTING_APPLICATION_NAME = requireEnv(
		'ACCOUNTING_APPLICATION_NAME',
		process.env.ACCOUNTING_APPLICATION_NAME,
	);
	const ACCOUNTING_TARGET_APPLICATION_NAME = requireEnv(
		'ACCOUNTING_TARGET_APPLICATION_NAME',
		process.env.ACCOUNTING_TARGET_APPLICATION_NAME,
	);
	let body: LoginRequestBody;
	try {
		body = (await request.json()) as LoginRequestBody;
	} catch {
		return NextResponse.json({ message: 'Cuerpo de la petición inválido.' }, { status: 400 });
	}

	const { email, password } = body;
	if (!email || !password) {
		return NextResponse.json({ message: 'Correo y contraseña son obligatorios.' }, { status: 400 });
	}

	const iamResponse = await fetch(`${IAM_API_URL}/internal-users/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-origin-application': ACCOUNTING_APPLICATION_NAME,
			'x-target-application': ACCOUNTING_TARGET_APPLICATION_NAME,
		},
		body: JSON.stringify({ email, password }),
	});

	const envelope = await readBackendBody<IamLoginEnvelope>(iamResponse);

	if (!iamResponse.ok) {
		return NextResponse.json(
			{ message: envelope?.msg || 'No se pudo iniciar sesión.' },
			{ status: iamResponse.status },
		);
	}

	const accessToken = envelope?.data?.access_token;
	if (!envelope?.ok || !accessToken) {
		return NextResponse.json(
			{ message: 'No se pudo iniciar sesión.' },
			{ status: UNREADABLE_BACKEND_BODY_STATUS },
		);
	}

	const cookieStore = await cookies();
	cookieStore.set(AUTH_COOKIE_NAME, accessToken, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV !== 'development',
		path: '/',
	});

	return NextResponse.json({ ok: true });
}
