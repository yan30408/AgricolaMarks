# Agricola Marks

Agricola Score Caliculator

© 2018 yan3 - Spiel Embryo

## 開発環境の設定 (.env.local)

ローカル開発では Firebase Emulator Suite を利用するために `.env.local` を配置します。主な設定値は次の通りです。

- `REACT_APP_USE_FIRESTORE_EMULATOR`: フロントエンドが Firestore Emulator に接続するかどうかを切り替えます。
- `REACT_APP_USE_FUNCTIONS_EMULATOR`: フロントエンドから呼び出す Cloud Functions をローカルエミュレータへ向けるフラグです。
- `REACT_APP_USE_AUTH_EMULATOR`: Firebase Authentication のエミュレータを使用するかどうかを制御します。
- `FIRESTORE_EMULATOR_HOST`: Firestore Emulator のホスト名とポート番号（例: `localhost:8080`）。
- `FIREBASE_AUTH_EMULATOR_HOST`: Authentication Emulator のホスト名とポート番号（例: `localhost:9099`）。
- `FIREBASE_FUNCTIONS_EMULATOR_ORIGIN`: Cloud Functions Emulator のベース URL（例: `http://localhost:5001`）。
- `FIREBASE_PROJECT`: フロントエンドが利用する Firebase プロジェクト ID。
- `GCLOUD_PROJECT`: Cloud Functions などバックエンドの Google Cloud プロジェクト ID。`FIREBASE_PROJECT` と同じ値を設定し、必要に応じて `GOOGLE_CLOUD_PROJECT` で代用できます。

## 管理スクリプト (scripts/)

`scripts/` ディレクトリには管理者が Firestore / Firebase プロジェクトを保守するための Node.js スクリプトを配置しています。基本的には `node scripts/<name>.js` で実行し、エミュレータを使わない場合はサービスアカウント鍵（`GOOGLE_APPLICATION_CREDENTIALS` もしくは `serviceAccountKey.json`）の用意が必要です。

### 定常運用向けスクリプト

- `rebuildTrueSkill.js`: Functions 側の `rebuildAllRatings` を呼び出し、TrueSkill レーティングを全件再計算します（`--log` で詳細ログ出力）。
- `mergeUsers.js`: 指定した UID の組み合わせを Cloud Functions `mergeUserAccounts` に渡し、ユーザーの統合処理を実行します。単体指定と JSON ファイルによる一括指定をサポートします。
- `setAdminClaim.js`: 特定の UID に対して `admin` カスタムクレームを付与 (`--grant`) または削除 (`--revoke`) します。Auth エミュレータでも利用可能です。

### DB 改修向けの一時スクリプト

以下のスクリプトは今回のデータベース改修に伴うバックフィル／再編のために用意したものです。改修が完了した現時点では通常再実行する必要はなく、将来同様の移行作業が発生した場合のみ利用してください。

- `backfillUserStats.js`: `results` コレクションを走査して戦績サマリー（`users/{uid}/stats`・`statsSummary`）を再構築します。
- `backfillResultsMeta.js`: 各対戦結果の `playedAt`・`participantCount`・`gameMode` など欠損メタデータを一括補完します。
- `reconcileMergedUsers.js`: `users` コレクションの `merged` フラグを検出し、必要に応じて `mergeUserAccounts` を呼び出して未処理の統合作業を適用します（デフォルトはドライラン）。

## LICENSE

- 当プロジェクト: [MIT License](https://opensource.org/licenses/mit-license.php)
- サードパーティライセンス: 下記参照

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

- TrueSkill は Microsoft の登録商標です。Microsoft が定める利用ガイドラインを必ずご確認ください。
