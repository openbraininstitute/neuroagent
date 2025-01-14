// This is a server component
import { cookies } from "next/headers";

export async function getSettings() {
  const cookieStore = await cookies();
  return {
    projectID: cookieStore.get("projectID")?.value ?? "",
    virtualLabID: cookieStore.get("virtualLabID")?.value ?? "",
    token: cookieStore.get("token")?.value ?? "",
  };
}
