import { msalInstance } from "./msalInstance";
import { loginRequest } from "./authConfig";

export async function getAccessToken() {
  const account = msalInstance.getActiveAccount();

  if (!account) {
    throw new Error("No active account");
  }

  const result = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account,
  });

  return result.accessToken;
}
