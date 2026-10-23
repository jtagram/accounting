import { afterEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIE_NAME } from '@/app/lib/auth-cookie';

import { POST } from '../route';

const cookieDelete = vi.fn();

vi.mock('next/headers', () => ({
	cookies: () => Promise.resolve({ delete: cookieDelete }),
}));

afterEach(() => {
	vi.clearAllMocks();
});

describe('POST /api/auth/logout', () => {
	it('deletes the auth cookie and returns ok', async () => {
		const res = await POST();

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(cookieDelete).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
	});
});
