export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
      signal: options.signal ?? AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new ApiError("The server took too long to respond. Please try again.", 0);
    }
    throw new ApiError("Could not reach Power Stone. Check your connection and try again.", 0);
  }
  let data: T & { error?: string };
  try {
    data = await response.json();
  } catch {
    throw new ApiError("Power Stone returned an unexpected response. Please reload and try again.", response.status);
  }
  if (!response.ok) throw new ApiError(data.error || "The request could not be completed. Please try again.", response.status);
  return data;
}
