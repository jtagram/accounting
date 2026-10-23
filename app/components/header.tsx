'use client';

import { Container, Navbar } from 'react-bootstrap';

import { LogoutButton } from '@/app/components/logout-button';

export function Header() {
	return (
		<Navbar
			bg='white'
			sticky='top'
			className='border-bottom shadow-sm'
		>
			<Container fluid>
				<Navbar.Brand className='fw-semibold'>Accounting</Navbar.Brand>
				<LogoutButton />
			</Container>
		</Navbar>
	);
}
