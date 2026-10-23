import type { ArcaAgipClient, ArcaArbaClient, ArcaClient, ClientKind, ClientOf } from './models';

export interface ProcessPayloadByKind {
	arca: { clientes: Pick<ArcaClient, 'cuit' | 'claveFiscal'>[] };
	'arca-agip': {
		clientes: Pick<ArcaAgipClient, 'cuit' | 'claveFiscal' | 'claveCiudad'>[];
	};
	'arca-arba': {
		clientes: Pick<ArcaArbaClient, 'cuit' | 'claveFiscal' | 'claveCit'>[];
	};
}

/**
 * Builds the exact request body the accounting API expects for `kind`.
 * Only the fields of its DTO are copied: `nombre` is never sent, and the
 * input order (the table order) is preserved.
 */
export function buildProcessPayload<K extends ClientKind>(
	kind: K,
	clients: readonly ClientOf<K>[],
): ProcessPayloadByKind[K];
export function buildProcessPayload(
	kind: ClientKind,
	clients: readonly ClientOf<ClientKind>[],
): ProcessPayloadByKind[ClientKind] {
	switch (kind) {
		case 'arca':
			return { clientes: clients.map(({ cuit, claveFiscal }) => ({ cuit, claveFiscal })) };
		case 'arca-agip':
			return {
				clientes: (clients as ArcaAgipClient[]).map(({ cuit, claveFiscal, claveCiudad }) => ({
					cuit,
					claveFiscal,
					claveCiudad,
				})),
			};
		case 'arca-arba':
			return {
				clientes: (clients as ArcaArbaClient[]).map(({ cuit, claveFiscal, claveCit }) => ({
					cuit,
					claveFiscal,
					claveCit,
				})),
			};
	}
}
