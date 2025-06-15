import json
import yt_dlp

def lambda_handler(event, context):
    """
    API GatewayからTVerのURLを受け取り、yt-dlpで.m3u8のURLを取得して返す
    """
    try:
        body = json.loads(event.get('body', '{}'))
        tver_url = body.get('url')

        if not tver_url:
            return {
                'statusCode': 400,
                'headers': { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                'body': json.dumps({'error': 'URL is required'})
            }

        # yt-dlpのオプション設定
        ydl_opts = {
            'quiet': True,
            # User-Agentを設定して、403 Forbiddenを回避する試み
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            }
        }

        # yt-dlpで情報を取得
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(tver_url, download=False)
            
            # manifest_url を探す
            m3u8_url = info.get('manifest_url')
            if not m3u8_url:
                for f in info.get('formats', []):
                    if f.get('manifest_url'):
                        m3u8_url = f.get('manifest_url')
                        break

        if not m3u8_url:
             return {
                'statusCode': 404,
                'headers': { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                'body': json.dumps({'error': 'm3u8 link not found'})
            }

        # 成功レスポンスを返す
        return {
            'statusCode': 200,
            'headers': { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            'body': json.dumps({'m3u8_url': m3u8_url})
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'headers': { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            'body': json.dumps({'error': str(e)})
        }
