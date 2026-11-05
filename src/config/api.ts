import { z } from "zod";

const apiConfigSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url(),
});

export interface ApiConfig {
  port: number;
  databaseUrl: string;
}

export function parseApiConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const result = apiConfigSchema.safeParse(env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "env";
        return `${path}: ${issue.message}`;
      })
      .join("; ");

    throw new Error(`Invalid API configuration: ${issues}`);
  }

  return {
    port: result.data.PORT,
    databaseUrl: result.data.DATABASE_URL,
  };
}
