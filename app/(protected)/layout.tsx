import { Header } from '@/app/components/header';
import { Sidebar } from '@/app/components/sidebar';
import { ClientsProvider } from '@/app/lib/clients/clients-provider';

export default function ProtectedLayout({ children }: LayoutProps<'/'>) {
	return (
		<ClientsProvider>
			<div className='d-flex flex-column vh-100'>
				<Header />
				<div className='d-flex flex-grow-1 overflow-hidden'>
					<Sidebar />
					<main
						className='flex-grow-1 overflow-auto p-4'
						style={{ minWidth: 0 }}
					>
						{children}
					</main>
				</div>
			</div>
		</ClientsProvider>
	);
}
