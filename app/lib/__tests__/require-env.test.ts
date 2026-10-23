import { describe, expect, it } from 'vitest';

import { requireEnv } from '../require-env';

describe('requireEnv', () => {
	it('returns the value when it is set', () => {
		expect(requireEnv('IAM_API_URL', 'http://iam.test')).toBe('http://iam.test');
	});

	it.each([undefined, ''])('throws naming the variable when value is %j', (value) => {
		expect(() => requireEnv('IAM_API_URL', value)).toThrow(
			'IAM_API_URL environment variable is required',
		);
	});
});
