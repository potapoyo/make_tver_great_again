import json
from urllib.parse import urlparse, parse_qs
from yt_dlp import YoutubeDL

async def serve_static_file(path, content_type):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"body": content, "headers": {"Content-Type": content_type}, "status": 200}
    except FileNotFoundError:
        return {"body": "Not Found", "headers": {"Content-Type": "text/plain"}, "status": 404}

async def get_m3u8(request_url):
    query_params = parse_qs(urlparse(request_url).query)
    tver_url = query_params.get('url', [None])[0]

    if not tver_url:
        return {"body": "URL is required", "headers": {"Content-Type": "text/plain"}, "status": 400}

    try:
        ydl_opts = {
            'quiet': True,
            'dump_single_json': True,
            'no_warnings': True,
            'skip_download': True,
        }
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(tver_url, download=False)
            
            video_url = None
            audio_url = None

            for f in info.get('formats', []):
                if f.get('vcodec') != 'none' and f.get('acodec') == 'none':
                    video_url = f.get('url')
                if f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                    audio_url = f.get('url')
            
            if not video_url or not audio_url:
                if 'requested_formats' in info:
                    for f in info['requested_formats']:
                        if f.get('vcodec') != 'none' and f.get('acodec') == 'none':
                            video_url = f.get('url')
                        if f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                            audio_url = f.get('url')

            if not video_url or not audio_url:
                manifest_url = info.get('url')
                if manifest_url:
                    return {"body": manifest_url, "headers": {"Content-Type": "text/plain"}, "status": 200}
                return {"body": "Could not extract video and audio streams.", "headers": {"Content-Type": "text/plain"}, "status": 500}

            m3u8_content = f"""#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Audio",DEFAULT=YES,AUTOSELECT=YES,URI="{audio_url}"
#EXT-X-STREAM-INF:BANDWIDTH=8000000,AUDIO="audio",CODECS="avc1.640028,mp4a.40.2"
{video_url}"""
            
            return {"body": m3u8_content, "headers": {"Content-Type": "application/vnd.apple.mpegurl"}, "status": 200}

    except Exception as e:
        return {"body": f"An error occurred: {str(e)}", "headers": {"Content-Type": "text/plain"}, "status": 500}


class Worker:
    async def fetch(self, request, env, ctx):
        url = urlparse(request.url)
        path = url.path

        if path == "/":
            response_data = await serve_static_file("src/index.html", "text/html; charset=utf-8")
        elif path == "/assets/main.js":
            response_data = await serve_static_file("src/assets/main.js", "application/javascript; charset=utf-8")
        elif path == "/api/m3u8":
            response_data = await get_m3u8(request.url)
        else:
            response_data = {"body": "Not Found", "headers": {"Content-Type": "text/plain"}, "status": 404}
        
        # The JS environment in Cloudflare expects a Response object.
        # We need to dynamically import it.
        from js import Response
        return Response.new(response_data["body"], status=response_data["status"], headers=response_data["headers"])
