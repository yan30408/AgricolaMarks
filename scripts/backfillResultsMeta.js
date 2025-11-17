#!/usr/bin/env node
/* eslint-disable no-console */

const admin = require("firebase-admin");
const {
  loadEnv,
  initializeFirebaseApp,
  ensureProductionConsent
} = require("./shared/firebaseSetup");

loadEnv();

const DEFAULT_GAME_MODE = "classic";

async function main() {
  const { usingEmulator, projectId } = initializeFirebaseApp();
  const confirmed = await ensureProductionConsent({
    usingEmulator,
    projectId,
    scriptName: "backfillResultsMeta"
  });
  if (!confirmed) {
    console.log("確認が取れなかったため処理を中断します。");
    return;
  }
  if (usingEmulator) {
    console.log("Firestore emulator detected; using emulator credentials.");
  }

  const db = admin.firestore();
  const resultsRef = db.collection("results");
  const metrics = { reads: 0, writes: 0, deletes: 0 };

  const snapshot = await resultsRef.get();
  metrics.reads += snapshot.size;
  console.log(`Processing ${snapshot.size} result documents...`);

  const updates = [];
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const UPDATE_BATCH_SIZE = 50;
  const LOG_INTERVAL = 50;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const date = data.date;
    const playedAt = data.playedAt || date || null;
    const participantCount = Array.isArray(data.results)
      ? data.results.length
      : 0;

    const payload = {};
    if (!playedAt) {
      console.warn(`Missing date on result ${doc.id}; skipping.`);
      skippedCount += 1;
      continue;
    }

    const shouldUpdatePlayedAt =
      !data.playedAt ||
      data.playedAt.seconds !== playedAt.seconds ||
      data.playedAt.nanoseconds !== playedAt.nanoseconds;
    const shouldUpdateParticipantCount =
      (data.participantCount || 0) !== participantCount;

    if (shouldUpdatePlayedAt) {
      payload.playedAt = playedAt;
    }
    if (shouldUpdateParticipantCount) {
      payload.participantCount = participantCount;
    }

    if (!data.gameMode) {
      payload.gameMode = DEFAULT_GAME_MODE;
    }

    if (Object.keys(payload).length === 0) {
      skippedCount += 1;
      continue;
    }

    payload.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    updates.push({ ref: doc.ref, payload });
  }

  console.log(`Queued ${updates.length} updates, skipping ${skippedCount}.`);

  for (let index = 0; index < updates.length; index += UPDATE_BATCH_SIZE) {
    const batch = updates.slice(index, index + UPDATE_BATCH_SIZE);
    for (const { ref, payload } of batch) {
      try {
        await ref.update(payload);
        updatedCount += 1;
        metrics.writes += 1;
      } catch (error) {
        failedCount += 1;
        console.error(`Update failed for ${ref.path}:`, error);
      }

      if (
        updatedCount % LOG_INTERVAL === 0 ||
        updatedCount + failedCount === updates.length
      ) {
        console.log(
          `Updated ${updatedCount}/${updates.length} documents... (failed: ${failedCount})`
        );
      }
    }
  }

  console.log(
    `Backfill finished. Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`
  );
  console.log(
    `Firestore usage (estimated): reads=${metrics.reads}, writes=${metrics.writes}, deletes=${metrics.deletes}`
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
