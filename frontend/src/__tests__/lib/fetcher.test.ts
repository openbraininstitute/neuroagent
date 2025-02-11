import { describe, expect, test, vi, beforeEach } from "vitest";
import { fetcher } from "@/lib/fetcher";
import { env } from "@/lib/env";

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_BACKEND_URL: "http://example.com:1234",
  },
}));

describe("fetcher", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock the global fetch
    global.fetch = vi.fn();
  });

  test("makes a successful GET request", async () => {
    const mockResponse = { data: "test" };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetcher({
      method: "GET",
      path: "/api/test",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://example.com:1234/api/test",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  test("handles path parameters correctly", async () => {
    const mockResponse = { data: "test" };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await fetcher({
      method: "GET",
      path: "/api/test/{id}",
      pathParams: { id: 123 },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://example.com:1234/api/test/123",
      expect.any(Object),
    );
  });

  test("handles query parameters correctly", async () => {
    const mockResponse = { data: "test" };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await fetcher({
      method: "GET",
      path: "/api/test",
      queryParams: { page: 1, limit: 10 },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://example.com:1234/api/test?page=1&limit=10",
      expect.any(Object),
    );
  });

  test("makes a POST request with body", async () => {
    const mockResponse = { data: "test" };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const requestBody = { name: "test" };
    await fetcher({
      method: "POST",
      path: "/api/test",
      body: requestBody,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://example.com:1234/api/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  test("throws error for failed requests", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    });

    await expect(
      fetcher({
        method: "GET",
        path: "/api/test",
      }),
    ).rejects.toThrow("Failed to fetch data");
  });

  test("handles backend URL with path suffix correctly", async () => {
    // Temporarily override just the NEXT_PUBLIC_BACKEND_URL for this test
    vi.mocked(env).NEXT_PUBLIC_BACKEND_URL = "http://example.com:1234/hello";

    const mockResponse = { data: "test" };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await fetcher({
      method: "GET",
      path: "/api/test",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://example.com:1234/hello/api/test",
      expect.objectContaining({
        method: "GET",
      }),
    );

    // Reset the URL back to original
    vi.mocked(env).NEXT_PUBLIC_BACKEND_URL = "http://example.com:1234";
  });
});
