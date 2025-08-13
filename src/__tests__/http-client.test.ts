import { HttpClient, HttpError } from "src/utils/http";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Minimal fetch response interfaces for typing mocks
interface MockBaseResponse {
  ok:          boolean;
  headers:     { get: (key: string) => string | null };
  status?:     number;
  statusText?: string;
  json?:       () => Promise<unknown>;
}
type FetchMock = ReturnType<typeof vi.fn>;

describe("HttpClient", () => {
  const originalFetch = global.fetch;
  let fetchMock: FetchMock;
  beforeEach(() => {
    fetchMock = vi.fn();
    // override for test (cast)
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });

  it("performs a successful GET returning json", async () => {
    (fetchMock as unknown as { mockResolvedValueOnce: (v: MockBaseResponse) => void }).mockResolvedValueOnce({
      ok:      true,
      headers: { get: (k: string) => (k === "Content-Type" ? "application/json" : null) },
      json:    async () => ({ foo: "bar" }),
    });
    const client = new HttpClient();
    const res = await client.get<{ foo: string }>("https://example.com");
    expect(res).toEqual({ foo: "bar" });
  });

  it("throws HttpError on non-ok response", async () => {
    (fetchMock as unknown as { mockResolvedValueOnce: (v: MockBaseResponse) => void }).mockResolvedValueOnce({
      ok:         false,
      status:     500,
      statusText: "Server Error",
      headers:    { get: () => null },
    });
    const client = new HttpClient();
    await expect(client.get("https://example.com")).rejects.toBeInstanceOf(HttpError);
  });

  it("aborts on timeout", async () => {
    const abortErr = new Error("Aborted");
    Object.defineProperty(abortErr, "name", { value: "AbortError" });
    (fetchMock as unknown as { mockImplementationOnce: (fn: () => Promise<never>) => void }).mockImplementationOnce(
      () => new Promise((_, reject) => setTimeout(() => reject(abortErr), 10)),
    );
    const client = new HttpClient();
    await expect(client.get("https://example.com", { timeout: 1 })).rejects.toBeInstanceOf(HttpError);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });
});
