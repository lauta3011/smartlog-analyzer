import { describe, expect, it, vi } from "vitest";
import {
  CliApiError,
  createApiClient,
  type HealthResponse,
} from "../../src/cli/apiClient.js";

const okBody: HealthResponse = {
  status: "ok",
  checks: { database: "up" },
};

const degradedBody: HealthResponse = {
  status: "degraded",
  checks: { database: "down" },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function clientWith(fetchImpl: () => Promise<Response>) {
  return createApiClient({ baseUrl: "http://localhost:3000", fetchImpl });
}

describe("createApiClient().getHealth", () => {
  it("returns the health body on 200", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(okBody));
    const client = createApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await expect(client.getHealth()).resolves.toEqual({
      statusCode: 200,
      body: okBody,
    });
    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:3000/api/health");
  });

  it("normalizes a trailing slash in the base URL", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(okBody));
    const client = createApiClient({
      baseUrl: "http://localhost:3000/",
      fetchImpl,
    });

    await client.getHealth();

    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:3000/api/health");
  });

  it("returns the degraded body on 503", async () => {
    const client = clientWith(async () => jsonResponse(degradedBody, 503));

    await expect(client.getHealth()).resolves.toEqual({
      statusCode: 503,
      body: degradedBody,
    });
  });

  it("wraps network failures", async () => {
    const client = clientWith(async () => {
      throw new Error("ECONNREFUSED");
    });

    await expect(client.getHealth()).rejects.toMatchObject({
      code: "API_UNREACHABLE",
      message: "Cannot reach API at http://localhost:3000: ECONNREFUSED",
    });
  });

  it("rejects a malformed body", async () => {
    const client = clientWith(async () => jsonResponse({ status: "ok" }));

    await expect(client.getHealth()).rejects.toBeInstanceOf(CliApiError);
    await expect(client.getHealth()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("rejects a non-JSON response", async () => {
    const client = clientWith(
      async () => new Response("<html>not found</html>", { status: 404 }),
    );

    await expect(client.getHealth()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      message: "API returned a non-JSON response (HTTP 404)",
    });
  });

  it("surfaces the API error shape", async () => {
    const client = clientWith(async () =>
      jsonResponse(
        {
          error: {
            code: "NOT_FOUND",
            message: "Route not found",
            details: null,
          },
        },
        404,
      ),
    );

    await expect(client.getHealth()).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Route not found",
    });
  });
});
