#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * 管理者クレームを付与/解除するユーティリティ
 *
 * 例:
 *   node scripts/setAdminClaim.js --uid=xxxx --grant
 *   node scripts/setAdminClaim.js --uid=xxxx --revoke
 *
 * 必要条件:
 *   - serviceAccountKey.json をプロジェクト直下 (または GOOGLE_APPLICATION_CREDENTIALS) に配置
 *   - @firebase-admin/auth を含む firebase-admin がインストールされていること
 */

const process = require("process");
const admin = require("firebase-admin");
const {
  loadEnv,
  initializeFirebaseApp,
  ensureProductionConsent
} = require("./shared/firebaseSetup");

loadEnv();

function showUsage() {
  console.log(`Usage:
  node scripts/setAdminClaim.js --uid=<UID> --grant
  node scripts/setAdminClaim.js --uid=<UID> --revoke

Options:
  --uid     対象ユーザーの UID (必須)
  --grant   admin クレームを付与
  --revoke  admin クレームを削除
  --help    このメッセージを表示`);
}

function parseArgs() {
  const opts = {
    grant: false,
    revoke: false
  };
  const argv = process.argv.slice(2);
  argv.forEach(arg => {
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg.startsWith("--uid=")) {
      opts.uid = arg.substring("--uid=".length);
    } else if (arg === "--grant") {
      opts.grant = true;
    } else if (arg === "--revoke") {
      opts.revoke = true;
    }
  });
  return opts;
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    showUsage();
    process.exit(0);
  }

  if (!options.uid || (!options.grant && !options.revoke)) {
    showUsage();
    process.exit(1);
  }

  const { projectId, credential, usingEmulator } = initializeFirebaseApp({
    target: "auth"
  });

  const confirmed = await ensureProductionConsent({
    usingEmulator,
    projectId,
    scriptName: "setAdminClaim"
  });
  if (!confirmed) {
    console.log("確認が取れなかったため処理を中断します。");
    return;
  }

  if (usingEmulator) {
    console.log(
      `Using Auth emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}, project ${projectId}`
    );
  } else {
    if (!credential) {
      throw new Error(
        "Service account key not found. Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json."
      );
    }
  }

  const claims = options.grant ? { admin: true } : {};
  await admin.auth().setCustomUserClaims(options.uid, claims);

  console.log(
    `${options.grant ? "Granted" : "Removed"} admin claim for ${options.uid}`
  );
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
