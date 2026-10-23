'use client';

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

import { type ClientKind, type ClientLists, type ClientOf, EMPTY_CLIENT_LISTS } from './models';

/** A loaded list is erased this long after it was loaded. */
export const CLIENTS_TTL_MS = 2 * 60 * 60 * 1000;

const CLIENT_KINDS = Object.keys(EMPTY_CLIENT_LISTS) as ClientKind[];

type ExpiryMap = Record<ClientKind, number | null>;

const NO_EXPIRY: ExpiryMap = { arca: null, 'arca-agip': null, 'arca-arba': null };

interface ClientsStore {
	lists: ClientLists;
	expiresAt: ExpiryMap;
	replaceList: <K extends ClientKind>(kind: K, clients: ClientOf<K>[]) => void;
	clearList: (kind: ClientKind) => void;
	clearAll: () => void;
}

const ClientsContext = createContext<ClientsStore | null>(null);

/**
 * Holds the loaded clients in React state only. Nothing is persisted, logged
 * or sent anywhere: a page reload intentionally drops the data.
 *
 * Each list is wiped automatically CLIENTS_TTL_MS after it was loaded (per
 * kind; reloading restarts that kind's clock, clearing cancels it). Because
 * timers can be throttled or suspended (sleep, background tab), an expiresAt is
 * stored per kind and expired lists are also purged when the tab becomes
 * visible again or the window regains focus. All timers and listeners are
 * released on unmount, and `clearAll` lets logout wipe every list explicitly.
 */
export function ClientsProvider({ children }: { children: ReactNode }) {
	const [lists, setLists] = useState<ClientLists>(EMPTY_CLIENT_LISTS);
	const [expiresAt, setExpiresAt] = useState<ExpiryMap>(NO_EXPIRY);
	const expiresAtRef = useRef<ExpiryMap>({ ...NO_EXPIRY });
	const timersRef = useRef<Partial<Record<ClientKind, ReturnType<typeof setTimeout>>>>({});

	const clearList = useCallback((kind: ClientKind) => {
		clearTimeout(timersRef.current[kind]);
		delete timersRef.current[kind];
		expiresAtRef.current[kind] = null;
		setLists((current) => ({ ...current, [kind]: [] }));
		setExpiresAt((current) => ({ ...current, [kind]: null }));
	}, []);

	const replaceList = useCallback(
		<K extends ClientKind>(kind: K, clients: ClientOf<K>[]) => {
			clearTimeout(timersRef.current[kind]);
			const deadline = Date.now() + CLIENTS_TTL_MS;
			expiresAtRef.current[kind] = deadline;
			// The closure only captures the kind, never client data.
			timersRef.current[kind] = setTimeout(() => clearList(kind), CLIENTS_TTL_MS);
			setLists((current) => ({ ...current, [kind]: clients }));
			setExpiresAt((current) => ({ ...current, [kind]: deadline }));
		},
		[clearList],
	);

	const clearAll = useCallback(() => {
		CLIENT_KINDS.forEach(clearList);
	}, [clearList]);

	useEffect(() => {
		const timers = timersRef.current;
		function purgeExpired() {
			const now = Date.now();
			for (const kind of CLIENT_KINDS) {
				const deadline = expiresAtRef.current[kind];
				if (deadline !== null && deadline <= now) clearList(kind);
			}
		}
		document.addEventListener('visibilitychange', purgeExpired);
		window.addEventListener('focus', purgeExpired);
		return () => {
			document.removeEventListener('visibilitychange', purgeExpired);
			window.removeEventListener('focus', purgeExpired);
			for (const kind of CLIENT_KINDS) {
				clearTimeout(timers[kind]);
				delete timers[kind];
			}
		};
	}, [clearList]);

	const value = useMemo(
		() => ({ lists, expiresAt, replaceList, clearList, clearAll }),
		[lists, expiresAt, replaceList, clearList, clearAll],
	);

	return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients<K extends ClientKind>(kind: K) {
	const store = useContext(ClientsContext);
	if (!store) {
		throw new Error('useClients must be used within a ClientsProvider.');
	}
	const { lists, expiresAt, replaceList, clearList } = store;

	return {
		clients: lists[kind] as ClientOf<K>[],
		expiresAt: expiresAt[kind],
		replace: (clients: ClientOf<K>[]) => replaceList(kind, clients),
		clear: () => clearList(kind),
	};
}

/**
 * Returns a function that wipes every list. Outside a provider there is
 * nothing to wipe, so it is a safe no-op (lets LogoutButton render anywhere).
 */
export function useClearAllClients(): () => void {
	const store = useContext(ClientsContext);
	return store?.clearAll ?? noop;
}

function noop() {}
