# Agricola Marks

Agricola Score Calculator

c 2018 yan3 - Spiel Embryo

## ローカル開発の設定 (.env.local / .env.development.local)

ローカル開発では Firebase Emulator Suite を利用する設定を `REACT_APP_***` 系の環境変数で切り替えます。Create React App の読み込み順に従い、共有したい値と各開発者が持つ値を次のように分けています。

### `.env.local`

リポジトリには含めず、各開発者の環境固有の設定を置きます。

- `GOOGLE_APPLICATION_CREDENTIALS`: Firebase Admin SDK のサービスアカウント JSON のパス。
- `GCLOUD_PROJECT`: Cloud Functions などバックエンド処理が参照する GCP プロジェクト ID。必要に応じて `GOOGLE_CLOUD_PROJECT` も利用します。
- `FIREBASE_WEB_API_KEY`: CLI から Cloud Functions（callable）を本番環境に対して呼び出す際に必要な Web API キー。`src/config/firebase.js` に記載の値を指定するか、別プロジェクトを利用する場合はそのキーを設定します。

### `.env.development.local`

`npm start`（開発サーバー）時にのみ読み込まれ、エミュレータ向けのフラグを有効化します。

- `REACT_APP_USE_FIRESTORE_EMULATOR`: フロントエンドが Firestore Emulator に接続するかどうかを切り替えます。
- `REACT_APP_USE_FUNCTIONS_EMULATOR`: フロントエンドから呼び出す Cloud Functions をローカルエミュレータへ向けるフラグです。
- `REACT_APP_USE_AUTH_EMULATOR`: Firebase Authentication のエミュレータを使用するかどうかを制御します。
- `FIRESTORE_EMULATOR_HOST`: Firestore Emulator のホストとポート（例: `localhost:8080`）。
- `FIREBASE_AUTH_EMULATOR_HOST`: Authentication Emulator のホストとポート（例: `localhost:9099`）。
- `FIREBASE_FUNCTIONS_EMULATOR_ORIGIN`: Cloud Functions Emulator のベース URL（例: `http://localhost:5001`）。
- `FIREBASE_PROJECT`: フロントエンドが参照する Firebase プロジェクト ID（開発サーバーで必要な場合に設定します）。
- `GCLOUD_PROJECT`: Cloud Functions などバックエンド用の Google Cloud プロジェクト ID（必要に応じて `.env.local` と同じ値を設定します）。

本番向けビルドでは `.env` や `.env.production.local` に `REACT_APP_USE_FIRESTORE_EMULATOR=false` を明示し、常に本番プロジェクトへ接続するようにしておくと安全です。

### エミュレータ設定の使い分け

- `REACT_APP_USE_*` フラグは **フロントエンド（React）専用** です。`process.env.REACT_APP_...` を参照するブラウザ側コードが、どのエンドポイントへ向かうかを切り替えるために利用します。
- `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` / `FIREBASE_FUNCTIONS_EMULATOR_ORIGIN` などの環境変数は **CLI スクリプトや Firebase Admin SDK** が参照します。これらが設定されていると、`scripts/` 配下のツールは強制的にローカルエミュレータへ接続します。
- そのため、エミュレータを使わないタイミングではこれらの環境変数を空にするか `.env.development.local` から削除してください。PowerShell で一時的に無効化する例:

  ```powershell
  Remove-Item Env:FIRESTORE_EMULATOR_HOST -ErrorAction Ignore
  Remove-Item Env:FIREBASE_FUNCTIONS_EMULATOR_ORIGIN -ErrorAction Ignore
  Remove-Item Env:FIREBASE_AUTH_EMULATOR_HOST -ErrorAction Ignore
  ```

- 逆に CLI もエミュレータに向けたい場合は、`REACT_APP_USE_*` フラグと上記のエンドポイント設定を **両方** 有効化してください。フラグだけを切り替えても Admin SDK の接続先は変わらない点に注意してください。

## 管理スクリプト (scripts/)

`scripts/` ディレクトリには、管理者が Firestore / Firebase プロジェクトをメンテナンスするための Node.js スクリプトが入っています。基本的には `node scripts/<name>.js` で実行し、エミュレータを使わない場合はサービスアカウント（例: `GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json`）を指定してください。

### メンテナンス用スクリプト

- `rebuildTrueSkill.js`: Functions 経由で `rebuildAllRatings` を呼び出し、TrueSkill レーティングをすべて再計算します（`--log` で詳細ログを出力）。
- `mergeUsers.js`: 指定した UID をマージする Cloud Functions `mergeUserAccounts` を呼び出し、ユーザーの各種データを統合します。事前に指定内容を JSON ファイルにまとめてサポートします。
- `setAdminClaim.js`: 任意の UID に対して `admin` カスタムクレームを付与 (`--grant`) あるいは削除 (`--revoke`) します。Auth エミュレータでも利用可能です。

### DB マイグレーションの一時スクリプト

以下のスクリプトは既存データベースの再同期やバックフィルを安全に行うために用意されています。通常は実行不要ですが、過去データを整備する際にのみ使用してください。

- `backfillUserStats.js`: `results` コレクションを走査し、ユーザー配下の `stats` / `statsSummary` を再生成します。
- `backfillResultsMeta.js`: 各対戦結果の `playedAt` / `participantCount` / `gameMode` などのメタデータを補完します。
- `reconcileMergedUsers.js`: `users` コレクションの `merged` フラグを検査し、必要に応じて `mergeUserAccounts` を呼び出して不整合を解消します（デフォルトは dry-run）。

## LICENSE

- 本プロジェクト: [MIT License](https://opensource.org/licenses/mit-license.php)
- サードパーティライセンス: 後述

## サードパーティライセンス

### ts-trueskill

```
MIT License

Copyright (c) Scott Cooper

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

```
License from sublee/trueskill
=======

All the Python code and the documentation in this TrueSkill project is
Copyright (c) 2012-2016 by Heungsub Lee. All rights reserved.

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

* Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the following
  disclaimer in the documentation and/or other materials provided
  with the distribution.

* The names of the contributors may not be used to endorse or
  promote products derived from this software without specific
  prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

- TrueSkill は Microsoft の登録商標です。Microsoft からのライセンスや許諾については各自確認してください。
