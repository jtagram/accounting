import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Header } from '../header';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('Header', () => {
	it('shows the brand and the logout button', () => {
		render(<Header />);

		expect(screen.getByText('Accounting')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
	});
});
