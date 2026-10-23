import { Table } from 'react-bootstrap';

import type { ClientKind } from '@/app/lib/clients/models';
import { PDF_SOURCES } from '@/app/lib/clients/pdf-sources';

export function PdfSources({ kind }: { kind: ClientKind }) {
	const headingId = `${kind}-pdf-sources`;

	return (
		<section
			aria-labelledby={headingId}
			className='border rounded p-3 mb-3 small'
		>
			<h2
				id={headingId}
				className='h6'
			>
				Origen de cada PDF
			</h2>
			<Table
				size='sm'
				borderless
				className='mb-0 w-auto'
			>
				<thead>
					<tr>
						<th scope='col'>Documento</th>
						<th scope='col'>Aplicación</th>
					</tr>
				</thead>
				<tbody>
					{PDF_SOURCES[kind].map((source) => (
						<tr key={source.document}>
							<td>{source.document}</td>
							<td>{source.app}</td>
						</tr>
					))}
				</tbody>
			</Table>
		</section>
	);
}
