import { describe, expect, it } from 'vitest';

import { buildProcessPayload } from '../build-process-payload';

const base = (n: number) => ({ nombre: `n${n}`, cuit: `2000000000${n}`, claveFiscal: `f${n}` });

describe('buildProcessPayload', () => {
	it('arca: only cuit and claveFiscal, in order', () => {
		const payload = buildProcessPayload('arca', [base(1), base(2)]);
		expect(payload).toEqual({
			clientes: [
				{ cuit: '20000000001', claveFiscal: 'f1' },
				{ cuit: '20000000002', claveFiscal: 'f2' },
			],
		});
		expect(JSON.stringify(payload)).not.toContain('nombre');
	});

	it('arca-agip adds claveCiudad and drops nombre', () => {
		const payload = buildProcessPayload('arca-agip', [{ ...base(1), claveCiudad: 'c1' }]);
		expect(payload).toEqual({
			clientes: [{ cuit: '20000000001', claveFiscal: 'f1', claveCiudad: 'c1' }],
		});
		expect(Object.keys(payload.clientes[0])).toEqual(['cuit', 'claveFiscal', 'claveCiudad']);
	});

	it('arca-arba adds claveCit and drops nombre', () => {
		const payload = buildProcessPayload('arca-arba', [{ ...base(2), claveCit: 't2' }]);
		expect(payload).toEqual({
			clientes: [{ cuit: '20000000002', claveFiscal: 'f2', claveCit: 't2' }],
		});
	});

	it('returns an empty list for no clients', () => {
		expect(buildProcessPayload('arca', [])).toEqual({ clientes: [] });
	});
});
