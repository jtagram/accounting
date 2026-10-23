import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NAV_ITEMS } from '@/app/lib/nav-items';

import { Sidebar } from '../sidebar';

const usePathname = vi.fn();

vi.mock('next/navigation', () => ({
	usePathname: () => usePathname() as string,
}));

describe('Sidebar', () => {
	beforeEach(() => {
		usePathname.mockReturnValue(NAV_ITEMS[0].href);
	});

	it('renders every menu entry as a link to its route', () => {
		render(<Sidebar />);

		for (const item of NAV_ITEMS) {
			expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.href);
		}
	});

	it.each(NAV_ITEMS)('highlights only $label when its route is active', (active) => {
		usePathname.mockReturnValue(active.href);
		render(<Sidebar />);

		for (const item of NAV_ITEMS) {
			const link = screen.getByRole('link', { name: item.label });
			if (item.id === active.id) {
				expect(link).toHaveClass('active');
			} else {
				expect(link).not.toHaveClass('active');
			}
		}
	});
});
