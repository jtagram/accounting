import { describe, expect, it } from 'vitest';

import { describeJsonSyntaxError, parseClientsJson, validateClients } from '../validators';

const SECRET = 'super-secret-value';

const arcaClient = { nombre: 'juan perez', cuit: '20123456789', claveFiscal: SECRET };
const agipClient = { ...arcaClient, claveCiudad: SECRET };
const arbaClient = { ...arcaClient, claveCit: SECRET };

describe('validateClients', () => {
	it('accepts a valid list for each kind', () => {
		expect(validateClients('arca', { clientes: [arcaClient] })).toEqual({
			ok: true,
			clients: [arcaClient],
		});
		expect(validateClients('arca-agip', { clientes: [agipClient] })).toEqual({
			ok: true,
			clients: [agipClient],
		});
		expect(validateClients('arca-arba', { clientes: [arbaClient] })).toEqual({
			ok: true,
			clients: [arbaClient],
		});
	});

	it.each([
		['non-object root', []],
		['null root', null],
		['missing clientes', {}],
		['clientes not an array', { clientes: 'x' }],
		['extra root field', { clientes: [arcaClient], extra: 1 }],
		['empty clientes', { clientes: [] }],
	])('rejects %s', (_label, input) => {
		expect(validateClients('arca', input).ok).toBe(false);
	});

	it('reports index and field name without echoing values', () => {
		const result = validateClients('arca', {
			clientes: [arcaClient, { ...arcaClient, cuit: `${SECRET}-123` }],
		});
		expect(result).toEqual({ ok: false, errors: ['Cliente 2: el campo cuit es inválido.'] });
	});

	it('reports missing, empty and non-string fields', () => {
		const result = validateClients('arca-agip', {
			clientes: [{ nombre: '', cuit: '20123456789', claveFiscal: 5 }],
		});
		expect(result).toEqual({
			ok: false,
			errors: [
				'Cliente 1: el campo nombre es inválido.',
				'Cliente 1: el campo claveFiscal es inválido.',
				'Cliente 1: falta el campo claveCiudad.',
			],
		});
	});

	it('rejects unknown fields without naming them', () => {
		const result = validateClients('arca', { clientes: [{ ...arcaClient, [SECRET]: 'x' }] });
		expect(result).toEqual({ ok: false, errors: ['Cliente 1: contiene campos no permitidos.'] });
	});

	it('rejects fields belonging to another kind', () => {
		expect(validateClients('arca', { clientes: [agipClient] }).ok).toBe(false);
		expect(validateClients('arca-agip', { clientes: [arbaClient] }).ok).toBe(false);
	});

	it('rejects non-object items', () => {
		expect(validateClients('arca', { clientes: [SECRET] })).toEqual({
			ok: false,
			errors: ['Cliente 1: el elemento no es un objeto.'],
		});
	});
});

describe('parseClientsJson', () => {
	it('parses valid JSON text', () => {
		expect(parseClientsJson('arca', JSON.stringify({ clientes: [arcaClient] })).ok).toBe(true);
	});

	it('rejects empty and whitespace-only input with its own message', () => {
		const expected = {
			ok: false,
			errors: ['El archivo está vacío: cargue el JSON de clientes.'],
		};
		expect(parseClientsJson('arca', '')).toEqual(expected);
		expect(parseClientsJson('arca', ' \n\t ')).toEqual(expected);
	});

	const END =
		'el texto termina antes de cerrar el JSON (falta cerrar una llave, un corchete o unas comillas)';
	const CLOSE = 'cierre inesperado, revisá si sobra una coma antes o falta un valor';
	const QUOTE = 'comillas inesperadas, probablemente falta una coma entre elementos';

	it.each([
		['missing comma', `{"clientes": [{"nombre": "${SECRET}"\n "cuit": "1"}]}`, 2, 2, QUOTE],
		['trailing comma in object', `{"clientes": [{"nombre": "${SECRET}",}]}`, 1, 47, CLOSE],
		['trailing comma in array', `{"clientes": [\n  "${SECRET}",\n]}`, 3, 1, CLOSE],
		['unclosed brace', `{"clientes": [{"nombre": "${SECRET}"}]`, 1, 48, END],
		['unclosed array', `{"clientes": ["${SECRET}"`, 1, 35, END],
		['unclosed string', `{"clientes": "${SECRET}`, 1, 33, END],
		['unexpected end', `{"clientes": [{"nombre": "${SECRET}", `, 1, 48, END],
		['extra text after the JSON', `{"clientes": []}\n${SECRET}`, 2, 1, 'carácter inesperado'],
		['missing colon', `{"clientes" [ "${SECRET}" ]}`, 1, 13, 'carácter inesperado'],
		['unexpected colon', `{"clientes": [ "${SECRET}" : 1 ]}`, 1, 37, 'dos puntos inesperados'],
		['unexpected comma', `{"clientes": [ , "${SECRET}" ]}`, 1, 16, 'coma inesperada'],
		['bare word', `${SECRET}`, 1, 1, 'carácter inesperado'],
	])('describes syntax error: %s', (_label, text, line, column, cause) => {
		const result = parseClientsJson('arca', text);
		expect(result).toEqual({
			ok: false,
			errors: [`JSON inválido en la línea ${line}, columna ${column}: ${cause}.`],
		});
		if (!result.ok) {
			expect(result.errors.join(' ')).not.toContain(SECRET);
		}
	});

	it('falls back to a generic message when the position cannot be found', () => {
		expect(describeJsonSyntaxError('{"a": 1}', new Error(`Unexpected ${SECRET}`))).toBe(
			'El texto no es un JSON válido.',
		);
	});

	it('uses the structural scanner when the engine message has no position', () => {
		const message = describeJsonSyntaxError(`{"a": }`, new Error(`bad token ${SECRET}`));
		expect(message).toBe(`JSON inválido en la línea 1, columna 7: ${CLOSE}.`);
	});
});

describe('duplicate cuits', () => {
	const withCuit = (cuit: string, nombre = 'x') => ({ ...arcaClient, nombre, cuit });
	const A = '20111111111';
	const B = '20222222222';
	const C = '20333333333';

	it('reports two clients sharing a cuit without printing it', () => {
		const result = validateClients('arca', { clientes: [withCuit(A), withCuit(B), withCuit(A)] });
		expect(result).toEqual({ ok: false, errors: ['Clientes 1 y 3: el cuit está repetido.'] });
	});

	it('groups three or more clients', () => {
		const result = validateClients('arca', {
			clientes: [withCuit(B), withCuit(A), withCuit(C), withCuit(A), withCuit(C), withCuit(A)],
		});
		expect(result).toEqual({
			ok: false,
			errors: [
				'Clientes 2, 4 y 6: el cuit está repetido.',
				'Clientes 3 y 5: el cuit está repetido.',
			],
		});
	});

	it('reports multiple duplicate groups after item errors', () => {
		const result = validateClients('arca', {
			clientes: [withCuit(A), withCuit(B), withCuit(A), withCuit(B), withCuit('bad')],
		});
		expect(result).toEqual({
			ok: false,
			errors: [
				'Cliente 5: el campo cuit es inválido.',
				'Clientes 1 y 3: el cuit está repetido.',
				'Clientes 2 y 4: el cuit está repetido.',
			],
		});
	});

	it('ignores invalid cuits (reported separately) when looking for duplicates', () => {
		const result = validateClients('arca', { clientes: [withCuit('bad'), withCuit('bad')] });
		expect(result).toEqual({
			ok: false,
			errors: ['Cliente 1: el campo cuit es inválido.', 'Cliente 2: el campo cuit es inválido.'],
		});
	});

	it('allows the same cuit in different lists', () => {
		expect(validateClients('arca', { clientes: [withCuit(A)] }).ok).toBe(true);
		expect(validateClients('arca-agip', { clientes: [{ ...agipClient, cuit: A }] }).ok).toBe(true);
	});
});
