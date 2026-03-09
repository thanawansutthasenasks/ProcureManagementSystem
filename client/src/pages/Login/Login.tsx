import { Navigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../../auth/authConfig";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .login-root {
    font-family: 'IBM Plex Sans', 'IBM Plex Sans Thai', sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f2f5;
  }

  .login-card {
    width: 420px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
    overflow: hidden;
    animation: cardIn 0.6s cubic-bezier(0.22,1,0.36,1) both;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Logo section */
  .logo-section {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 40px 28px;
    border-bottom: 1px solid #f0f2f5;
    animation: fadeUp 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both;
  }

  .brand-logo {
    width: 205px;
    height: 89px;
    object-fit: contain;
  }

  /* Form section */
  .form-section {
    padding: 32px 40px 36px;
  }

  .form-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #c0392b;
    margin-bottom: 6px;
    animation: fadeUp 0.6s 0.2s cubic-bezier(0.22,1,0.36,1) both;
  }

  .form-heading {
    font-size: 24px;
    font-weight: 700;
    color: #424249;
    letter-spacing: -0.4px;
    margin-bottom: 6px;
    animation: fadeUp 0.6s 0.26s cubic-bezier(0.22,1,0.36,1) both;
  }

  .form-desc {
    font-size: 13.5px;
    color: #7a8499;
    margin-bottom: 24px;
    font-weight: 400;
    line-height: 1.6;
    animation: fadeUp 0.6s 0.32s cubic-bezier(0.22,1,0.36,1) both;
  }

  /* Button */
  .btn-microsoft {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 14px 24px;
    background: #c0392b;
    color: #fff;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 14.5px;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
    box-shadow: 0 2px 12px rgba(192,57,43,0.28);
    animation: fadeUp 0.6s 0.44s cubic-bezier(0.22,1,0.36,1) both;
  }
  .btn-microsoft:hover {
    background: #a93226;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(192,57,43,0.35);
  }
  .btn-microsoft:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(192,57,43,0.2);
  }

  .ms-icon {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5px;
    width: 16px; height: 16px;
    flex-shrink: 0;
  }
  .ms-icon span { border-radius: 1px; }
  .ms-icon span:nth-child(1) { background: #f25022; }
  .ms-icon span:nth-child(2) { background: #7fba00; }
  .ms-icon span:nth-child(3) { background: #00a4ef; }
  .ms-icon span:nth-child(4) { background: #ffb900; }

  /* Footer */
  .form-footer {
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid #f0f2f5;
    text-align: center;
    animation: fadeUp 0.6s 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }
  .form-footer p {
    font-size: 11.5px;
    color: #b0b8cc;
  }

  /* Loading */
  .loading-screen {
    min-height: 100vh;
    background: #f0f2f5;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 14px;
  }
  .spinner-ring {
    width: 34px; height: 34px;
    border: 2.5px solid #e8eaf0;
    border-top-color: #c0392b;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }
  .loading-text {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px;
    color: #aab0c0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 480px) {
    .login-card { width: 100%; min-height: 100vh; border-radius: 0; }
    .form-section { padding: 28px 28px 32px; }
    .logo-section { padding: 32px 28px 24px; }
  }
`;

const Login = () => {
  const { instance, accounts, inProgress } = useMsal();

  if (inProgress !== "none") {
    return (
      <>
        <style>{styles}</style>
        <div className="loading-screen">
          <div className="spinner-ring" />
          <p className="loading-text">Loading...</p>
        </div>
      </>
    );
  }

  if (accounts.length > 0) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-root">
        <div className="login-card">

          <div className="logo-section">
            <img src="/sukishi.png" alt="Logo" className="brand-logo" />
          </div>

          <div className="form-section">
            <div className="form-eyebrow">Login</div>
            <h1 className="form-heading">Welcome</h1>
            <p className="form-desc">
            </p>

            <button className="btn-microsoft" onClick={handleLogin}>
              <span className="ms-icon">
                <span /><span /><span /><span />
              </span>
              Sign in with Microsoft
            </button>

            <div className="form-footer">
              <p>© 2026 Procure Management System · IT</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;