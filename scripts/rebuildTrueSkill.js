#!/usr/bin/env node
/* eslint-disable no-console */

const admin = require("firebase-admin");
const { rebuildAllRatings } = require("../functions/lib/rebuildAll");
const {
  synchronizeSummariesWithRatingStates
} = require("../functions/lib/synchronizeSummaries");
const {
  loadEnv,
  initializeFirebaseApp,
  ensureProductionConsent
} = require("./shared/firebaseSetup");

loadEnv();

const cliArgs = process.argv.slice(2);
const shouldLogRatings = cliArgs.includes("--log") || cliArgs.includes("-l");

async function acquireRebuildLock(
  db,
  FieldValue,
  reason,
  resultId = null,
  metrics = null
) {
  const lockRef = db.collection("meta").doc("ratingLock");
  try {
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(lockRef);
      if (metrics) {
        metrics.reads += 1;
      }
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
      if (metrics) {
        metrics.writes += 1;
      }
    });
    return true;
  } catch (error) {
    if (error.message === "LOCKED") {
      return false;
    }
    throw error;
  }
}

async function releaseRebuildLock(db, FieldValue, status, metrics = null) {
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
  if (metrics) {
    metrics.writes += 1;
  }
}

async function main() {
  const { usingEmulator, projectId } = initializeFirebaseApp();
  const confirmed = await ensureProductionConsent({
    usingEmulator,
    projectId,
    scriptName: "rebuildTrueSkill"
  });
  if (!confirmed) {
    console.log("確認が取れなかったため処理を中断します。");
    return;
  }
  if (usingEmulator) {
    console.log("Firestore emulator detected; using emulator credentials.");
  }
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;
  const metrics = { reads: 0, writes: 0, deletes: 0 };
  const acquired = await acquireRebuildLock(
    db,
    FieldValue,
    "manual-cli-rebuild",
    null,
    metrics
  );
  if (!acquired) {
    console.error(
      "Rating rebuild is already running (meta/ratingLock.locked = true). Aborting."
    );
    console.log(
      `Firestore usage (estimated): reads=${metrics.reads}, writes=${metrics.writes}, deletes=${metrics.deletes}`
    );
    process.exit(1);
  }
  let status = "success";
  try {
    await rebuildAllRatings({
      db,
      FieldValue,
      logger: console,
      logRatings: shouldLogRatings,
      metrics
    });
    await synchronizeSummariesWithRatingStates({
      db,
      FieldValue,
      logger: console,
      metrics
    });
  } catch (error) {
    status = "error";
    throw error;
  } finally {
    await releaseRebuildLock(db, FieldValue, status, metrics);
    console.log(
      `Firestore usage (estimated): reads=${metrics.reads}, writes=${metrics.writes}, deletes=${metrics.deletes}`
    );
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
