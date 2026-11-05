import { describe, expect, it } from "vitest";
import { parseApiUrl, parseCliConfig } from "../../src/config/cli.js";

describe("parseCliConfig", () => {
  it("defaults to localhost", () => {
    expect(parseCliConfig({})).toEqual({
      apiUrl: "http://localhost:3000",
    });
  });

  it("uses SMARTLOG_API_URL", () => {
    expect(
      parseCliConfig({ SMARTLOG_API_URL: "http://api.internal:8080" }),
    ).toEqual({
      apiUrl: "http://api.internal:8080",
    });
  });

  it("removes trailing slashes", () => {
    expect(
      parseCliConfig({ SMARTLOG_API_URL: "http://api.internal:8080/" }),
    ).toEqual({
      apiUrl: "http://api.internal:8080",
    });
  });

  it("fails on an invalid URL", () => {
    expect(() =>
      parseCliConfig({ SMARTLOG_API_URL: "not-a-url" }),
    ).toThrow(/SMARTLOG_API_URL/);
  });
});

describe("parseApiUrl", () => {
  it("validates and normalizes the URL", () => {
    expect(parseApiUrl("http://localhost:3000/")).toBe("http://localhost:3000");
  });

  it("fails on an invalid URL", () => {
    expect(() => parseApiUrl("not-a-url")).toThrow("Invalid API URL: not-a-url");
  });
});
