#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const { rebuildAllRatings } = require("../functions/lib/rebuildAll");
const {
  synchronizeSummariesWithRatingStates
} = require("../functions/lib/synchronizeSummaries");

dotenv.config();
const envLocal = path.resolve(".env.local");
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
}

const cliArgs = process.argv.slice(2);
const shouldLogRatings = cliArgs.includes("--log") || cliArgs.includes("-l");

function initializeFirebase() {
  if (admin.apps.length) {
    return;
  }

  const usesEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  if (usesEmulator) {
    const projectId =
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.FIREBASE_PROJECT ||
      "demo-emulator-project";
    admin.initializeApp({ projectId });
    return;
  }

  const credentialPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve("serviceAccountKey.json");
  if (!fs.existsSync(credentialPath)) {
    throw new Error(
      "Service account key not found. Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json."
    );
  }
  const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

async function acquireRebuildLock(db, FieldValue, reason, resultId = null) {
  const lockRef = db.collection("meta").doc("ratingLock");
  try {
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(lockRef);
      if (snapshot.exists && snapshot.data()?.locked) {
        throw new Error("LOCKED");
      }
      tx.set(
        lockRef,
        {
          locked: true,
          reason: reason || "manual-cli",
          resultId: resultId || null,
          startedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });
    return true;
  } catch (error) {
    if (error.message === "LOCKED") {
      return false;
    }
    throw error;
  }
}

async function releaseRebuildLock(db, FieldValue, status) {
  const lockRef = db.collection("meta").doc("ratingLock");
  await lockRef.set(
    {
      locked: false,
      status: status || "success",
      finishedAt: FieldValue.serverTimestamp(),
      reason: null,
      resultId: null
    },
    { merge: true }
  );
}

async function main() {
  initializeFirebase();
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;
  const acquired = await acquireRebuildLock(
    db,
    FieldValue,
    "manual-cli-rebuild"
  );
  if (!acquired) {
    console.error(
      "Rating rebuild is already running (meta/ratingLock.locked = true). Aborting."
    );
    process.exit(1);
  }
  let status = "success";
  try {
    await rebuildAllRatings({
      db,
      FieldValue,
      logger: console,
      logRatings: shouldLogRatings
    });
    await synchronizeSummariesWithRatingStates({
      db,
      FieldValue,
      logger: console
    });
  } catch (error) {
    status = "error";
    throw error;
  } finally {
    await releaseRebuildLock(db, FieldValue, status);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
