"use server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";

export async function saveSettings(previousState: unknown, formData: FormData) {
  const vlabId = formData.get("virtualLabID") as string;
  const projId = formData.get("projectID") as string;
  const cookieStore = await cookies();
  // Set cookies that will be accessible on the server
  cookieStore.set("projectID", projId, { maxAge: 60 * 60 * 24 * 30 }); // 30 days
  cookieStore.set("virtualLabID", vlabId, { maxAge: 60 * 60 * 24 * 30 }); // 30 days
  // Refresh the client-side router
  revalidateTag("threads");
  return { success: true };
}
