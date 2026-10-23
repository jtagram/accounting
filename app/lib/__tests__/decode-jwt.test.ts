import { describe, expect, it } from 'vitest';

import { fakeJwt } from '@/test/mocks/accounting';

import { decodeJwtPayload } from '../decode-jwt';

describe('decodeJwtPayload', () => {
	it('returns the payload claims of a JWT', () => {
		const token = fakeJwt({ email: 'a@b.com', sub: 42 });

		expect(decodeJwtPayload<{ email: string; sub: number }>(token)).toEqual({
			email: 'a@b.com',
			sub: 42,
		});
	});

	it('decodes non-ASCII claims as UTF-8', () => {
		const token = fakeJwt({ name: 'Ñandú' });

		expect(decodeJwtPayload<{ name: string }>(token)).toEqual({ name: 'Ñandú' });
	});

	it.each([
		['an empty string', ''],
		['a token without a payload segment', 'header-only'],
		['a payload that is not base64 JSON', 'a.%%%.c'],
		['a payload that is not JSON', `a.${Buffer.from('plain').toString('base64url')}.c`],
	])('returns null for %s', (_label, token) => {
		expect(decodeJwtPayload(token)).toBeNull();
	});
});
