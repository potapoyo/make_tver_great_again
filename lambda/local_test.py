import json
from main import lambda_handler

if __name__ == "__main__":
    # テストしたいTVerのURL
    test_tver_url = "https://tver.jp/episodes/epkpj0if59"

    # API Gatewayからのリクエストを模したテストイベントを作成
    # 実際のAPI Gateway (HTTP API)からのリクエストボディは文字列化されている
    test_event = {
        "body": json.dumps({
            "url": test_tver_url
        })
    }

    print(f"Testing with URL: {test_tver_url}")

    # lambda_handlerを直接呼び出して結果を取得
    result = lambda_handler(test_event, None)

    # 結果を出力
    print("\n--- Lambda Function Result ---")
    print(f"Status Code: {result['statusCode']}")
    print("Body:")
    # bodyはJSON文字列なので、見やすく整形して表示
    print(json.dumps(json.loads(result['body']), indent=2, ensure_ascii=False))
    print("--------------------------")
