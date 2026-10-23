import { describe, expect, it } from 'vitest';

import { parseClientsJson, validateClients } from '../validators';

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

	it('returns a generic message for invalid JSON without echoing content', () => {
		const result = parseClientsJson('arca', `{ ${SECRET}`);
		expect(result).toEqual({ ok: false, errors: ['El contenido no es un JSON válido.'] });
	});
});
