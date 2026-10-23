import { describe, expect, it } from 'vitest';

import { NAV_ITEMS } from '../nav-items';

describe('NAV_ITEMS', () => {
	it('lists the menu entries in order with their Spanish labels', () => {
		expect(NAV_ITEMS.map((item) => item.label)).toEqual([
			'Cargar clientes ARCA en memoria',
			'Cargar clientes ARCA-AGIP en memoria',
			'Cargar clientes ARCA-ARBA en memoria',
			'Procesar clientes ARCA',
			'Procesar clientes ARCA-AGIP',
			'Procesar clientes ARCA-ARBA',
		]);
	});

	it('has unique ids and routes', () => {
		expect(new Set(NAV_ITEMS.map((item) => item.id)).size).toBe(NAV_ITEMS.length);
		expect(new Set(NAV_ITEMS.map((item) => item.href)).size).toBe(NAV_ITEMS.length);
	});
});
