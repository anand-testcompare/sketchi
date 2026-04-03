const DEFAULT_WORKOS_BASE_URL = "https://api.workos.com";
const DEVICE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
const DEFAULT_DEVICE_POLL_INTERVAL_SECONDS = 5;
const TRAILING_SLASH_PATTERN = /\/+$/;

interface WorkOsDeviceStartSuccess {
  device_code: string;
  expires_in: number;
  interval: number;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
}

interface WorkOsTokenSuccess {
  access_token: string;
  expires_in?: number;
  refresh_token: string;
}

interface WorkOsTokenError {
  error: string;
  error_description?: string;
  interval?: number;
}

type WorkOsJsonResponse =
  | WorkOsDeviceStartSuccess
  | WorkOsTokenSuccess
  | WorkOsTokenError;

function normalizeBaseUrl(raw: string): string {
  return raw.replace(TRAILING_SLASH_PATTERN, "");
}

export function resolveWorkOsBaseUrl(): string {
  const raw = process.env.WORKOS_DEVICE_AUTH_BASE_URL?.trim();
  if (raw) {
    return normalizeBaseUrl(raw);
  }
  return DEFAULT_WORKOS_BASE_URL;
}

export function getWorkOsClientId(): string {
  const value = process.env.WORKOS_CLIENT_ID?.trim();
  if (!value) {
    throw new Error("Missing WORKOS_CLIENT_ID for device auth");
  }
  return value;
}

async function parseJsonResponse(
  response: Response
): Promise<WorkOsJsonResponse> {
  const text = await response.text();
  if (!text) {
    throw new Error("Empty WorkOS response");
  }

  try {
    return JSON.parse(text) as WorkOsJsonResponse;
  } catch {
    throw new Error("Invalid WorkOS JSON response");
  }
}

function getErrorMessage(input: {
  fallback: string;
  payload: WorkOsJsonResponse;
}): string {
  if ("error_description" in input.payload && input.payload.error_description) {
    return input.payload.error_description;
  }
  if ("error" in input.payload && input.payload.error) {
    return input.payload.error;
  }
  return input.fallback;
}

export async function startWorkOsDeviceFlow(): Promise<{
  deviceCode: string;
  userCode: string;
  interval: number;
  expiresIn: number;
  verificationUrl: string;
}> {
  const clientId = getWorkOsClientId();
  const response = await fetch(
    `${resolveWorkOsBaseUrl()}/user_management/authorize/device`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
      }),
      cache: "no-store",
    }
  );

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(
      getErrorMessage({
        payload,
        fallback: "Failed to start WorkOS device flow",
      })
    );
  }

  if (
    !(
      "device_code" in payload &&
      "user_code" in payload &&
      "verification_uri" in payload
    )
  ) {
    throw new Error("Unexpected WorkOS device start response");
  }

  return {
    deviceCode: payload.device_code,
    userCode: payload.user_code,
    interval: Math.max(1, payload.interval),
    expiresIn: Math.max(1, payload.expires_in),
    verificationUrl:
      payload.verification_uri_complete ?? payload.verification_uri,
  };
}

export async function pollWorkOsDeviceFlow(input: {
  deviceCode: string;
}): Promise<
  | {
      status: "authorization_pending";
      interval: number;
    }
  | {
      status: "slow_down";
      interval: number;
    }
  | {
      status: "success";
      accessToken: string;
      refreshToken: string;
      accessTokenExpiresAt?: number;
    }
  | {
      status: "expired_token" | "invalid_grant";
    }
> {
  const clientId = getWorkOsClientId();
  const response = await fetch(
    `${resolveWorkOsBaseUrl()}/user_management/authenticate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: DEVICE_GRANT_TYPE,
        client_id: clientId,
        device_code: input.deviceCode,
      }),
      cache: "no-store",
    }
  );

  const payload = await parseJsonResponse(response);
  if (response.ok) {
    if (!("access_token" in payload && "refresh_token" in payload)) {
      throw new Error("Unexpected WorkOS token response");
    }

    const accessTokenExpiresAt =
      typeof payload.expires_in === "number"
        ? Date.now() + Math.max(1, payload.expires_in) * 1000
        : undefined;

    return {
      status: "success",
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      accessTokenExpiresAt,
    };
  }

  if (!("error" in payload)) {
    throw new Error("Unexpected WorkOS token error response");
  }

  const interval =
    typeof payload.interval === "number"
      ? Math.max(1, payload.interval)
      : DEFAULT_DEVICE_POLL_INTERVAL_SECONDS;

  if (payload.error === "authorization_pending") {
    return {
      status: "authorization_pending",
      interval,
    };
  }

  if (payload.error === "slow_down") {
    return {
      status: "slow_down",
      interval,
    };
  }

  if (payload.error === "expired_token") {
    return { status: "expired_token" };
  }

  if (payload.error === "invalid_grant" || payload.error === "access_denied") {
    return { status: "invalid_grant" };
  }

  throw new Error(
    getErrorMessage({
      payload,
      fallback: "Failed to poll WorkOS device flow",
    })
  );
}

export async function refreshWorkOsAccessToken(input: {
  refreshToken: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<
  | {
      status: "success";
      accessToken: string;
      refreshToken: string;
      accessTokenExpiresAt?: number;
    }
  | {
      status: "invalid_grant";
    }
> {
  const clientId = getWorkOsClientId();
  const response = await fetch(
    `${resolveWorkOsBaseUrl()}/user_management/authenticate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: input.refreshToken,
        organization_id: input.organizationId,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
      }),
      cache: "no-store",
    }
  );

  const payload = await parseJsonResponse(response);
  if (response.ok) {
    if (!("access_token" in payload && "refresh_token" in payload)) {
      throw new Error("Unexpected WorkOS refresh response");
    }

    const accessTokenExpiresAt =
      typeof payload.expires_in === "number"
        ? Date.now() + Math.max(1, payload.expires_in) * 1000
        : undefined;

    return {
      status: "success",
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      accessTokenExpiresAt,
    };
  }

  if (
    "error" in payload &&
    (payload.error === "invalid_grant" ||
      payload.error === "access_denied" ||
      payload.error === "expired_token")
  ) {
    return { status: "invalid_grant" };
  }

  throw new Error(
    getErrorMessage({
      payload,
      fallback: "Failed to refresh WorkOS access token",
    })
  );
}
