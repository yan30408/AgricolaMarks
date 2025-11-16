const { conservativeRating } = require("./trueskill");

async function synchronizeSummariesWithRatingStates({
  db,
  FieldValue,
  logger,
  metrics: externalMetrics = null
}) {
  const log = logger || console;
  const metrics = externalMetrics || { reads: 0, writes: 0, deletes: 0 };
  log.info("Synchronizing stats summaries with rating states...");
  let processed = 0;
  let withoutSummary = 0;
  let updated = 0;
  let unchanged = 0;

  const usersSnapshot = await db.collection("users").get();
  metrics.reads += usersSnapshot.size;
  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    const summaryRef = db
      .collection("users")
      .doc(uid)
      .collection("statsSummary")
      .doc("modes");
    const summarySnapshot = await summaryRef.get();
    metrics.reads += 1;
    if (!summarySnapshot.exists) {
      withoutSummary += 1;
      continue;
    }
    const summaryData = summarySnapshot.data() || {};
    const modes =
      summaryData.modes && typeof summaryData.modes === "object"
        ? { ...summaryData.modes }
        : null;
    if (!modes || Object.keys(modes).length === 0) {
      unchanged += 1;
      continue;
    }
    processed += 1;

    const ratingStatesSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("ratingStates")
      .get();
    metrics.reads += ratingStatesSnapshot.size;

    const ratingStatesMap = new Map();
    ratingStatesSnapshot.docs.forEach(doc => {
      ratingStatesMap.set(doc.id, doc.data() || {});
    });

    let changed = false;
    Object.entries(modes).forEach(([modeKey, modeSummary]) => {
      const state = ratingStatesMap.get(modeKey);
      if (state && Number.isFinite(state.mu) && Number.isFinite(state.sigma)) {
        const nextRating = conservativeRating(state.mu, state.sigma);
        const nextSigma = state.sigma;
        const summaryRating =
          typeof modeSummary?.rating === "number" &&
          Number.isFinite(modeSummary.rating)
            ? modeSummary.rating
            : null;
        const summarySigma =
          typeof modeSummary?.sigma === "number" &&
          Number.isFinite(modeSummary.sigma)
            ? modeSummary.sigma
            : null;
        if (summaryRating !== nextRating || summarySigma !== nextSigma) {
          log.debug?.("Synchronizing stats summary rating", {
            uid,
            mode: modeKey,
            summaryRating,
            summarySigma,
            stateMu: state.mu,
            stateSigma: state.sigma,
            nextRating,
            nextSigma
          });
          modes[modeKey] = {
            ...modeSummary,
            rating: nextRating,
            sigma: nextSigma,
            updatedAt: FieldValue.serverTimestamp()
          };
          changed = true;
        }
      } else {
        const hadRating =
          modeSummary &&
          modeSummary.rating !== null &&
          modeSummary.rating !== undefined;
        const hadSigma =
          modeSummary &&
          modeSummary.sigma !== null &&
          modeSummary.sigma !== undefined;
        if (hadRating || hadSigma) {
          log.debug?.("Clearing stats summary rating due to missing state", {
            uid,
            mode: modeKey,
            summaryRating: modeSummary?.rating ?? null,
            summarySigma: modeSummary?.sigma ?? null
          });
          modes[modeKey] = {
            ...modeSummary,
            rating: null,
            sigma: null,
            updatedAt: FieldValue.serverTimestamp()
          };
          changed = true;
        }
      }
    });

    if (changed) {
      await summaryRef.set(
        {
          modes,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      metrics.writes += 1;
      updated += 1;
      log.debug?.("Updated stats summary to reflect rating states", {
        uid,
        updatedModes: Object.keys(modes)
      });
    } else {
      unchanged += 1;
    }
  }
  log.info("synchronizeAllSummariesWithRatingStates completed", {
    processed,
    updated,
    withoutSummary,
    unchanged
  });
  if (!externalMetrics) {
    log.info(
      `Firestore usage (estimated): reads=${metrics.reads}, writes=${metrics.writes}, deletes=${metrics.deletes}`
    );
  }
  return metrics;
}

module.exports = {
  synchronizeSummariesWithRatingStates
};
