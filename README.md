# 股関節ペインログ

運動と股関節まわりの痛みを記録して、カレンダーとグラフで傾向を見る個人用の PWA。
データはスマホの中（IndexedDB）に保存し、オフラインでも使える。

- 仕様: [docs/requirements.md](docs/requirements.md)
- 画面モック: [mock/index.html](mock/index.html)
- Windows での環境構築: [docs/環境構築手順.md](docs/環境構築手順.md)

## 開発

```sh
npm install
npm run dev      # 開発サーバー（http://localhost:5180、同じ Wi-Fi のスマホからも開ける）
npm test         # 集計ロジックのテスト
npm run lint
npm run build    # 公開用ファイルを dist/ に作る
npm run preview  # build したものを確認（PWA の動作確認はこちら）
```

開発サーバーでは、設定画面の一番下に「サンプルデータを入れる」が出る（公開版には出ない）。

## スマホで試す（同じ Wi-Fi 内）

```sh
npm run dev
```

表示された `http://192.168.x.x:5180` をスマホで開く。
※ ホーム画面に追加・オフライン動作は HTTPS が必要なので、公開後に確認する。

## 公開（GitHub Pages・無料）

1. GitHub にリポジトリを作って push する
2. リポジトリの Settings → Pages → Source を「GitHub Actions」にする
3. `main` に push すると `.github/workflows/deploy.yml` が自動で公開する
4. `https://<ユーザー名>.github.io/<リポジトリ名>/` を iPhone の Safari で開き、共有 →「ホーム画面に追加」

## アイコンを作り直す

`public/icon.svg` を編集してから `npm run icons`。
