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

  return response as string;
}
