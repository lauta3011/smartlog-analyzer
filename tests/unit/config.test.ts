import { describe, expect, it } from "vitest";
import { parseApiConfig } from "../../src/config/api.js";

describe("parseApiConfig", () => {
  it("applies defaults", () => {
    const config = parseApiConfig({
      DATABASE_URL: "postgres://user:pass@localhost:5432/smartlog",
    });

    expect(config).toEqual({
      port: 3000,
      databaseUrl: "postgres://user:pass@localhost:5432/smartlog",
    });
  });

  it("parses the configured port", () => {
    const config = parseApiConfig({
      PORT: "8080",
      DATABASE_URL: "postgres://user:pass@db:5432/smartlog",
    });

    expect(config.port).toBe(8080);
  });

  it("fails when DATABASE_URL is missing", () => {
    expect(() => parseApiConfig({})).toThrow(/DATABASE_URL/);
  });

  it("fails on an invalid port", () => {
    expect(() =>
      parseApiConfig({
        PORT: "0",
        DATABASE_URL: "postgres://user:pass@localhost:5432/smartlog",
      }),
    ).toThrow(/PORT/);
  });

  it("fails on a non-url DATABASE_URL", () => {
    expect(() => parseApiConfig({ DATABASE_URL: "not-a-url" })).toThrow(/DATABASE_URL/);
  });
});
