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
	const errors = [
		...items.flatMap((item, index) => validateItem(item, index + 1, requiredKeys)),
		...findDuplicateCuitErrors(items),
	];
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

function formatPositions(positions: number[]): string {
	if (positions.length <= 2) {
		return positions.join(' y ');
	}
	return `${positions.slice(0, -1).join(', ')} y ${positions[positions.length - 1]}`;
}

// Only items with a valid 11-digit cuit take part; invalid items already have their own error.
// Lists are independent, so this only ever looks at one list. Messages never include the cuit.
function findDuplicateCuitErrors(items: unknown[]): string[] {
	const positionsByCuit = new Map<string, number[]>();
	items.forEach((item, index) => {
		if (!isRecord(item)) {
			return;
		}
		const cuit = item.cuit;
		if (typeof cuit !== 'string' || !CUIT_PATTERN.test(cuit)) {
			return;
		}
		positionsByCuit.set(cuit, [...(positionsByCuit.get(cuit) ?? []), index + 1]);
	});
	return [...positionsByCuit.values()]
		.filter((positions) => positions.length > 1)
		.map((positions) => `Clientes ${formatPositions(positions)}: el cuit está repetido.`);
}

const GENERIC_JSON_ERROR = 'El texto no es un JSON válido.';
const EMPTY_JSON_ERROR = 'El texto está vacío: pegue o cargue el JSON de clientes.';

class JsonSyntaxError extends Error {
	constructor(readonly position: number) {
		super('JSON syntax error');
	}
}

const JSON_WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const NUMBER_PATTERN = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const SIMPLE_ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);

// Minimal strict JSON scanner used only to locate the first syntax error. Some Node versions
// report no position in JSON.parse messages, and we never read message text beyond a number.
function findSyntaxErrorPosition(text: string): number | null {
	const length = text.length;
	let pos = 0;

	const fail = (at: number): never => {
		throw new JsonSyntaxError(at);
	};
	const skipWhitespace = () => {
		while (pos < length && JSON_WHITESPACE.has(text[pos])) {
			pos++;
		}
	};
	const expect = (char: string) => {
		skipWhitespace();
		if (text[pos] !== char) {
			fail(pos);
		}
		pos++;
	};
	const parseString = () => {
		expect('"');
		while (pos < length) {
			const char = text[pos];
			if (char === '"') {
				pos++;
				return;
			}
			if (char < ' ') {
				fail(pos);
			}
			if (char === '\\') {
				const escape = text[pos + 1];
				if (escape === 'u') {
					if (!/^[0-9a-fA-F]{4}$/.test(text.slice(pos + 2, pos + 6))) {
						fail(Math.min(pos + 2, length));
					}
					pos += 6;
					continue;
				}
				if (escape === undefined || !SIMPLE_ESCAPES.has(escape)) {
					fail(Math.min(pos + 1, length));
				}
				pos += 2;
				continue;
			}
			pos++;
		}
		fail(length);
	};
	const parseSequence = (close: string, parseEntry: () => void) => {
		pos++;
		skipWhitespace();
		if (text[pos] === close) {
			pos++;
			return;
		}
		for (;;) {
			parseEntry();
			skipWhitespace();
			if (text[pos] === ',') {
				pos++;
				continue;
			}
			if (text[pos] === close) {
				pos++;
				return;
			}
			fail(pos);
		}
	};
	const parseValue = () => {
		skipWhitespace();
		const char = text[pos];
		if (char === '{') {
			parseSequence('}', () => {
				skipWhitespace();
				parseString();
				expect(':');
				parseValue();
			});
		} else if (char === '[') {
			parseSequence(']', parseValue);
		} else if (char === '"') {
			parseString();
		} else if (char === '-' || (char >= '0' && char <= '9')) {
			NUMBER_PATTERN.lastIndex = pos;
			const match = NUMBER_PATTERN.exec(text);
			if (!match) {
				fail(Math.min(pos + 1, length));
			}
			pos += match![0].length;
		} else {
			const literal = ['true', 'false', 'null'].find((word) => text.startsWith(word, pos));
			if (!literal) {
				fail(pos);
			}
			pos += literal!.length;
		}
	};

	try {
		parseValue();
		skipWhitespace();
		return pos < length ? pos : null;
	} catch (error) {
		return error instanceof JsonSyntaxError ? error.position : null;
	}
}

// V8 messages look like "... in JSON at position 7 (line 1 column 8)"; only the number is used.
function positionFromErrorMessage(error: unknown): number | null {
	if (!(error instanceof Error)) {
		return null;
	}
	const match = /\bposition (\d+)/.exec(error.message);
	return match ? Number(match[1]) : null;
}

function causeAt(text: string, position: number): string {
	if (position >= text.length) {
		return 'el texto termina antes de cerrar el JSON (falta cerrar una llave, un corchete o unas comillas)';
	}
	switch (text[position]) {
		case '}':
		case ']':
			return 'cierre inesperado, revisá si sobra una coma antes o falta un valor';
		case ',':
			return 'coma inesperada';
		case ':':
			return 'dos puntos inesperados';
		case '"':
			return 'comillas inesperadas, probablemente falta una coma entre elementos';
		default:
			return 'carácter inesperado';
	}
}

// Never surfaces JSON.parse's message: it can quote part of the (sensitive) input.
// The text is only used to compute line/column and to classify one structural character.
export function describeJsonSyntaxError(text: string, error: unknown): string {
	const position = positionFromErrorMessage(error) ?? findSyntaxErrorPosition(text);
	if (position === null || position < 0) {
		return GENERIC_JSON_ERROR;
	}
	const clamped = Math.min(position, text.length);
	const before = text.slice(0, clamped);
	const line = before.split('\n').length;
	const column = clamped - (before.lastIndexOf('\n') + 1) + 1;
	return `JSON inválido en la línea ${line}, columna ${column}: ${causeAt(text, clamped)}.`;
}

export function parseClientsJson<K extends ClientKind>(kind: K, text: string): ValidationResult<K> {
	if (text.trim().length === 0) {
		return { ok: false, errors: [EMPTY_JSON_ERROR] };
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		return { ok: false, errors: [describeJsonSyntaxError(text, error)] };
	}
	return validateClients(kind, parsed);
}
