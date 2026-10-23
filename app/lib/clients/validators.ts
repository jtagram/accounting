import { CLIENT_KIND_CONFIG, type ClientKind, type ClientOf } from './models';

export type ValidationResult<K extends ClientKind> =
	{ ok: true; clients: ClientOf<K>[] } | { ok: false; errors: string[] };

const CUIT_PATTERN = /^\d{11}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

// Error messages only ever mention positions and field names, never values.
function validateItem(item: unknown, position: number, requiredKeys: readonly string[]): string[] {
	const prefix = `Cliente ${position}`;
	if (!isRecord(item)) {
		return [`${prefix}: el elemento no es un objeto.`];
	}

	const errors: string[] = [];
	const allowed = new Set(requiredKeys);

	for (const key of requiredKeys) {
		if (!(key in item)) {
			errors.push(`${prefix}: falta el campo ${key}.`);
		} else if (
			key === 'cuit'
				? !(typeof item[key] === 'string' && CUIT_PATTERN.test(item[key]))
				: !isNonEmptyString(item[key])
		) {
			errors.push(`${prefix}: el campo ${key} es inválido.`);
		}
	}

	if (Object.keys(item).some((key) => !allowed.has(key))) {
		errors.push(`${prefix}: contiene campos no permitidos.`);
	}

	return errors;
}

export function validateClients<K extends ClientKind>(
	kind: K,
	input: unknown,
): ValidationResult<K> {
	if (!isRecord(input)) {
		return { ok: false, errors: ['El JSON debe ser un objeto con la propiedad "clientes".'] };
	}
	if (Object.keys(input).some((key) => key !== 'clientes')) {
		return { ok: false, errors: ['El JSON contiene campos no permitidos en la raíz.'] };
	}
	if (!Array.isArray(input.clientes)) {
		return { ok: false, errors: ['La propiedad "clientes" debe ser un arreglo.'] };
	}
	if (input.clientes.length === 0) {
		return { ok: false, errors: ['La lista de clientes está vacía.'] };
	}

	const requiredKeys = [
		'nombre',
		'cuit',
		...CLIENT_KIND_CONFIG[kind].secretFields.map((field) => field.key),
	];
	const items: unknown[] = input.clientes;
	const errors = items.flatMap((item, index) => validateItem(item, index + 1, requiredKeys));
	if (errors.length > 0) {
		return { ok: false, errors };
	}

	// Rebuild each client with only the known fields so nothing else is retained.
	const clients = items.map((item) => {
		const record = item as Record<string, string>;
		return Object.fromEntries(requiredKeys.map((key) => [key, record[key]]));
	}) as unknown as ClientOf<K>[];
	return { ok: true, clients };
}

export function parseClientsJson<K extends ClientKind>(kind: K, text: string): ValidationResult<K> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return { ok: false, errors: ['El contenido no es un JSON válido.'] };
	}
	return validateClients(kind, parsed);
}
