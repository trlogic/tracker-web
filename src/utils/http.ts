/**
 * HTTP utility functions using fetch API
 */

export interface HttpRequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  method?:  "GET" | "POST" | "PUT" | "DELETE";
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class HttpClient {
  private defaultHeaders: Record<string, string>;

  constructor(defaultHeaders: Record<string, string> = {}) {
    this.defaultHeaders = defaultHeaders;
  }

  private async makeRequest<T>(url: string, config: HttpRequestConfig & { body?: unknown } = {}): Promise<T> {
    const { headers = {}, timeout, method = "GET", body } = config;

    const mergedHeaders = { ...this.defaultHeaders, ...headers };

    const controller = new AbortController();
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

    try {
      const fetchConfig: RequestInit = {
        method,
        headers: mergedHeaders,
        signal:  controller.signal,
      };

      if (body && method !== "GET") {
        fetchConfig.body = typeof body === "string" ? body : JSON.stringify(body);
        if (!mergedHeaders["Content-Type"]) {
          mergedHeaders["Content-Type"] = "application/json";
        }
      }

      const response = await fetch(url, fetchConfig);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new HttpError(`HTTP Error: ${response.status} ${response.statusText}`, response.status, response);
      }

      // Handle empty responses
      const contentLength = response.headers.get("Content-Length");
      if (contentLength === "0") {
        return {} as T;
      }

      const contentType = response.headers.get("Content-Type");
      if (contentType?.includes("application/json")) {
        return await response.json();
      }

      return (await response.text()) as unknown as T;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new HttpError("Request timeout", 408);
      }

      throw error;
    }
  }

  async get<T>(url: string, config?: HttpRequestConfig): Promise<T> {
    return this.makeRequest<T>(url, { ...config, method: "GET" });
  }

  async post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<T> {
    return this.makeRequest<T>(url, { ...config, method: "POST", body: data });
  }

  async put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<T> {
    return this.makeRequest<T>(url, { ...config, method: "PUT", body: data });
  }

  async delete<T>(url: string, config?: HttpRequestConfig): Promise<T> {
    return this.makeRequest<T>(url, { ...config, method: "DELETE" });
  }
}
