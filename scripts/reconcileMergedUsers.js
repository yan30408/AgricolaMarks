#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * users コレクション内で merged フィールドを持つドキュメントを走査し、
 * mergeUserAccounts callable を順番に呼び出して統廃合を完了させるスクリプト。
 *
 * 使い方:
 *   node scripts/reconcileMergedUsers.js          # デフォルトはドライラン（実行内容のみ表示）
 *   node scripts/reconcileMergedUsers.js --apply  # 実際に統廃合を実行
 *   node scripts/reconcileMergedUsers.js --limit=5 --apply
 */

const fs = require("fs");
const path = require("path");
const process = require("process");
const admin = require("firebase-admin");
const dotenv = require("dotenv");

const DEFAULT_SERVICE_ACCOUNT = "serviceAccountKey.json";
const REGION = "asia-northeast1";
const FUNCTION_NAME = "mergeUserAccounts";

function loadEnv() {
  dotenv.config();
  const envLocal = path.resolve(".env.local");
  if (fs.existsSync(envLocal)) {
    dotenv.config({ path: envLocal });
  }
}

function parseArgs() {
  const options = {
    dryRun: true,
    limit: null
  };

  process.argv.slice(2).forEach(arg => {
    if (arg === "--apply") {
      options.dryRun = false;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--limit=")) {
      const value = Number(arg.substring("--limit=".length));
      if (Number.isFinite(value) && value > 0) {
        options.limit = Math.floor(value);
      } else {
        throw new Error(`Invalid --limit value: ${arg}`);
      }
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  });

  return options;
}

function showUsage() {
  console.log(`Usage:
  node scripts/reconcileMergedUsers.js [--apply] [--limit=<number>]

Options:
  --apply       実際に mergeUserAccounts を呼び出して統廃合を実行
  --dry-run     実行内容のみ表示（デフォルト）
  --limit       処理するペアの上限を指定
  --help, -h    このメッセージを表示`);
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
  const hasProtocol = /^https?:\/\//i.test(host);

  if (hasProtocol) {
    try {
      const url = new URL(host);
      if (!url.port && port) {
        url.port = port;
      }
      return url.origin;
    } catch (error) {
      return host.replace(/\/$/, "");
    }
  }

  const normalizedHost = host.replace(/\/$/, "");
  try {
    const url = new URL(`http://${normalizedHost}`);
    if (!url.port && port) {
      url.port = port;
    }
    return url.origin;
  } catch (error) {
    const suffix = port ? `:${port}` : "";
    return `http://${normalizedHost}${suffix}`;
  }
}

function detectEmulatorUsage() {
  const useFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const useFunctionsEmulator =
    (process.env.REACT_APP_USE_FUNCTIONS_EMULATOR || "").toLowerCase() ===
      "true" || (process.env.FUNCTIONS_EMULATOR || "").toLowerCase() === "true";
  return useFirestoreEmulator || useFunctionsEmulator;
}

async function initializeFirebase(useEmulator) {
  if (admin.apps.length) {
    return { credential: null, projectId: admin.app().options.projectId };
  }

  if (useEmulator) {
    const projectId =
      process.env.FIREBASE_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      "demo-project";
    admin.initializeApp({ projectId });
    return { credential: null, projectId };
  }

  const credentialPath = resolveServiceAccount();
  const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
  const credential = admin.credential.cert(serviceAccount);
  admin.initializeApp({
    credential,
    projectId: serviceAccount.project_id
  });
  return { credential, projectId: serviceAccount.project_id };
}

function extractMergePairs(snapshot) {
  const docMap = new Map();
  snapshot.forEach(doc => {
    docMap.set(doc.id, doc.data() || {});
  });

  const pairs = [];
  docMap.forEach((data, uid) => {
    const merged = data?.merged;
    let targetUid = null;
    if (typeof merged === "string" && merged.trim()) {
      targetUid = merged.trim();
    } else if (
      merged &&
      typeof merged === "object" &&
      typeof merged.uid === "string" &&
      merged.uid.trim()
    ) {
      targetUid = merged.uid.trim();
    }

    if (!targetUid || targetUid === uid) {
      return;
    }

    if (!docMap.has(targetUid)) {
      console.warn(
        `Skipping ${uid} -> ${targetUid}; target user not found in snapshot.`
      );
      return;
    }

    const key = `${uid}->${targetUid}`;
    pairs.push({ key, sourceUid: uid, targetUid });
  });

  const unique = new Map();
  pairs.forEach(pair => {
    if (!unique.has(pair.key)) {
      unique.set(pair.key, {
        sourceUid: pair.sourceUid,
        targetUid: pair.targetUid
      });
    }
  });

  return Array.from(unique.values());
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
  loadEnv();
  const options = parseArgs();
  if (options.help) {
    showUsage();
    process.exit(0);
  }

  const useEmulator = detectEmulatorUsage();
  const { credential, projectId } = await initializeFirebase(useEmulator);
  const db = admin.firestore();

  const snapshot = await db.collection("users").get();
  console.log(`Scanned ${snapshot.size} user documents.`);

  let pairs = extractMergePairs(snapshot);
  if (options.limit !== null) {
    pairs = pairs.slice(0, options.limit);
  }

  if (pairs.length === 0) {
    console.log("No pending merged users were found.");
    process.exit(0);
  }

  console.log(
    `Found ${pairs.length} merge pair(s):`,
    pairs.map(pair => `${pair.sourceUid} -> ${pair.targetUid}`).join(", ")
  );

  if (options.dryRun) {
    console.log("Dry-run mode: no changes were made.");
    process.exit(0);
  }

  let accessToken = null;
  if (!useEmulator) {
    if (!credential) {
      throw new Error("Failed to initialize credential for production mode.");
    }
    accessToken = await getAccessToken(credential);
  }

  const baseUrl = useEmulator
    ? `${resolveEmulatorOrigin()}/${projectId}/${REGION}/${FUNCTION_NAME}`
    : `https://${REGION}-${projectId}.cloudfunctions.net/${FUNCTION_NAME}`;

  let successCount = 0;
  for (const pair of pairs) {
    const { sourceUid, targetUid } = pair;
    try {
      const result = await callMergeFunction({
        url: baseUrl,
        sourceUid,
        targetUid,
        useEmulator,
        accessToken
      });
      console.log(`Merged ${sourceUid} -> ${targetUid}`, result);
      await db
        .collection("users")
        .doc(targetUid)
        .update({
          merged: admin.firestore.FieldValue.delete()
        })
        .catch(error => {
          console.warn(
            `Failed to clean merged flag on target ${targetUid}: ${error.message}`
          );
        });
      successCount += 1;
    } catch (error) {
      console.error(
        `Failed to merge ${sourceUid} -> ${targetUid}: ${error.message}`
      );
    }
  }

  console.log(
    `Merge process finished. Success: ${successCount}, Failed: ${pairs.length -
      successCount}`
  );
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
