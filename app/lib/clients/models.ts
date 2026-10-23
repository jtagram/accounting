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
	processTitle: string;
	processHref: string;
	secretFields: readonly SecretField[];
}

const FISCAL_KEY: SecretField = { key: 'claveFiscal', label: 'Clave fiscal' };

const SECRET_FIELDS: Record<ClientKind, readonly SecretField[]> = {
	arca: [FISCAL_KEY],
	'arca-agip': [FISCAL_KEY, { key: 'claveCiudad', label: 'Clave ciudad' }],
	'arca-arba': [FISCAL_KEY, { key: 'claveCit', label: 'Clave CIT' }],
};

const NAV_IDS: Record<ClientKind, NavItemId> = {
	arca: 'process-arca-clients',
	'arca-agip': 'process-arca-agip-clients',
	'arca-arba': 'process-arca-arba-clients',
};

function navItem(id: NavItemId) {
	const item = NAV_ITEMS.find((candidate) => candidate.id === id);
	if (!item) {
		throw new Error('Missing navigation entry.');
	}
	return item;
}

// Page titles are descriptive and independent from the short sidebar labels.
const PAGE_TITLES: Record<ClientKind, string> = {
	arca: 'Procesar clientes ARCA',
	'arca-agip': 'Procesar clientes ARCA-AGIP',
	'arca-arba': 'Procesar clientes ARCA-ARBA',
};

function buildConfig(kind: ClientKind): ClientKindConfig {
	return {
		processTitle: PAGE_TITLES[kind],
		processHref: navItem(NAV_IDS[kind]).href,
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
