import { z } from "zod";

const DEFAULT_API_URL = "http://localhost:3000";

const cliConfigSchema = z.object({
  SMARTLOG_API_URL: z.url().default(DEFAULT_API_URL),
});

export interface CliConfig {
  apiUrl: string;
}

function withoutTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}

export function parseApiUrl(value: string): string {
  const result = z.url().safeParse(value);

  if (!result.success) {
    throw new Error(`Invalid API URL: ${value}`);
  }

  return withoutTrailingSlashes(result.data);
}

export function parseCliConfig(env: NodeJS.ProcessEnv): CliConfig {
  const result = cliConfigSchema.safeParse(env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "env";
        return `${path}: ${issue.message}`;
      })
      .join("; ");

    throw new Error(`Invalid CLI configuration: ${issues}`);
  }

  return {
    apiUrl: withoutTrailingSlashes(result.data.SMARTLOG_API_URL),
  };
}
