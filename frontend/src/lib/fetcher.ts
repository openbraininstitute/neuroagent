import { env } from "@/lib/env";
import { CustomError, SharedState } from "@/lib/types";

const isServer = typeof window === "undefined";

type Method = "GET" | "PATCH" | "POST" | "PUT" | "DELETE";
type Path = string;
type PathParams = Record<string, string | number | boolean>;
type QueryParams = Record<string, string | number | boolean>;
type Headers = Record<string, string>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any> | SharedState;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResponseBody = Record<string, any> | string;

export type FetcherConfig = {
  method?: Method;
  path: Path;
  pathParams?: PathParams;
  queryParams?: QueryParams;
  body?: Body;
  headers?: Headers;
  next?: NextFetchRequestConfig;
  signal?: AbortSignal;
};

export async function fetcher({
  method,
  path,
  pathParams,
  queryParams,
  body,
  headers,
  next,
  signal,
}: FetcherConfig): Promise<ResponseBody> {
  let processedPath = path;
  if (pathParams) {
    Object.entries(pathParams).forEach(([key, value]) => {
      processedPath = processedPath.replace(`{${key}}`, String(value));
    });
  }

  const baseUrl = isServer
    ? env.SERVER_SIDE_BACKEND_URL
    : env.NEXT_PUBLIC_BACKEND_URL;

  const normalizedBase = baseUrl?.replace(/\/$/, "");
  const normalizedPath = processedPath.replace(/^\//, "");

  const url = new URL(`${normalizedBase}/${normalizedPath}`);

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      ...(body && { "Content-Type": "application/json" }),
      ...headers,
    },
    next,
    signal,
  });

  if (!response.ok) {
    throw new CustomError(
      `Fetching Error : ${response.statusText}`,
      response.status,
    );
  }

  return await response.json();
}
