/** Fails fast instead of silently falling back to a guessed default —
 * a missing required env var should break startup, not run against the
 * wrong URL or application name. */
export function requireEnv(name: string, value: string | undefined): string {
	if (!value) {
		throw new Error(`${name} environment variable is required`);
	}
	return value;
}
