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

// Add future sidebar entries here; the Sidebar renders whatever is listed.
export const NAV_ITEMS: NavItem[] = [
	{
		id: 'load-arca-clients',
		label: 'Cargar clientes ARCA en memoria',
		href: '/cargar-clientes-arca',
	},
	{
		id: 'load-arca-agip-clients',
		label: 'Cargar clientes ARCA-AGIP en memoria',
		href: '/cargar-clientes-arca-agip',
	},
	{
		id: 'load-arca-arba-clients',
		label: 'Cargar clientes ARCA-ARBA en memoria',
		href: '/cargar-clientes-arca-arba',
	},
	{
		id: 'process-arca-clients',
		label: 'Procesar clientes ARCA',
		href: '/procesar-clientes-arca',
	},
	{
		id: 'process-arca-agip-clients',
		label: 'Procesar clientes ARCA-AGIP',
		href: '/procesar-clientes-arca-agip',
	},
	{
		id: 'process-arca-arba-clients',
		label: 'Procesar clientes ARCA-ARBA',
		href: '/procesar-clientes-arca-arba',
	},
];
