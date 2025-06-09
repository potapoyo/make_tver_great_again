import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('TVer m3u8 generator', () => {
	it('should return a combined m3u8 file from a Tver URL', async () => {
		const tverUrl = 'https://tver.jp/episodes/ep6ykhvl0jb';
		const request = new IncomingRequest(`http://example.com?tver=${encodeURIComponent(tverUrl)}`);
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		const responseText = await response.text();
		if (response.headers.get('Content-Type') !== 'application/vnd.apple.mpegurl') {
			console.error('Unexpected response body:', responseText);
		}

		expect(response.headers.get('Content-Type')).toBe('application/vnd.apple.mpegurl');
		expect(responseText).toContain('#EXTM3U');
		expect(responseText).toContain('#EXT-X-MEDIA:TYPE=AUDIO');
		expect(responseText).toContain('video');
		expect(responseText).toContain('audio');
	}, 30000); // タイムアウトを30秒に設定

	it('should return the HTML page when no tver url is provided', async () => {
		const request = new IncomingRequest('http://example.com');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.headers.get('Content-Type')).toBe('text/html;charset=UTF-8');
		const responseText = await response.text();
		expect(responseText).toContain('<h1>MAKE TVER GREAT AGAIN</h1>');
	});
});
