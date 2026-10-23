import { redirect } from 'next/navigation';

import { NAV_ITEMS } from '@/app/lib/nav-items';

// The proxy sends unauthenticated visitors to /login before this runs.
export default function HomePage() {
	redirect(NAV_ITEMS[0].href);
}
