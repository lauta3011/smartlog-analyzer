import { describe, expect, it, vi } from "vitest";
import { createHealthService } from "../../src/services/health.service.js";

describe("createHealthService", () => {
  it("reports the database as up when the ping succeeds", async () => {
    const ping = vi.fn().mockResolvedValue(undefined);
    const service = createHealthService({ ping });

    await expect(service.check()).resolves.toEqual({
      status: "ok",
      checks: { database: "up" },
    });
    expect(ping).toHaveBeenCalledOnce();
  });

  it("reports the database as down when the ping fails", async () => {
    const ping = vi.fn().mockRejectedValue(new Error("connection refused"));
    const service = createHealthService({ ping });

    await expect(service.check()).resolves.toEqual({
      status: "degraded",
      checks: { database: "down" },
    });
  });
});
