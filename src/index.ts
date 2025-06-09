export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const videoUrl = url.searchParams.get('video');
		const audioUrl = url.searchParams.get('audio');

		if (videoUrl && audioUrl) {
			const m3u8 = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Audio",DEFAULT=YES,AUTOSELECT=YES,URI="${audioUrl}"
#EXT-X-STREAM-INF:BANDWIDTH=8000000,AUDIO="audio",CODECS="avc1.640028,mp4a.40.2"
${videoUrl}`;

			return new Response(m3u8, {
				headers: {
					'Content-Type': 'application/vnd.apple.mpegurl',
				},
			});
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
    <p>動画と音声のm3u8リンクを1つにまとめます。</p>
    <label for="video-url">動画URL:</label>
    <input type="text" id="video-url" placeholder="https://...">
    <label for="audio-url">音声URL:</label>
    <input type="text" id="audio-url" placeholder="https://...">
    <button onclick="generateUrl()">生成</button>
    <div id="result"></div>
  </div>
  <script>
    function generateUrl() {
      const videoUrl = document.getElementById('video-url').value;
      const audioUrl = document.getElementById('audio-url').value;
      if (!videoUrl || !audioUrl) {
        alert('動画と音声の両方のURLを入力してください。');
        return;
      }
      const currentUrl = new URL(window.location.href);
      const resultUrl = \`\${currentUrl.origin}\${currentUrl.pathname}?video=\${encodeURIComponent(videoUrl)}&audio=\${encodeURIComponent(audioUrl)}\`;
      
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
