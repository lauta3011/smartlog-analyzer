export interface HealthRepository {
  ping(): Promise<void>;
}

export interface SqlQueryable {
  query(sql: string): Promise<unknown>;
}

export function createHealthRepository(pool: SqlQueryable): HealthRepository {
  return {
    async ping(): Promise<void> {
      await pool.query("SELECT 1");
    },
  };
}
