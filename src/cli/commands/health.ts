import type { ApiClient, HealthResponse } from "../apiClient.js";

export type HealthCommandResult =
  | { ok: true; exitCode: 0 | 1; body: HealthResponse }
  | { ok: false; exitCode: 1; message: string };

export async function runHealthCommand(
  client: ApiClient,
): Promise<HealthCommandResult> {
  try {
    const { body } = await client.getHealth();

    return {
      ok: true,
      exitCode: body.status === "ok" ? 0 : 1,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      exitCode: 1,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function formatHealth(body: HealthResponse): string {
  return `API: ${body.status} (database: ${body.checks.database})`;
}
