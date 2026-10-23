'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Nav } from 'react-bootstrap';

import { NAV_GROUPS } from '@/app/lib/nav-items';

export function Sidebar() {
	const pathname = usePathname();

	return (
		<Nav
			variant='pills'
			className='flex-column flex-nowrap flex-shrink-0 border-end bg-light p-3'
			style={{ width: 260, overflowY: 'auto' }}
		>
			{NAV_GROUPS.map((group) => (
				<div
					key={group.title}
					className='mb-3'
				>
					<div className='text-uppercase small fw-bold text-muted px-2 mb-1'>{group.title}</div>
					{group.items.map((item) => (
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
				</div>
			))}
		</Nav>
	);
}
