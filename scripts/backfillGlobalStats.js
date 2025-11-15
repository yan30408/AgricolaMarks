#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const DEFAULT_SERVICE_ACCOUNT = "serviceAccountKey.json";
const DEFAULT_GAME_MODE = "classic";

function loadEnvFiles() {
  dotenv.config();
  const envLocal = path.resolve(".env.local");
  if (fs.existsSync(envLocal)) {
    dotenv.config({ path: envLocal });
  }
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

  const credentialPath = resolveServiceAccount();
  const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

function emptyRankCounts() {
  return {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0
  };
}

function emptyOrderBucket() {
  return {
    plays: 0,
    wins: 0,
    rankCounts: emptyRankCounts()
  };
}

function emptyOrderHistogram() {
  const histogram = {};
  for (let order = 0; order < 5; order += 1) {
    histogram[String(order)] = emptyOrderBucket();
  }
  histogram.unknown = emptyOrderBucket();
  return histogram;
}

function normalizeGameMode(value) {
  if (!value) {
    return DEFAULT_GAME_MODE;
  }
  const raw = String(value).trim();
  if (!raw) {
    return DEFAULT_GAME_MODE;
  }
  const lower = raw.toLowerCase();
  switch (lower) {
    case "classic":
    case "classics":
      return "classic";
    case "classic-moor":
    case "classic_moor":
    case "classic moor":
    case "classic+moor":
    case "classicmoor":
      return "classicMoor";
    case "revised":
    case "revised-base":
    case "revised base":
      return "revised";
    case "revised-moor":
    case "revised_moor":
    case "revised moor":
    case "revised+moor":
    case "revisedmoor":
      return "revisedMoor";
    default:
      return raw;
  }
}

function normalizeRank(rank) {
  const value = Number(rank);
  if (!Number.isFinite(value) || value <= 0) {
    return "5";
  }
  if (value > 5) {
    return "5";
  }
  return String(Math.round(value));
}

function normalizeOrder(order) {
  if (Number.isInteger(order) && order >= 0 && order < 5) {
    return String(order);
  }
  return "unknown";
}

function calculateRanks(players) {
  const sorted = [...players].sort((a, b) => {
    const aScore = a?.score?.total || 0;
    const bScore = b?.score?.total || 0;
    return bScore - aScore;
  });

  const rankMap = new Map();
  let currentRank = 1;
  let previousScore = null;

  sorted.forEach((player, index) => {
    const score = player?.score?.total || 0;
    if (previousScore !== null && score < previousScore) {
      currentRank = index + 1;
    }
    rankMap.set(player.uid, currentRank);
    previousScore = score;
  });

  return rankMap;
}

function buildEntries(resultId, snapshot) {
  const players = Array.isArray(snapshot.results)
    ? snapshot.results
    : Array.isArray(snapshot.players)
    ? snapshot.players
    : [];
  const participantCount = players.length;
  const matchDate = snapshot.playedAt || snapshot.date || null;
  const gameMode = normalizeGameMode(snapshot.gameMode);

  const rankMap = calculateRanks(players);

  return players
    .filter(player => player && player.uid)
    .map((player, index) => ({
      resultId,
      uid: player.uid,
      rank: rankMap.get(player.uid) || index + 1,
      order: Number.isInteger(player.order) ? player.order : null,
      score: player.score?.total || 0,
      color: player.color || null,
      playedAt: matchDate,
      participantCount,
      gameMode
    }));
}

async function main() {
  loadEnvFiles();
  initializeFirebase();

  const db = admin.firestore();
  const snapshot = await db.collection("results").get();
  console.log(`Processing ${snapshot.size} result documents...`);

  let matchCount = 0;
  const orderHistogram = emptyOrderHistogram();

  snapshot.forEach(doc => {
    const data = doc.data() || {};
    const entries = buildEntries(doc.id, data);
    const relevant = entries.filter(entry => {
      return (
        entry.gameMode === DEFAULT_GAME_MODE &&
        Number(entry.participantCount) === 5
      );
    });

    if (!relevant.length) {
      return;
    }

    matchCount += 1;

    relevant.forEach(entry => {
      const orderKey = normalizeOrder(entry.order);
      const bucket = orderHistogram[orderKey] || emptyOrderBucket();
      bucket.plays += 1;
      if (entry.rank === 1) {
        bucket.wins += 1;
      }
      const counts = bucket.rankCounts || emptyRankCounts();
      const rankKey = normalizeRank(entry.rank);
      counts[rankKey] = (counts[rankKey] || 0) + 1;
      bucket.rankCounts = counts;
      orderHistogram[orderKey] = bucket;
    });
  });

  await db.doc("stats/global").set({
    matchCount,
    orderHistogram,
    type: "summary",
    updatedAt: FieldValue.serverTimestamp()
  });

  console.log(`Global stats updated. Matches counted: ${matchCount}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
