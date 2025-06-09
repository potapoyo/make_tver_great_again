# make-tver-great-again

TVerの動画と音声のm3u8リンクを1つに統合するためのCloudflare Workersアプリケーションです。

## 概要

TVerの一部のストリームは、動画と音声が別々のm3u8ファイルとして配信されます。このツールは、それら2つのURLを受け取り、単一のマスターm3u8プレイリストを動的に生成することで、一般的なビデオプレイヤーでの再生を可能にします。

## 使用方法

1.  以下のURLにアクセスします。
    - **[https://mtga.potapoyo.com](https://mtga.potapoyo.com)**
2.  表示されたフォームに、TVerから取得した動画と音声のm3u8 URLをそれぞれ入力します。
3.  「生成」ボタンをクリックします。
4.  画面に表示された新しいURLをコピーし、対応するビデオプレイヤー（VLCなど）で開きます。

## 技術スタック

- Cloudflare Workers
- TypeScript
- Wrangler

## 開発

ローカルで開発サーバーを起動する場合：

```bash
npm run start
```

## デプロイ

変更をデプロイする場合：

```bash
npm run deploy
