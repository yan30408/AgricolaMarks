#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

dotenv.config();
const envLocal = path.resolve(".env.local");
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
}

const DEFAULT_SERVICE_ACCOUNT = "serviceAccountKey.json";
const DEFAULT_EMULATOR_PROJECT =
  process.env.FIREBASE_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "demo-project";

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

const DEFAULT_GAME_MODE = "classic";

async function main() {
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (usingEmulator) {
    admin.initializeApp({
      projectId: DEFAULT_EMULATOR_PROJECT
    });
    console.log("Firestore emulator detected; using emulator credentials.");
  } else {
    const credentialPath = resolveServiceAccount();
    const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, "utf8"));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }

  const db = admin.firestore();
  const resultsRef = db.collection("results");

  const snapshot = await resultsRef.get();
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
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
