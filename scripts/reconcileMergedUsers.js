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
const {
  loadEnv,
  initializeFirebaseApp,
  resolveProjectId,
  ensureProductionConsent,
  getCallableAuthToken
} = require("./shared/firebaseSetup");

const REGION = "asia-northeast1";
const FUNCTION_NAME = "mergeUserAccounts";

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

  const useEmulator = detectEmulatorUsage();
  const { credential, projectId, usingEmulator } = initializeFirebaseApp({
    useEmulator,
    projectId: resolveProjectId()
  });
  const emulatorMode = usingEmulator;
  const confirmed = await ensureProductionConsent({
    usingEmulator: emulatorMode,
    projectId,
    scriptName: "reconcileMergedUsers"
  });
  if (!confirmed) {
    console.log("確認が取れなかったため処理を中断します。");
    return;
  }
  const db = admin.firestore();
  const metrics = { reads: 0, writes: 0, deletes: 0 };

  const snapshot = await db.collection("users").get();
  metrics.reads += snapshot.size;
  console.log(`Scanned ${snapshot.size} user documents.`);

  let pairs = extractMergePairs(snapshot);
  if (options.limit !== null) {
    pairs = pairs.slice(0, options.limit);
  }

  if (pairs.length === 0) {
    console.log("No pending merged users were found.");
    console.log(
      `Firestore usage (estimated): reads=${metrics.reads}, writes=${metrics.writes}, deletes=${metrics.deletes}`
    );
    process.exit(0);
  }

  console.log(
    `Found ${pairs.length} merge pair(s):`,
    pairs.map(pair => `${pair.sourceUid} -> ${pair.targetUid}`).join(", ")
  );

  if (options.dryRun) {
    console.log("Dry-run mode: no changes were made.");
    console.log(
      `Firestore usage (estimated): reads=${metrics.reads}, writes=${metrics.writes}, deletes=${metrics.deletes}`
    );
    process.exit(0);
  }

  let authToken = null;
  if (!emulatorMode) {
    if (!credential) {
      throw new Error("Failed to initialize credential for production mode.");
    }
    authToken = await getCallableAuthToken({
      credential,
      projectId
    });
  }

  const baseUrl = emulatorMode
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
        useEmulator: emulatorMode,
        authToken
      });
      console.log(`Merged ${sourceUid} -> ${targetUid}`, result);
      try {
        await db
          .collection("users")
          .doc(targetUid)
          .update({
            merged: admin.firestore.FieldValue.delete()
          });
        metrics.writes += 1;
      } catch (error) {
        console.warn(
          `Failed to clean merged flag on target ${targetUid}: ${error.message}`
        );
      }
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
  console.log(
    `Firestore usage (estimated): reads=${metrics.reads}, writes=${metrics.writes}, deletes=${metrics.deletes}`
  );
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
