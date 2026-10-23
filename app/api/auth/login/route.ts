import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME } from '@/app/lib/auth-cookie';
import {
	type BackendErrorBody,
	extractErrorMessage,
	readBackendBody,
	UNREADABLE_BACKEND_BODY_STATUS,
} from '@/app/lib/backend-proxy';
import { requireEnv } from '@/app/lib/require-env';

interface LoginRequestBody {
	email?: string;
	password?: string;
}

interface IamLoginSuccess {
	access_token: string;
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

	const data = await readBackendBody<Partial<IamLoginSuccess> & BackendErrorBody>(iamResponse);

	if (!iamResponse.ok) {
		return NextResponse.json(
			{ message: extractErrorMessage(data, 'No se pudo iniciar sesión.') },
			{ status: iamResponse.status },
		);
	}

	if (!data?.access_token) {
		return NextResponse.json(
			{ message: 'No se pudo iniciar sesión.' },
			{ status: UNREADABLE_BACKEND_BODY_STATUS },
		);
	}

	const cookieStore = await cookies();
	cookieStore.set(AUTH_COOKIE_NAME, data.access_token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV !== 'development',
		path: '/',
	});

	return NextResponse.json({ ok: true });
}
