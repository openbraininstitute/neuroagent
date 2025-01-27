import Cookies from "js-cookie";

export function getSettings() {
  return {
    projectID: Cookies.get("projectID") ?? "",
    virtualLabID: Cookies.get("virtualLabID") ?? "",
    token: Cookies.get("token") ?? "",
  };
}
