import { cookies } from "next/headers";

export async function getSettings() {
  const cookieStore = await cookies();
  return {
    projectID: cookieStore.get("projectID")?.value,
    virtualLabID: cookieStore.get("virtualLabID")?.value,
    frontendUrl: cookieStore.get("frontendUrl")?.value,
  };
}
