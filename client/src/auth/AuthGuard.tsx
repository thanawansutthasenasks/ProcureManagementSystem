// auth/AuthGuard.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useMsal } from "@azure/msal-react";

const AuthGuard = () => {
  const { accounts, inProgress } = useMsal();

  if (inProgress !== "none") {
    return <div>Loading...</div>;
  }

  if (accounts.length === 0) {
    return <Navigate to="/login" replace />;
  }
 const claims: any = accounts[0].idTokenClaims;
//  console.log("🔐 ID TOKEN CLAIMS =", claims);

  const email =
    claims.email || claims.preferred_username || "";

  const roles: string[] = claims.roles || [];

  const isOutlet = roles.includes("Outlet");

  const outletCode =
    isOutlet && email.includes(".")
      ? email.split(".")[0]
      : null;

  const userContext ={
    email,
    roles,
    isOutlet,
    outletCode,
    name: claims.name
  }
   localStorage.setItem(
    "userContext",
    JSON.stringify(userContext)
  );
  return <Outlet />;
};

export default AuthGuard;
