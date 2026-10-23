import { describe, expect, it } from 'vitest';

import { CLIENT_KIND_CONFIG } from '../clients/models';
import { NAV_GROUPS, NAV_ITEMS } from '../nav-items';

describe('NAV_GROUPS', () => {
	it('lists the groups in order with their two entries each', () => {
		expect(
			NAV_GROUPS.map((group) => ({
				title: group.title,
				items: group.items.map((item) => [item.label, item.href]),
			})),
		).toEqual([
			{
				title: 'ARCA',
				items: [
					['Cargar clientes ARCA en memoria', '/cargar-clientes-arca'],
					['Procesar clientes ARCA', '/procesar-clientes-arca'],
				],
			},
			{
				title: 'ARCA - AGIP',
				items: [
					['Cargar clientes ARCA-AGIP en memoria', '/cargar-clientes-arca-agip'],
					['Procesar clientes ARCA-AGIP', '/procesar-clientes-arca-agip'],
				],
			},
			{
				title: 'ARCA - ARBA',
				items: [
					['Cargar clientes ARCA-ARBA en memoria', '/cargar-clientes-arca-arba'],
					['Procesar clientes ARCA-ARBA', '/procesar-clientes-arca-arba'],
				],
			},
		]);
	});

	it('derives the flat NAV_ITEMS list in group order', () => {
		expect(NAV_ITEMS.map((item) => item.href)).toEqual(
			NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href)),
		);
		expect(NAV_ITEMS[0].href).toBe('/cargar-clientes-arca');
	});

	it('has unique ids and routes', () => {
		expect(new Set(NAV_ITEMS.map((item) => item.id)).size).toBe(NAV_ITEMS.length);
		expect(new Set(NAV_ITEMS.map((item) => item.href)).size).toBe(NAV_ITEMS.length);
	});
});

describe('page titles', () => {
	it('stay descriptive and independent from the short sidebar labels', () => {
		expect(
			Object.values(CLIENT_KIND_CONFIG).map((config) => [config.loadTitle, config.processTitle]),
		).toEqual([
			['Cargar clientes ARCA en memoria', 'Procesar clientes ARCA'],
			['Cargar clientes ARCA-AGIP en memoria', 'Procesar clientes ARCA-AGIP'],
			['Cargar clientes ARCA-ARBA en memoria', 'Procesar clientes ARCA-ARBA'],
		]);
	});
});
