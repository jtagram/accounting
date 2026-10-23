'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Nav } from 'react-bootstrap';

import { NAV_ITEMS } from '@/app/lib/nav-items';

export function Sidebar() {
	const pathname = usePathname();

	return (
		<Nav
			variant='pills'
			className='flex-column flex-nowrap flex-shrink-0 border-end bg-light p-3'
			style={{ width: 260, overflowY: 'auto' }}
		>
			{NAV_ITEMS.map((item) => (
				<Nav.Item
					key={item.id}
					className='mb-1'
				>
					<Nav.Link
						as={Link}
						href={item.href}
						active={pathname === item.href}
					>
						{item.label}
					</Nav.Link>
				</Nav.Item>
			))}
		</Nav>
	);
}
