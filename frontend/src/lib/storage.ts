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

  if (response.ok && typeof response === "string") {
    return response;
  } else {
    throw new Error(
      `Error getting presigned URL. Status code: ${response.status} , ${response.statusText}`,
    );
  }
}
