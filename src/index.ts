import indexHtml from './index.html';
import mainJs from './assets/main.js';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (path === '/') {
			return new Response(indexHtml, {
				headers: { 'Content-Type': 'text/html;charset=UTF-8' },
			});
		}

		if (path === '/assets/main.js') {
			return new Response(mainJs, {
				headers: { 'Content-Type': 'application/javascript;charset=UTF-8' },
			});
		}

		if (path === '/api/m3u8') {
			const tverUrl = url.searchParams.get('url');
			if (!tverUrl) {
				return new Response('URL is required', { status: 400 });
			}

			try {
				const episodeIdMatch = tverUrl.match(/\/episodes\/([a-zA-Z0-9]+)/);
				if (!episodeIdMatch) {
					return new Response('Invalid TVer URL. Could not find episode ID.', { status: 400 });
				}
				const episodeId = episodeIdMatch[1];

				const pageResponse = await fetch(tverUrl);
				const pageText = await pageResponse.text();
				const buildIdMatch = pageText.match(/"buildId":"([a-zA-Z0-9_-]+)"/);
				if (!buildIdMatch) {
					return new Response('Could not find buildId on TVer page.', { status: 500 });
				}
				const buildId = buildIdMatch[1];

				const nextDataResponse = await fetch(`https://tver.jp/_next/data/${buildId}/episodes/${episodeId}.json`);
				if (!nextDataResponse.ok) {
					return new Response(`Failed to fetch _next/data. Status: ${nextDataResponse.status}`, { status: 500 });
				}

				type NextData = {
					pageProps?: {
						episode?: {
							video: {
								id: string;
								account_id: string;
								token: string;
							};
						};
					};
				};
				const nextData = (await nextDataResponse.json()) as NextData;

				const episode = nextData?.pageProps?.episode;
				if (!episode) {
					return new Response('Could not find episode data in _next/data json.', { status: 500 });
				}

				const videoId = episode.video.id;
				const accountId = episode.video.account_id;
				const token = episode.video.token;

				if (!accountId || !videoId || !token) {
					return new Response('Failed to get required video parameters from episode API', { status: 500 });
				}

				const manifestResponse = await fetch(
					`https://manifest.prod.boltdns.net/manifest/v1/hls/v4/clear/${accountId}/${videoId}?tver_token=${token}`,
					{
						headers: {
							Accept: 'application/json;pk=BCpkADawqM13qhq60TadJ6iG3U1yZAF_rq-xJs042_syn6Gv_B0o5O7U_YgX12vhfV_2-O8f_2B1iHn3K26eZ1qS_gIjmHh2bJ_pYT2-1R2dY-1jY-ZkE_8Y-ZkE_8Y-ZkE_8',
							'Origin': 'https://tver.jp',
						},
					},
				);
				
				type ManifestData = {
					sources: { src: string }[];
				};
				const manifestData = (await manifestResponse.json()) as ManifestData;

				const videoUrl = manifestData.sources.find((s) => s.src.includes('video'))?.src;
				const audioUrl = manifestData.sources.find((s) => s.src.includes('audio'))?.src;

				if (!videoUrl || !audioUrl) {
					return new Response('Could not find video or audio URL in manifest', { status: 500 });
				}

				const m3u8 = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Audio",DEFAULT=YES,AUTOSELECT=YES,URI="${audioUrl}"
#EXT-X-STREAM-INF:BANDWIDTH=8000000,AUDIO="audio",CODECS="avc1.640028,mp4a.40.2"
${videoUrl}`;

				return new Response(m3u8, {
					headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
				});
			} catch (e: any) {
				return new Response(e.stack || 'An unknown error occurred', { status: 500 });
			}
		}

		return new Response('Not Found', { status: 404 });
	},
};
