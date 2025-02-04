import { env } from "@/lib/env";

type Method = "GET" | "PATCH" | "POST" | "PUT" | "DELETE";
type Path = string;
type PathParams = Record<string, string | number | boolean>;
type QueryParams = Record<string, string | number | boolean>;
type Headers = Record<string, string>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResponseBody = Record<string, any>;

export type FetcherConfig = {
  method?: Method;
  path: Path;
  pathParams?: PathParams;
  queryParams?: QueryParams;
  body?: Body;
  headers?: Headers;
  next?: NextFetchRequestConfig;
};

export async function fetcher({
  method,
  path,
  pathParams,
  queryParams,
  body,
  headers,
  next,
}: FetcherConfig): Promise<ResponseBody> {
  let processedPath = path;
  if (pathParams) {
    Object.entries(pathParams).forEach(([key, value]) => {
      processedPath = processedPath.replace(`{${key}}`, String(value));
    });
  }

  const url = new URL(processedPath, env.BACKEND_URL);

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
  });

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return await response.json();
}
