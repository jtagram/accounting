import { proxyProcessRequest } from '@/app/lib/accounting-proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Long-lived RPA run: self-hosted Next does not cut it, but platforms that honour
// maxDuration (seconds) need a high value.
export const maxDuration = 3600;

export async function POST(request: Request) {
	return proxyProcessRequest(request, 'arca');
}
