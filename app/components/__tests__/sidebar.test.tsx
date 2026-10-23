import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NAV_GROUPS, NAV_ITEMS } from '@/app/lib/nav-items';

import { Sidebar } from '../sidebar';

const usePathname = vi.fn();

vi.mock('next/navigation', () => ({
	usePathname: () => usePathname() as string,
}));

describe('Sidebar', () => {
	beforeEach(() => {
		usePathname.mockReturnValue(NAV_ITEMS[0].href);
	});

	it('renders the group headers in order as non-link titles', () => {
		render(<Sidebar />);

		for (const title of ['ARCA', 'ARCA - AGIP', 'ARCA - ARBA']) {
			expect(screen.getByText(title)).toBeInTheDocument();
			expect(screen.queryByRole('link', { name: title })).not.toBeInTheDocument();
		}
		const titles = NAV_GROUPS.map((group) => screen.getByText(group.title));
		titles.slice(1).forEach((el, i) => {
			expect(titles[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		});
	});

	it('renders the six links in order with their routes', () => {
		render(<Sidebar />);

		const links = screen.getAllByRole('link');
		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'/cargar-clientes-arca',
			'/procesar-clientes-arca',
			'/cargar-clientes-arca-agip',
			'/procesar-clientes-arca-agip',
			'/cargar-clientes-arca-arba',
			'/procesar-clientes-arca-arba',
		]);
		expect(links.map((link) => link.textContent)).toEqual([
			'Cargar clientes ARCA en memoria',
			'Procesar clientes ARCA',
			'Cargar clientes ARCA-AGIP en memoria',
			'Procesar clientes ARCA-AGIP',
			'Cargar clientes ARCA-ARBA en memoria',
			'Procesar clientes ARCA-ARBA',
		]);
	});

	it.each(NAV_ITEMS)('highlights only $href when its route is active', (active) => {
		usePathname.mockReturnValue(active.href);
		render(<Sidebar />);

		for (const link of screen.getAllByRole('link')) {
			if (link.getAttribute('href') === active.href) {
				expect(link).toHaveClass('active');
			} else {
				expect(link).not.toHaveClass('active');
			}
		}
	});
});
