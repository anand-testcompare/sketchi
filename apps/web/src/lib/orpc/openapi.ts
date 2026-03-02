import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { appRouter } from "./router";

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

let cachedSpec: unknown | null = null;

function withDeviceAuthPaths(spec: unknown): unknown {
  if (!(spec && typeof spec === "object")) {
    return spec;
  }

  const document = spec as {
    components?: {
      schemas?: Record<string, unknown>;
      [key: string]: unknown;
    };
    info?: {
      description?: string;
      [key: string]: unknown;
    };
    paths?: Record<string, unknown>;
    tags?: Record<string, unknown>[];
    [key: string]: unknown;
  };

  const schemas = {
    ...(document.components?.schemas ?? {}),
    DeviceAuthStartResponse: {
      type: "object",
      required: [
        "deviceCode",
        "userCode",
        "interval",
        "expiresIn",
        "verificationUrl",
      ],
      properties: {
        deviceCode: { type: "string" },
        userCode: {
          type: "string",
          description: "8-char user code shown to the user (e.g. ABCD-EFGH).",
        },
        interval: {
          type: "integer",
          minimum: 1,
          description: "Polling interval in seconds.",
        },
        expiresIn: {
          type: "integer",
          minimum: 1,
          description: "Device code expiry in seconds.",
        },
        verificationUrl: {
          type: "string",
          format: "uri",
          description:
            "Browser URL where user signs in and approves the device code.",
        },
      },
      additionalProperties: false,
    },
    DeviceAuthTokenRequest: {
      type: "object",
      required: ["deviceCode"],
      properties: {
        deviceCode: { type: "string" },
      },
      additionalProperties: false,
    },
    DeviceAuthTokenPendingResponse: {
      type: "object",
      required: ["status", "interval"],
      properties: {
        status: { type: "string", enum: ["authorization_pending"] },
        interval: { type: "integer", minimum: 1 },
      },
      additionalProperties: false,
    },
    DeviceAuthTokenSlowDownResponse: {
      type: "object",
      required: ["status", "interval"],
      properties: {
        status: { type: "string", enum: ["slow_down"] },
        interval: { type: "integer", minimum: 1 },
      },
      additionalProperties: false,
    },
    DeviceAuthTokenSuccessResponse: {
      type: "object",
      required: ["status", "accessToken"],
      properties: {
        status: { type: "string", enum: ["success"] },
        accessToken: { type: "string" },
        accessTokenExpiresAt: {
          type: "integer",
          description:
            "Unix ms timestamp when returned token expires, when available.",
        },
      },
      additionalProperties: false,
    },
    DeviceAuthTokenInvalidGrantResponse: {
      type: "object",
      required: ["status"],
      properties: {
        status: { type: "string", enum: ["invalid_grant"] },
      },
      additionalProperties: false,
    },
    DeviceAuthTokenExpiredResponse: {
      type: "object",
      required: ["status"],
      properties: {
        status: { type: "string", enum: ["expired_token"] },
      },
      additionalProperties: false,
    },
    DeviceAuthErrorResponse: {
      type: "object",
      required: ["error"],
      properties: {
        error: { type: "string" },
      },
      additionalProperties: false,
    },
  } satisfies Record<string, unknown>;

  const existingTags = document.tags ?? [];
  const hasDeviceTag = existingTags.some((tag) => tag.name === "Device Auth");
  const tags = hasDeviceTag
    ? existingTags
    : [
        ...existingTags,
        {
          name: "Device Auth",
          description:
            "OpenCode CLI device authorization flow backed by WorkOS OAuth Device Authorization.",
        },
      ];

  const devicePaths = {
    "/auth/device/start": {
      post: {
        tags: ["Device Auth"],
        summary: "Start device authorization flow",
        description:
          "Starts OpenCode device auth and returns user/device codes plus verification URL. This endpoint does not require user bearer auth.",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
              },
              example: {},
            },
          },
        },
        responses: {
          200: {
            description: "Device authorization started.",
            headers: {
              "x-trace-id": {
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DeviceAuthStartResponse",
                },
              },
            },
          },
          500: {
            description: "Failed to start device flow.",
            headers: {
              "x-trace-id": {
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DeviceAuthErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/auth/device/token": {
      post: {
        tags: ["Device Auth"],
        summary: "Poll device authorization token",
        description:
          "Polls device auth status. Returns pending/slow_down/success/invalid_grant/expired_token. On success, returns a bearer token for protected diagram APIs.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DeviceAuthTokenRequest" },
              example: {
                deviceCode:
                  "677c536db3f82c227c496c46bb230fe401b323f57f13d274f7e1fd40dc58aeb8",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Polling result.",
            headers: {
              "x-trace-id": {
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      $ref: "#/components/schemas/DeviceAuthTokenPendingResponse",
                    },
                    {
                      $ref: "#/components/schemas/DeviceAuthTokenSlowDownResponse",
                    },
                    {
                      $ref: "#/components/schemas/DeviceAuthTokenSuccessResponse",
                    },
                    {
                      $ref: "#/components/schemas/DeviceAuthTokenInvalidGrantResponse",
                    },
                    {
                      $ref: "#/components/schemas/DeviceAuthTokenExpiredResponse",
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: "Invalid request payload.",
            headers: {
              "x-trace-id": {
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DeviceAuthErrorResponse",
                },
              },
            },
          },
          500: {
            description: "Failed to poll device flow.",
            headers: {
              "x-trace-id": {
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DeviceAuthErrorResponse",
                },
              },
            },
          },
        },
      },
    },
  } satisfies Record<string, unknown>;

  const existingDescription = document.info?.description ?? "";
  const notes = [
    existingDescription,
    "Device auth endpoints are included for CLI integrations (`/auth/device/start`, `/auth/device/token`).",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ...document,
    info: {
      ...(document.info ?? {}),
      description: notes,
    },
    tags,
    components: {
      ...(document.components ?? {}),
      schemas,
    },
    paths: {
      ...(document.paths ?? {}),
      ...devicePaths,
    },
  };
}

export async function getOpenApiSpec() {
  if (cachedSpec) {
    return cachedSpec;
  }

  const generatedSpec = await generator.generate(appRouter, {
    info: {
      title: "Sketchi Diagram API",
      version: "1.0.0",
      description: "Generate, modify, parse, and share Excalidraw diagrams.",
    },
    servers: [{ url: "/api" }],
  });
  cachedSpec = withDeviceAuthPaths(generatedSpec);

  return cachedSpec;
}
