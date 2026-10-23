'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'react-bootstrap';

import { useClearAllClients } from '@/app/lib/clients/clients-provider';

export function LogoutButton() {
	const router = useRouter();
	const clearAllClients = useClearAllClients();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	async function handleLogout() {
		setIsLoggingOut(true);
		// Wipe sensitive client lists explicitly before leaving the session.
		clearAllClients();
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch {
			// Network failure still leaves the session screen.
		} finally {
			router.push('/login');
			router.refresh();
		}
	}

	return (
		<Button
			type='button'
			variant='outline-secondary'
			onClick={handleLogout}
			disabled={isLoggingOut}
		>
			Cerrar sesión
		</Button>
	);
}
