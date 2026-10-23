import type { ClientKind } from './models';

export interface PdfSource {
	document: string;
	app: string;
}

/**
 * Informative only: mirrors the "Origen de cada PDF" documented in the
 * accounting-api Swagger for each kind.
 */
export const PDF_SOURCES: Record<ClientKind, readonly PdfSource[]> = {
	arca: [
		{ document: 'Comprobantes emitidos', app: 'ARCA' },
		{ document: 'Comprobantes recibidos', app: 'ARCA' },
		{ document: 'Retenciones', app: 'ARCA' },
		{ document: 'Acuse de recibo', app: 'ARCA' },
		{ document: 'Monotributo', app: 'ARCA' },
		{ document: 'Ingresos brutos', app: 'ARCA' },
		{ document: 'Declaración jurada', app: 'ARCA' },
	],
	'arca-agip': [
		{ document: 'Comprobantes emitidos', app: 'ARCA' },
		{ document: 'Comprobantes recibidos', app: 'ARCA' },
		{ document: 'Retenciones', app: 'ARCA' },
		{ document: 'Acuse de recibo', app: 'ARCA' },
		{ document: 'Monotributo', app: 'ARCA' },
		{ document: 'Ingresos brutos', app: 'ARCA' },
		{ document: 'Declaración jurada', app: 'AGIP' },
	],
	'arca-arba': [
		{ document: 'Comprobantes emitidos', app: 'ARCA' },
		{ document: 'Comprobantes recibidos', app: 'ARCA' },
		{ document: 'Retenciones', app: 'ARCA' },
		{ document: 'Acuse de recibo', app: 'ARBA' },
		{ document: 'Monotributo', app: 'ARCA' },
		{ document: 'Ingresos brutos', app: 'ARCA' },
		{ document: 'Declaración jurada', app: 'ARBA' },
	],
};
