const fs = require("fs");
const path = require("path");
const readline = require("readline");
const admin = require("firebase-admin");
const dotenv = require("dotenv");

const DEFAULT_SERVICE_ACCOUNT = "serviceAccountKey.json";
const DEFAULT_EMULATOR_PROJECT_FALLBACK = "demo-project";
const DEFAULT_CALLABLE_SERVICE_UID =
  process.env.FIREBASE_CALLABLE_SERVICE_UID || "cli-service-account";

let envLoaded = false;
let cachedCallableToken = null;

function loadEnv() {
  if (envLoaded) {
    return;
  }

  dotenv.config();

  const nodeEnv = process.env.NODE_ENV || "development";
  const candidates = [".env.local", `.env.${nodeEnv}`, `.env.${nodeEnv}.local`];

  candidates.forEach(file => {
    const resolved = path.resolve(file);
    if (fs.existsSync(resolved)) {
      dotenv.config({ path: resolved });
    }
  });

  envLoaded = true;
}

function resolveProjectId() {
  loadEnv();
  return (
    process.env.FIREBASE_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    null
  );
}

function resolveEmulatorProject() {
  return resolveProjectId() || DEFAULT_EMULATOR_PROJECT_FALLBACK;
}

function resolveServiceAccountPath() {
  loadEnv();

  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) {
    return path.resolve(envPath);
  }

  const localPath = path.resolve(DEFAULT_SERVICE_ACCOUNT);
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  return null;
}

function readServiceAccount() {
  const credentialPath = resolveServiceAccountPath();
  if (!credentialPath) {
    return null;
  }

  const raw = fs.readFileSync(credentialPath, "utf8");
  return JSON.parse(raw);
}

function shouldUseEmulator(options = {}) {
  if (typeof options.useEmulator === "boolean") {
    return options.useEmulator;
  }
  if (options.target === "auth") {
    return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  }
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

function initializeFirebaseApp(options = {}) {
  loadEnv();

  if (admin.apps.length) {
    const app = admin.app();
    return {
      app,
      projectId: app.options.projectId || resolveProjectId(),
      usingEmulator: shouldUseEmulator(options),
      credential: null,
      serviceAccount: null
    };
  }

  const usingEmulator = shouldUseEmulator(options);
  let credential = null;
  let serviceAccount = null;
  let projectId = null;

  if (usingEmulator) {
    projectId = options.projectId || resolveEmulatorProject();
    admin.initializeApp({ projectId });
  } else {
    serviceAccount = readServiceAccount();
    if (!serviceAccount) {
      throw new Error(
        "Service account key not found. Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json."
      );
    }
    credential = admin.credential.cert(serviceAccount);
    projectId = serviceAccount.project_id;
    admin.initializeApp({
      credential,
      projectId
    });
  }

  return {
    app: admin.app(),
    projectId,
    credential,
    serviceAccount,
    usingEmulator
  };
}

function shouldSkipProductionConfirmation() {
  const flag = (process.env.SKIP_PRODUCTION_CONFIRMATION || "").toLowerCase();
  return ["1", "true", "yes"].includes(flag);
}

async function promptForConfirmation({ message, confirmText = "yes" } = {}) {
  if (shouldSkipProductionConfirmation()) {
    return true;
  }

  if (!process.stdin.isTTY) {
    console.error(
      "STDIN is not interactive; aborting because production confirmation cannot be obtained. Set SKIP_PRODUCTION_CONFIRMATION=true to override."
    );
    return false;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    rl.question(message, input => {
      rl.close();
      resolve((input || "").trim());
    });
  });

  return answer.toLowerCase() === confirmText.toLowerCase();
}

async function ensureProductionConsent({
  usingEmulator,
  projectId,
  scriptName,
  confirmText = "yes",
  customMessage
} = {}) {
  if (usingEmulator) {
    return true;
  }

  const resolvedScriptName =
    scriptName || path.basename(process.argv[1] || "script");
  const resolvedProjectId = projectId || resolveProjectId() || "unknown";
  const message =
    customMessage ||
    `警告: ${resolvedScriptName} は Firebase プロジェクト "${resolvedProjectId}" の本番環境に接続します。\n続行する場合は "${confirmText}" と入力してください: `;

  const confirmed = await promptForConfirmation({
    message,
    confirmText
  });

  return confirmed;
}

module.exports = {
  loadEnv,
  initializeFirebaseApp,
  resolveProjectId,
  resolveServiceAccountPath,
  readServiceAccount,
  ensureProductionConsent,
  async getCallableAuthToken({
    credential,
    projectId,
    serviceUid = DEFAULT_CALLABLE_SERVICE_UID,
    claims = { admin: true },
    apiKey: explicitApiKey
  } = {}) {
    if (!credential) {
      throw new Error(
        "Service account credential is required to authenticate callable functions in production."
      );
    }

    const apiKey =
      explicitApiKey ||
      process.env.FIREBASE_WEB_API_KEY ||
      process.env.REACT_APP_FIREBASE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Set FIREBASE_WEB_API_KEY (or REACT_APP_FIREBASE_API_KEY) for callable function authentication."
      );
    }

    const now = Date.now();
    if (
      cachedCallableToken &&
      cachedCallableToken.serviceUid === serviceUid &&
      cachedCallableToken.apiKey === apiKey &&
      cachedCallableToken.projectId === projectId &&
      cachedCallableToken.expiresAt - 60 * 1000 > now
    ) {
      return cachedCallableToken.idToken;
    }

    const customToken = await admin
      .auth()
      .createCustomToken(serviceUid, { ...claims });

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true
        })
      }
    );

    const json = await response.json();
    if (!response.ok) {
      const message =
        json?.error?.message ||
        `Failed to exchange custom token (HTTP ${response.status})`;
      throw new Error(message);
    }

    const expiresInMs = Number(json.expiresIn || 3600) * 1000;
    cachedCallableToken = {
      idToken: json.idToken,
      refreshToken: json.refreshToken,
      expiresAt: now + expiresInMs,
      serviceUid,
      apiKey,
      projectId
    };

    return json.idToken;
  },
  DEFAULT_SERVICE_ACCOUNT
};
