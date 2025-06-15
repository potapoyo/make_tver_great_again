# TVer .m3u8 Link Extractor

TVerの動画ページURLから、.m3u8形式のHLSプレイリストURLを抽出するためのウェブアプリケーションです。

## アーキテクチャ

このプロジェクトは、以下のAWSサービスとツールを使用して構築されています。

-   **フロントエンド**: 静的なHTML, CSS, JavaScriptで構成され、**AWS S3** でホスティングされます。
-   **バックエンド**: **API Gateway** を通じてリクエストを受け取り、**AWS Lambda** 上のPython関数を実行します。Lambda関数内では `yt-dlp` ライブラリを使用してTVerから情報を取得します。
-   **インフラ管理**: 上記のAWSリソースはすべて **Terraform** によってコードで管理されています。

## ディレクトリ構造

```
.
├── frontend/
│   └── index.html      # フロントエンドのUI
├── lambda/
│   ├── main.py         # Lambda関数のメインロジック
│   ├── local_test.py   # ローカルテスト用スクリプト
│   └── layer/          # yt-dlpライブラリを配置するディレクトリ (手動生成)
├── terraform/
│   └── main.tf         # Terraformのインフラ定義ファイル
└── README.md           # このファイル
```

## セットアップとデプロイ手順

### 前提条件

-   [AWS CLI](https://aws.amazon.com/jp/cli/) がインストールおよび設定済みであること。
-   [Terraform](https://www.terraform.io/downloads.html) がインストール済みであること。
-   [Python](https://www.python.org/downloads/) 3.9 がインストール済みであること。
-   `pip` で `yt-dlp` がインストール可能であること。

### 1. AWS認証情報の設定

AWS CLIを使用して、IAMユーザーの認証情報を設定します。このユーザーには、S3, API Gateway, Lambda, IAM Roleを作成・変更する権限が必要です。

```bash
aws configure
```

### 2. Lambdaレイヤーの準備

Lambda関数で `yt-dlp` を使用するために、ライブラリファイルを手動で配置する必要があります。

```bash
# プロジェクトのルートディレクトリで実行
pip install yt-dlp -t lambda/layer/python
```
これにより、`lambda/layer/python` ディレクトリ以下に `yt-dlp` がインストールされます。

### 3. Terraformによるデプロイ

Terraformを使用してAWSリソースをデプロイします。

```bash
# terraformディレクトリに移動
cd terraform

# Terraformの初期化
terraform init

# インフラの構築
terraform apply
```

`apply` が完了すると、`s3_website_endpoint` と `api_endpoint` が出力されます。

## Cloudflareとの連携 (手動設定)

このアプリケーションを独自のドメインでHTTPS化して公開するには、CloudflareなどのCDNサービスを利用します。

1.  **DNS設定**:
    -   CloudflareのDNS設定で、`CNAME` レコードを作成します。
    -   **名前**: 公開したいドメイン名 (例: `tver-tool`)
    -   **ターゲット**: `terraform apply` で出力された `s3_website_endpoint` の値。

2.  **SSL/TLS設定**:
    -   CloudflareのSSL/TLS暗号化モードを **「フレキシブル」** に設定します。

**注意**: S3バケット名とCNAMEのドメイン名を一致させる構成にしているため、Cloudflareのオリジンルールは不要です。

以上で、ご自身のドメインでサイトが公開されます。
