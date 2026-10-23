import { NAV_ITEMS, type NavItemId } from '@/app/lib/nav-items';

export type ClientKind = 'arca' | 'arca-agip' | 'arca-arba';

export interface ArcaClient {
	nombre: string;
	cuit: string;
	claveFiscal: string;
}

export interface ArcaAgipClient extends ArcaClient {
	claveCiudad: string;
}

export interface ArcaArbaClient extends ArcaClient {
	claveCit: string;
}

export interface ClientsByKind {
	arca: ArcaClient;
	'arca-agip': ArcaAgipClient;
	'arca-arba': ArcaArbaClient;
}

export type ClientOf<K extends ClientKind> = ClientsByKind[K];

export type ClientLists = { [K in ClientKind]: ClientOf<K>[] };

export interface SecretField {
	/** JSON property name, also used as the field name in validation errors. */
	key: string;
	/** Column header shown in the UI. */
	label: string;
}

export interface ClientKindConfig {
	loadTitle: string;
	processTitle: string;
	loadHref: string;
	processHref: string;
	secretFields: readonly SecretField[];
}

const FISCAL_KEY: SecretField = { key: 'claveFiscal', label: 'Clave fiscal' };

const SECRET_FIELDS: Record<ClientKind, readonly SecretField[]> = {
	arca: [FISCAL_KEY],
	'arca-agip': [FISCAL_KEY, { key: 'claveCiudad', label: 'Clave ciudad' }],
	'arca-arba': [FISCAL_KEY, { key: 'claveCit', label: 'Clave CIT' }],
};

const NAV_IDS: Record<ClientKind, { load: NavItemId; process: NavItemId }> = {
	arca: { load: 'load-arca-clients', process: 'process-arca-clients' },
	'arca-agip': { load: 'load-arca-agip-clients', process: 'process-arca-agip-clients' },
	'arca-arba': { load: 'load-arca-arba-clients', process: 'process-arca-arba-clients' },
};

function navItem(id: NavItemId) {
	const item = NAV_ITEMS.find((candidate) => candidate.id === id);
	if (!item) {
		throw new Error('Missing navigation entry.');
	}
	return item;
}

// Page titles are descriptive and independent from the short sidebar labels.
const PAGE_TITLES: Record<ClientKind, { load: string; process: string }> = {
	arca: { load: 'Cargar clientes ARCA en memoria', process: 'Procesar clientes ARCA' },
	'arca-agip': {
		load: 'Cargar clientes ARCA-AGIP en memoria',
		process: 'Procesar clientes ARCA-AGIP',
	},
	'arca-arba': {
		load: 'Cargar clientes ARCA-ARBA en memoria',
		process: 'Procesar clientes ARCA-ARBA',
	},
};

function buildConfig(kind: ClientKind): ClientKindConfig {
	const load = navItem(NAV_IDS[kind].load);
	const process = navItem(NAV_IDS[kind].process);
	return {
		loadTitle: PAGE_TITLES[kind].load,
		processTitle: PAGE_TITLES[kind].process,
		loadHref: load.href,
		processHref: process.href,
		secretFields: SECRET_FIELDS[kind],
	};
}

export const CLIENT_KIND_CONFIG: Record<ClientKind, ClientKindConfig> = {
	arca: buildConfig('arca'),
	'arca-agip': buildConfig('arca-agip'),
	'arca-arba': buildConfig('arca-arba'),
};

export const EMPTY_CLIENT_LISTS: ClientLists = {
	arca: [],
	'arca-agip': [],
	'arca-arba': [],
};
