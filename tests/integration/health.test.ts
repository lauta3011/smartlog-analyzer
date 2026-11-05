import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import type { HealthResult, HealthService } from "../../src/services/health.service.js";

function appWith(result: HealthResult) {
  const healthService: HealthService = {
    check: async () => result,
  };

  return createApp({ healthService });
}

describe("GET /api/health", () => {
  it("returns 200 when the database is up", async () => {
    const response = await request(
      appWith({ status: "ok", checks: { database: "up" } }),
    )
      .get("/api/health")
      .expect(200);

    expect(response.body).toEqual({
      status: "ok",
      checks: { database: "up" },
    });
  });

  it("returns 503 when the database is down", async () => {
    const response = await request(
      appWith({ status: "degraded", checks: { database: "down" } }),
    )
      .get("/api/health")
      .expect(503);

    expect(response.body).toEqual({
      status: "degraded",
      checks: { database: "down" },
    });
  });
});
