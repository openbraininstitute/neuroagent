import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";

export async function getPresignedUrl(fileIdentifier: string): Promise<string> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const response = await fetcher({
    path: "/storage/{fileIdentifier}/presigned-url",
    pathParams: { fileIdentifier },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (typeof response !== "string") {
    throw new Error("Expected string response for presigned URL");
  }

  return response;
}
