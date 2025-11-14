#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * 管理者用ユーザー統合スクリプト
 *
 * 使い方:
 *   node scripts/mergeUsers.js --source=fromUid --target=toUid
 *   node scripts/mergeUsers.js --file=mergePairs.json
 *
 * mergePairs.json の例:
 * [
 *   { "sourceUid": "anonymous1", "targetUid": "mainUser1" },
 *   { "sourceUid": "anonymous2", "targetUid": "mainUser2" }
 * ]
 *
 * 前提:
 *   - GOOGLE_APPLICATION_CREDENTIALS でサービスアカウント鍵を指定するか、
 *     プロジェクト直下に serviceAccountKey.json を配置する
 *   - Cloud Functions に mergeUserAccounts callable がデプロイ済み
 */

const fs = require("fs");
const path = require("path");
const process = require("process");
const admin = require("firebase-admin");
const dotenv = require("dotenv");

const DEFAULT_SERVICE_ACCOUNT = "serviceAccountKey.json";
const REGION = "asia-northeast1";
const FUNCTION_NAME = "mergeUserAccounts";

function showUsage() {
  console.log(`Usage:
  node scripts/mergeUsers.js --source=<uid> --target=<uid>
  node scripts/mergeUsers.js --file=<pairs.json>

Options:
  --source     統合元 UID
  --target     統合先 UID
  --file       統合対象の配列を記載した JSON ファイル
  --help       このメッセージを表示`);
}

function parseArgs() {
  const opts = {};
  const argv = process.argv.slice(2);
  argv.forEach(arg => {
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg.startsWith("--source=")) {
      opts.sourceUid = arg.substring("--source=".length);
    } else if (arg.startsWith("--target=")) {
      opts.targetUid = arg.substring("--target=".length);
    } else if (arg.startsWith("--file=")) {
      opts.file = arg.substring("--file=".length);
    }
  });
  return opts;
}

function resolveServiceAccount() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) {
    return path.resolve(envPath);
  }

  const localPath = path.resolve(DEFAULT_SERVICE_ACCOUNT);
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  throw new Error(
    "Service account key not found. Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json."
  );
}

function loadPairs(options) {
  if (options.file) {
    const filePath = path.resolve(options.file);
    const raw = fs.readFileSync(filePath, "utf8");
    const pairs = JSON.parse(raw);
    if (!Array.isArray(pairs)) {
      throw new Error(
        "JSON file must contain an array of {sourceUid,targetUid}"
      );
    }
    return pairs;
  }

  if (!options.sourceUid || !options.targetUid) {
    throw new Error(
      "Specify --source and --target, or provide --file with merge pairs."
    );
  }

  return [
    {
      sourceUid: options.sourceUid,
      targetUid: options.targetUid
    }
  ];
}

async function getAccessToken(credential) {
  const token = await credential.getAccessToken();
  return token.access_token;
}

function resolveEmulatorOrigin() {
  const explicit =
    process.env.FUNCTIONS_EMULATOR_URL || process.env.FUNCTIONS_EMULATOR_ORIGIN;
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const host = process.env.FUNCTIONS_EMULATOR_HOST || "localhost";
  const port = process.env.FUNCTIONS_EMULATOR_PORT || "5001";
  const hasProtocol = host.startsWith("http://") || host.startsWith("https://");
  const origin = hasProtocol ? host : `http://${host}`;
  return `${origin.replace(/\/$/, "")}:${port}`;
}

async function callMergeFunction({
  url,
  sourceUid,
  targetUid,
  useEmulator,
  accessToken
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: useEmulator ? "Bearer owner" : `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      data: { sourceUid, targetUid }
    })
  });

  const json = await response.json();
  if (!response.ok || json.error) {
    const message =
      json?.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return json.result || json.data || json;
}

async function main() {
  // load env (both .env and .env.local if present)
  dotenv.config();
  const envLocal = path.resolve(".env.local");
  if (fs.existsSync(envLocal)) {
    dotenv.config({ path: envLocal });
  }

  const options = parseArgs();
  if (options.help) {
    showUsage();
    process.exit(0);
  }

  const pairs = loadPairs(options);
  if (pairs.length === 0) {
    console.log("No merge pairs specified.");
    return;
  }

  const useEmulator =
    (process.env.REACT_APP_USE_FUNCTIONS_EMULATOR || "").toLowerCase() ===
      "true" || (process.env.FUNCTIONS_EMULATOR || "").toLowerCase() === "true";

  let accessToken = null;
  let projectId =
    process.env.FIREBASE_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT;

  if (useEmulator) {
    if (!projectId) {
      throw new Error(
        "Set FIREBASE_PROJECT (or GCLOUD_PROJECT) when using the emulator."
      );
    }
  } else {
    const credentialPath = resolveServiceAccount();
    const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
    const credential = admin.credential.cert(serviceAccount);

    admin.initializeApp({
      credential,
      projectId: serviceAccount.project_id
    });

    accessToken = await getAccessToken(credential);
    projectId = serviceAccount.project_id;
  }

  const baseUrl = useEmulator
    ? `${resolveEmulatorOrigin()}/${projectId}/${REGION}/${FUNCTION_NAME}`
    : `https://${REGION}-${projectId}.cloudfunctions.net/${FUNCTION_NAME}`;

  console.log(
    `Starting merge process (${pairs.length} pairs) -> ${
      useEmulator ? "emulator" : "production"
    } (${baseUrl})`
  );

  for (const pair of pairs) {
    const { sourceUid, targetUid } = pair;
    if (!sourceUid || !targetUid) {
      console.warn("Skipping pair with missing uid", pair);
      continue;
    }
    try {
      const result = await callMergeFunction({
        url: baseUrl,
        accessToken,
        useEmulator,
        sourceUid,
        targetUid
      });
      console.log(`Merged ${sourceUid} -> ${targetUid}`, result);
    } catch (error) {
      console.error(
        `Failed to merge ${sourceUid} -> ${targetUid}`,
        error.message
      );
    }
  }

  console.log("Merge process finished.");
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
