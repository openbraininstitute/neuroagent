"use server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function saveSettings(previousState: unknown, formData: FormData) {
  const vlabId = formData.get("virtualLabID");
  const projId = formData.get("projectID");
  const cookieStore = await cookies();

  // Set cookies that will be accessible on the server
  if (typeof projId === "string" && projId !== "") {
    cookieStore.set("projectID", projId, { maxAge: 60 * 60 * 24 * 30 }); // 30 days
  } else {
    cookieStore.delete("projectID");
  }
  if (typeof vlabId === "string" && vlabId !== "") {
    cookieStore.set("virtualLabID", vlabId, { maxAge: 60 * 60 * 24 * 30 }); // 30 days
  } else {
    cookieStore.delete("virtualLabID");
  }
  // Refresh the client-side router
  revalidateTag("threads");
  redirect("/");
}
