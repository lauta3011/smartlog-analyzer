#!/usr/bin/env node
import { Command } from "commander";
import ora from "ora";
import { parseApiUrl, parseCliConfig, type CliConfig } from "../config/cli.js";
import { createApiClient } from "./apiClient.js";
import { formatHealth, runHealthCommand } from "./commands/health.js";

interface GlobalOptions {
  json?: boolean;
  apiUrl?: string;
}

function writeOut(line: string): void {
  process.stdout.write(`${line}\n`);
}

function writeErr(line: string): void {
  process.stderr.write(`${line}\n`);
}

async function runHealth(
  globals: GlobalOptions,
  config: CliConfig,
): Promise<void> {
  let baseUrl: string;

  try {
    baseUrl =
      globals.apiUrl === undefined ? config.apiUrl : parseApiUrl(globals.apiUrl);
  } catch (error) {
    writeErr(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const json = globals.json === true;
  const spinner =
    json || process.stderr.isTTY !== true
      ? undefined
      : ora({ text: "Checking API...", stream: process.stderr }).start();

  const result = await runHealthCommand(createApiClient({ baseUrl }));
  spinner?.stop();

  if (!result.ok) {
    writeErr(result.message);
    process.exitCode = result.exitCode;
    return;
  }

  writeOut(json ? JSON.stringify(result.body) : formatHealth(result.body));
  process.exitCode = result.exitCode;
}

async function main(): Promise<void> {
  let config: CliConfig;

  try {
    config = parseCliConfig(process.env);
  } catch (error) {
    writeErr(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const program = new Command();

  program
    .name("smartlog")
    .description("SmartLog Analyzer CLI")
    .option("--json", "print raw JSON output")
    .option("--api-url <url>", "base URL of the SmartLog API");

  program
    .command("health")
    .description("check that the API and its database are reachable")
    .action(async (_options: unknown, command: Command) => {
      const globals = command.optsWithGlobals<GlobalOptions>();
      await runHealth(globals, config);
    });

  await program.parseAsync(process.argv);
}

void main();
