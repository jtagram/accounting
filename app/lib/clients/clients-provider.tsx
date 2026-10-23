'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { type ClientKind, type ClientLists, type ClientOf, EMPTY_CLIENT_LISTS } from './models';

interface ClientsStore {
	lists: ClientLists;
	replaceList: <K extends ClientKind>(kind: K, clients: ClientOf<K>[]) => void;
	clearList: (kind: ClientKind) => void;
}

const ClientsContext = createContext<ClientsStore | null>(null);

/**
 * Holds the loaded clients in React state only. Nothing is persisted, logged
 * or sent anywhere: a page reload intentionally drops the data.
 */
export function ClientsProvider({ children }: { children: ReactNode }) {
	const [lists, setLists] = useState<ClientLists>(EMPTY_CLIENT_LISTS);

	const replaceList = useCallback(<K extends ClientKind>(kind: K, clients: ClientOf<K>[]) => {
		setLists((current) => ({ ...current, [kind]: clients }));
	}, []);

	const clearList = useCallback((kind: ClientKind) => {
		setLists((current) => ({ ...current, [kind]: [] }));
	}, []);

	const value = useMemo(() => ({ lists, replaceList, clearList }), [lists, replaceList, clearList]);

	return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients<K extends ClientKind>(kind: K) {
	const store = useContext(ClientsContext);
	if (!store) {
		throw new Error('useClients must be used within a ClientsProvider.');
	}
	const { lists, replaceList, clearList } = store;

	return {
		clients: lists[kind] as ClientOf<K>[],
		replace: (clients: ClientOf<K>[]) => replaceList(kind, clients),
		clear: () => clearList(kind),
	};
}
