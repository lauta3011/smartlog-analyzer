import { z } from "zod";

const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.object({
    database: z.enum(["up", "down"]),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface HealthResult {
  statusCode: number;
  body: HealthResponse;
}

export interface ApiClient {
  getHealth(): Promise<HealthResult>;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: FetchLike;
}

export class CliApiError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "CliApiError";
    this.code = code;
  }
}

export function createApiClient({
  baseUrl,
  fetchImpl = fetch,
}: ApiClientOptions): ApiClient {
  const healthUrl = `${baseUrl.replace(/\/+$/, "")}/api/health`;

  return {
    async getHealth(): Promise<HealthResult> {
      let response: Response;

      try {
        response = await fetchImpl(healthUrl);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new CliApiError(
          `Cannot reach API at ${baseUrl}: ${reason}`,
          "API_UNREACHABLE",
        );
      }

      let payload: unknown;

      try {
        payload = await response.json();
      } catch {
        throw new CliApiError(
          `API returned a non-JSON response (HTTP ${response.status})`,
          "INVALID_RESPONSE",
        );
      }

      const health = healthResponseSchema.safeParse(payload);

      if (health.success && (response.ok || response.status === 503)) {
        return { statusCode: response.status, body: health.data };
      }

      const apiError = apiErrorSchema.safeParse(payload);

      if (apiError.success) {
        throw new CliApiError(apiError.data.error.message, apiError.data.error.code);
      }

      throw new CliApiError(
        `Unexpected response from API (HTTP ${response.status})`,
        "INVALID_RESPONSE",
      );
    },
  };
}
