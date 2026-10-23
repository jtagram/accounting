/** Reads a claim out of a JWT payload without verifying the signature.
 * Safe for display purposes only: authorization is already enforced by
 * whichever backend verifies the token when it's sent as a Bearer header. */
export function decodeJwtPayload<T>(token: string): T | null {
	try {
		const payloadSegment = token.split('.')[1];
		const json = Buffer.from(payloadSegment, 'base64url').toString('utf8');
		return JSON.parse(json) as T;
	} catch {
		return null;
	}
}
