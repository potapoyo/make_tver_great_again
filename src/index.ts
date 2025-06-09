export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const tverUrl = url.searchParams.get('tver');

		if (tverUrl) {
			try {
				const episodeIdMatch = tverUrl.match(/\/episodes\/([a-zA-Z0-9]+)/);
				if (!episodeIdMatch) {
					return new Response('Invalid TVer URL. Could not find episode ID.', { status: 400 });
				}
				const episodeId = episodeIdMatch[1];

				type EpisodeData = {
					video: {
						id: string;
						account_id: string;
					};
					token: string;
				};
				const episodeResponse = await fetch(`https://api.tver.jp/v2/episodes/${episodeId}`, {
					headers: {
						'x-tver-platform-type': 'web',
					},
				});

				if (!episodeResponse.ok) {
					const errorText = await episodeResponse.text();
					return new Response(`Failed to fetch episode data from TVer API. Status: ${episodeResponse.status}, Body: ${errorText}`, {
						status: 500,
					});
				}

				const episodeData = (await episodeResponse.json()) as EpisodeData;
				const videoId = episodeData.video.id;

				if (!episodeData.video.account_id || !videoId || !episodeData.token) {
					return new Response('Failed to get required video parameters from episode API', { status: 500 });
				}

				const manifestResponse = await fetch(
					`https://manifest.prod.boltdns.net/manifest/v1/hls/v4/clear/${episodeData.video.account_id}/${videoId}?tver_token=${episodeData.token}`,
					{
						headers: {
							Accept: 'application/json;pk=BCpkADawqM13qhq60TadJ6iG3U1yZAF_rq-xJs042_syn6Gv_B0o5O7U_YgX12vhfV_2-O8f_2B1iHn3K26eZ1qS_gIjmHh2bJ_pYT2-1R2dY-1jY-ZkE_8Y-ZkE_8Y-ZkE_8',
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
					headers: {
						'Content-Type': 'application/vnd.apple.mpegurl',
					},
				});
			} catch (e: any) {
				return new Response(e.stack, { status: 500 });
			}
		}

		const html = `
<!DOCTYPE html>
<html>
<head>
  <title>MAKE TVER GREAT AGAIN</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; margin: 2em; background-color: #f0f0f0; }
    .container { max-width: 800px; margin: 0 auto; background-color: #fff; padding: 2em; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    input[type="text"] { width: 100%; padding: 0.5em; margin-bottom: 1em; box-sizing: border-box; }
    button { padding: 0.7em 1.5em; border: none; background-color: #007bff; color: white; border-radius: 4px; cursor: pointer; }
    #result { margin-top: 1em; word-break: break-all; }
    #copy-button { margin-left: 1em; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MAKE TVER GREAT AGAIN</h1>
    <p>TVerの番組ページのURLを入力すると、動画と音声を結合したm3u8ファイルへのリンクを生成します。</p>
    <label for="tver-url">TVer番組URL:</label>
    <input type="text" id="tver-url" placeholder="https://tver.jp/episodes/...">
    <button onclick="generateUrl()">生成</button>
    <div id="result"></div>
  </div>
  <script>
    function generateUrl() {
      const tverUrl = document.getElementById('tver-url').value;
      if (!tverUrl) {
        alert('TVerの番組URLを入力してください。');
        return;
      }
      const currentUrl = new URL(window.location.href);
      const resultUrl = \`\${currentUrl.origin}\${currentUrl.pathname}?tver=\${encodeURIComponent(tverUrl)}\`;
      
      const resultDiv = document.getElementById('result');
      resultDiv.innerHTML = \`
        <p>生成されたURL:</p>
        <a href="\${resultUrl}" target="_blank">\${resultUrl}</a>
        <button id="copy-button" onclick="copyToClipboard('\${resultUrl}')">コピー</button>
      \`;
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        alert('コピーしました！');
      }, (err) => {
        alert('コピーに失敗しました: ', err);
      });
    }
  </script>
</body>
</html>
`;

		return new Response(html, {
			headers: {
				'Content-Type': 'text/html;charset=UTF-8',
			},
		});
	},
};
