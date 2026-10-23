import { describe, expect, it } from 'vitest';

import { CLIENT_KIND_CONFIG } from '../clients/models';
import { NAV_GROUPS, NAV_ITEMS } from '../nav-items';

describe('NAV_GROUPS', () => {
	it('lists the three groups in order with one entry each', () => {
		expect(
			NAV_GROUPS.map((group) => ({
				title: group.title,
				items: group.items.map((item) => [item.label, item.href]),
			})),
		).toEqual([
			{ title: 'ARCA', items: [['Procesar clientes ARCA', '/procesar-clientes-arca']] },
			{
				title: 'ARCA - AGIP',
				items: [['Procesar clientes ARCA-AGIP', '/procesar-clientes-arca-agip']],
			},
			{
				title: 'ARCA - ARBA',
				items: [['Procesar clientes ARCA-ARBA', '/procesar-clientes-arca-arba']],
			},
		]);
	});

	it('derives the flat NAV_ITEMS list in group order', () => {
		expect(NAV_ITEMS.map((item) => item.href)).toEqual(
			NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href)),
		);
		expect(NAV_ITEMS[0].href).toBe('/procesar-clientes-arca');
	});

	it('has unique ids and routes', () => {
		expect(new Set(NAV_ITEMS.map((item) => item.id)).size).toBe(NAV_ITEMS.length);
		expect(new Set(NAV_ITEMS.map((item) => item.href)).size).toBe(NAV_ITEMS.length);
	});
});

describe('page titles', () => {
	it('stay descriptive and independent from the short sidebar labels', () => {
		expect(Object.values(CLIENT_KIND_CONFIG).map((config) => config.processTitle)).toEqual([
			'Procesar clientes ARCA',
			'Procesar clientes ARCA-AGIP',
			'Procesar clientes ARCA-ARBA',
		]);
	});
});
