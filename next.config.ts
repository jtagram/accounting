import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
	// The former "load clients" pages were merged into the process pages.
	// Redirects run before the filesystem and before the proxy, so these
	// sources need no proxy matcher entry: the destinations are protected.
	redirects() {
		return ['', '-agip', '-arba'].map((suffix) => ({
			source: `/cargar-clientes-arca${suffix}`,
			destination: `/procesar-clientes-arca${suffix}`,
			permanent: false,
		}));
	},
};

export default nextConfig;
