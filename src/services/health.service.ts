import type { HealthRepository } from "../repositories/health.repository.js";

export type HealthResult =
  | { status: "ok"; checks: { database: "up" } }
  | { status: "degraded"; checks: { database: "down" } };

export interface HealthService {
  check(): Promise<HealthResult>;
}

export function createHealthService(repository: HealthRepository): HealthService {
  return {
    async check(): Promise<HealthResult> {
      try {
        await repository.ping();
        return { status: "ok", checks: { database: "up" } };
      } catch {
        return { status: "degraded", checks: { database: "down" } };
      }
    },
  };
}
