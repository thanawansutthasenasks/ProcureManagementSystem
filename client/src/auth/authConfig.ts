import type { Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "17f570c7-23ea-4e94-9fa1-a20d12b6ab09",
    authority: "https://login.microsoftonline.com/5f0361cd-3dee-40f7-8f86-6721572c51e5",

    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin + "/login",
  },

  cache: {
    cacheLocation: "localStorage",
  },
};

export const loginRequest = {
  scopes: [
    "openid",
    "profile",
    "email",
    "api://17f570c7-23ea-4e94-9fa1-a20d12b6ab09/access_as_user",
  ],
};
