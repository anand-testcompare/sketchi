const DEFAULT_APP_NAME = "sketchi";
const DEFAULT_APP_COMPONENT = "backend";
const DEFAULT_PROD_URL = "https://sketchi.app";
const DEFAULT_DEV_URL = "http://localhost:3001";
const TRAILING_SLASHES_RE = /\/+$/;

function normalizeUrl(url: string): string {
  return url.trim().replace(TRAILING_SLASHES_RE, "");
}

const resolvedEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "dev";

export const envLabel = (() => {
  if (resolvedEnv === "production") {
    return "prod";
  }
  if (resolvedEnv === "development") {
    return "dev";
  }
  return resolvedEnv;
})();

export const appName = process.env.SKETCHI_APP_NAME?.trim() || DEFAULT_APP_NAME;

export const appComponent =
  process.env.SKETCHI_APP_COMPONENT?.trim() || DEFAULT_APP_COMPONENT;

export const appIdentifier = `${appName}/${appComponent}`;

export const appTitle = `${appIdentifier} (${envLabel})`;

export const appUrl = (() => {
  const explicit = process.env.SKETCHI_APP_URL ?? process.env.APP_URL;
  if (explicit) {
    return normalizeUrl(explicit);
  }
  if (process.env.VERCEL_URL) {
    return normalizeUrl(`https://${process.env.VERCEL_URL}`);
  }
  return normalizeUrl(envLabel === "prod" ? DEFAULT_PROD_URL : DEFAULT_DEV_URL);
})();
