import { describe, expect, it } from "vitest";
import type { ApiClient, HealthResponse } from "../../src/cli/apiClient.js";
import {
  formatHealth,
  runHealthCommand,
} from "../../src/cli/commands/health.js";

const okBody: HealthResponse = {
  status: "ok",
  checks: { database: "up" },
};

const degradedBody: HealthResponse = {
  status: "degraded",
  checks: { database: "down" },
};

function clientWith(
  implementation: ApiClient["getHealth"],
): ApiClient {
  return { getHealth: implementation };
}

describe("runHealthCommand", () => {
  it("returns exit code 0 for a healthy API", async () => {
    const result = await runHealthCommand(
      clientWith(async () => ({ statusCode: 200, body: okBody })),
    );

    expect(result).toEqual({ ok: true, exitCode: 0, body: okBody });
  });

  it("returns exit code 1 when the API is degraded", async () => {
    const result = await runHealthCommand(
      clientWith(async () => ({ statusCode: 503, body: degradedBody })),
    );

    expect(result).toEqual({ ok: true, exitCode: 1, body: degradedBody });
  });

  it("returns the error message when the client fails", async () => {
    const result = await runHealthCommand(
      clientWith(async () => {
        throw new Error("boom");
      }),
    );

    expect(result).toEqual({ ok: false, exitCode: 1, message: "boom" });
  });
});

describe("formatHealth", () => {
  it("formats a healthy result", () => {
    expect(formatHealth(okBody)).toBe("API: ok (database: up)");
  });

  it("formats a degraded result", () => {
    expect(formatHealth(degradedBody)).toBe("API: degraded (database: down)");
  });
});
