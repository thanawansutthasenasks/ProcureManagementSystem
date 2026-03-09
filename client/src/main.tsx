import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import type { AuthenticationResult } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import "bootstrap/dist/css/bootstrap.min.css"; 
import "@fortawesome/fontawesome-free/css/all.min.css";
import App from "./App";
import { msalConfig } from "./auth/authConfig";
import "./index.css";
const msalInstance = new PublicClientApplication(msalConfig);

// ⭐ สำคัญที่สุด — set active account หลัง login
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    const result = event.payload as AuthenticationResult;
    msalInstance.setActiveAccount(result.account);
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </StrictMode>
);
