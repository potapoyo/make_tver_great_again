import json
from yt_dlp import YoutubeDL
from itty_bitty_router import Router, Response

router = Router()

@router.get("/")
async def serve_html(request):
    with open("src/index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return Response(html_content, headers={"Content-Type": "text/html; charset=utf-8"})

@router.get("/assets/main.js")
async def serve_js(request):
    with open("src/assets/main.js", "r", encoding="utf-8") as f:
        js_content = f.read()
    return Response(js_content, headers={"Content-Type": "application/javascript; charset=utf-8"})

@router.get("/api/m3u8")
async def get_m3u8(request):
    tver_url = request.query.get('url')
    if not tver_url:
        return Response("URL is required", status=400)

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
                 # Sometimes formats are nested in 'requested_formats'
                if 'requested_formats' in info:
                    for f in info['requested_formats']:
                        if f.get('vcodec') != 'none' and f.get('acodec') == 'none':
                            video_url = f.get('url')
                        if f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                            audio_url = f.get('url')

            if not video_url or not audio_url:
                # Fallback to the main manifest URL if separate streams aren't found
                manifest_url = info.get('url')
                if manifest_url:
                    return Response(manifest_url, headers={"Content-Type": "text/plain"})
                return Response("Could not extract video and audio streams.", status=500)

            m3u8_content = f"""#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Audio",DEFAULT=YES,AUTOSELECT=YES,URI="{audio_url}"
#EXT-X-STREAM-INF:BANDWIDTH=8000000,AUDIO="audio",CODECS="avc1.640028,mp4a.40.2"
{video_url}"""
            
            return Response(m3u8_content, headers={"Content-Type": "application/vnd.apple.mpegurl"})

    except Exception as e:
        return Response(f"An error occurred: {str(e)}", status=500)

@router.all("*")
def not_found(request):
    return Response("Not Found", status=404)

class Worker:
    async def fetch(self, request, env, ctx):
        return await router.handle(request)
