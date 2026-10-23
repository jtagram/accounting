import { type NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME } from '@/app/lib/auth-cookie';

// Guards the protected app shell (`/` and every route under the (protected)
// group). Extend the matcher below if more protected routes are added.
export function proxy(request: NextRequest) {
	const token = request.cookies.get(AUTH_COOKIE_NAME);

	if (!token) {
		return NextResponse.redirect(new URL('/login', request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		'/',
		'/procesar-clientes-arca',
		'/procesar-clientes-arca-agip',
		'/procesar-clientes-arca-arba',
	],
};
