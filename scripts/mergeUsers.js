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
const {
  loadEnv,
  initializeFirebaseApp,
  resolveProjectId,
  ensureProductionConsent,
  getCallableAuthToken
} = require("./shared/firebaseSetup");

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
  authToken
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: useEmulator ? "Bearer owner" : `Bearer ${authToken}`
    },
    body: JSON.stringify({
      data: { sourceUid, targetUid }
    })
  });

  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch (error) {
    const snippet = raw?.slice(0, 200) || "<empty>";
    throw new Error(
      `Failed to parse callable response: ${snippet} (HTTP ${response.status})`
    );
  }

  if (!response.ok || payload?.error) {
    const message =
      payload?.error?.message ||
      `HTTP ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return payload.result || payload.data || payload;
}

async function main() {
  loadEnv();

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

  let authToken = null;
  let projectId =
    resolveProjectId() ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;

  if (useEmulator && !projectId) {
    throw new Error(
      "Set FIREBASE_PROJECT (or GCLOUD_PROJECT) when using the emulator."
    );
  }

  const {
    credential,
    projectId: resolvedProjectId,
    usingEmulator
  } = initializeFirebaseApp({
    useEmulator,
    projectId
  });

  projectId = resolvedProjectId || projectId;

  const confirmed = await ensureProductionConsent({
    usingEmulator,
    projectId,
    scriptName: "mergeUsers"
  });
  if (!confirmed) {
    console.log("確認が取れなかったため処理を中断します。");
    return;
  }

  if (!usingEmulator) {
    if (!credential) {
      throw new Error(
        "Failed to initialize Firebase credential. Check your service account configuration."
      );
    }
    authToken = await getCallableAuthToken({
      credential,
      projectId
    });
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
        authToken,
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
