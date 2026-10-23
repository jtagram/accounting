export type NavItemId =
	| 'load-arca-clients'
	| 'load-arca-agip-clients'
	| 'load-arca-arba-clients'
	| 'process-arca-clients'
	| 'process-arca-agip-clients'
	| 'process-arca-arba-clients';

export interface NavItem {
	id: NavItemId;
	label: string;
	href: string;
}

export interface NavGroup {
	title: string;
	items: NavItem[];
}

// Groups only classify the entries; each entry keeps its full descriptive label.
// Page titles live in app/lib/clients/models.ts.
// Add future sidebar entries to a group here; the Sidebar renders whatever is listed.
export const NAV_GROUPS: NavGroup[] = [
	{
		title: 'ARCA',
		items: [
			{ id: 'load-arca-clients', label: 'Cargar clientes ARCA en memoria', href: '/cargar-clientes-arca' },
			{ id: 'process-arca-clients', label: 'Procesar clientes ARCA', href: '/procesar-clientes-arca' },
		],
	},
	{
		title: 'ARCA - AGIP',
		items: [
			{
				id: 'load-arca-agip-clients',
				label: 'Cargar clientes ARCA-AGIP en memoria',
				href: '/cargar-clientes-arca-agip',
			},
			{
				id: 'process-arca-agip-clients',
				label: 'Procesar clientes ARCA-AGIP',
				href: '/procesar-clientes-arca-agip',
			},
		],
	},
	{
		title: 'ARCA - ARBA',
		items: [
			{
				id: 'load-arca-arba-clients',
				label: 'Cargar clientes ARCA-ARBA en memoria',
				href: '/cargar-clientes-arca-arba',
			},
			{
				id: 'process-arca-arba-clients',
				label: 'Procesar clientes ARCA-ARBA',
				href: '/procesar-clientes-arca-arba',
			},
		],
	},
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
