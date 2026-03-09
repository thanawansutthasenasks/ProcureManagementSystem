import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import "../App.css";

const MainLayout: React.FC = () => {
  const [openPR, setOpenPR] = useState(false);
  const [openPO, setOpenPO] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  const userContext = JSON.parse(localStorage.getItem("userContext") || "{}");
  const email = userContext.email || "";

  const { accounts, instance } = useMsal();

  // For copy token api testing
  const copyToken = async () => {
    const token = accounts[0]?.idToken;
    await navigator.clipboard.writeText(token);
    alert("Token copied!");
  };

  return (
    <div className="d-flex min-vh-100 w-100">
      {/* <button onClick={copyToken}>Copy Token</button> */}

      {/* ================= Sidebar Desktop ================= */}
      <aside
        className="d-none d-md-flex flex-column sidebar-bg text-white shadow-lg"
        style={{
          width: collapsed ? 70 : 220,
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          transition: "width 0.3s",
          overflowY: "auto",
        }}
      >
        <SidebarContent
          openPR={openPR}
          setOpenPR={setOpenPR}
          openPO={openPO}
          setOpenPO={setOpenPO}
          collapsed={collapsed}
        />
      </aside>

      {/* ================= Offcanvas Mobile ================= */}
      {showOffcanvas && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
            style={{ zIndex: 1290 }}
            onClick={() => setShowOffcanvas(false)}
          />
          <div
            className="position-fixed top-0 start-0 h-100 bg-danger text-white shadow-lg"
            style={{ width: 220, zIndex: 1300 }}
          >
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <h5 className="mb-0">PMS</h5>
              <button
                className="btn-close btn-close-white"
                onClick={() => setShowOffcanvas(false)}
              />
            </div>
            <SidebarContent
              openPR={openPR}
              setOpenPR={setOpenPR}
              openPO={openPO}
              setOpenPO={setOpenPO}
              onLinkClick={() => setShowOffcanvas(false)}
            />
          </div>
        </>
      )}

      {/* ================= Main ================= */}
      <div
        className="flex-grow-1 d-flex flex-column"
        style={{
          marginLeft: collapsed ? 70 : 220,
          transition: "margin-left 0.3s",
        }}
      >
        {/* Navbar */}
        <nav className="navbar bg-light shadow-sm">
          <div className="container-fluid d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-danger d-md-none"
                onClick={() => setShowOffcanvas(true)}
              >
                <i className="fas fa-bars"></i>
              </button>
              <button
                className="btn btn-outline-danger d-none d-md-inline"
                onClick={() => setCollapsed(!collapsed)}
              >
                <i className="fas fa-bars"></i>
              </button>
              <Link to="/">
                <img src="/T2_removeBG.png" alt="PMS Logo" style={{ width: "80px" }} />
              </Link>
            </div>
            <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>{email}</div>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-grow-1 p-3 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

/* ================= Sidebar ================= */

interface SidebarContentProps {
  openPR: boolean;
  setOpenPR: (open: boolean) => void;
  openPO: boolean;
  setOpenPO: (open: boolean) => void;
  collapsed?: boolean;
  onLinkClick?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  openPR,
  setOpenPR,
  openPO,
  setOpenPO,
  collapsed,
  onLinkClick,
}) => {
  const { instance } = useMsal();

  const handleLogout = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: "/login" });
  };

  return (
    <div className="d-flex flex-column h-100 p-3">
      {!collapsed && (
        <div className="mb-3 text-white">
          <div className="text-center">
            <img
              src="/sukishi_main_transparent.png"
              alt="Logo"
              style={{ width: "150px" }}
            />
          </div>
        </div>
      )}

      <ul className="nav nav-pills flex-column mb-auto">

        {/* ── Home ── */}
        <li className="nav-item">
          <NavLink
            to="/"
            end                       // match "/" เฉพาะตรงๆ ไม่ครอบ route ลูก
            onClick={onLinkClick}
            className={({ isActive }) =>
              "nav-link " + (isActive ? "active-gold" : "text-white")
            }
          >
            <i className="fas fa-home"></i>
            {!collapsed && <span className="ms-2">Home</span>}
          </NavLink>
        </li>

        {/* ── PR ── */}
        <li className="nav-item">
          <div
            className="nav-link text-white d-flex justify-content-between align-items-center"
            role="button"
            onClick={() => !collapsed && setOpenPR(!openPR)}
          >
            <span>
              <i className="fas fa-file-alt"></i>
              {!collapsed && <span className="ms-2">PR</span>}
            </span>
            {!collapsed && (
              <i
                className="fas fa-chevron-right"
                style={{
                  transform: openPR ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "0.3s",
                }}
              />
            )}
          </div>

          {openPR && !collapsed && (
            <ul className="nav flex-column ms-3">
              <li className="nav-item">
                <NavLink
                  to="/createPR"
                  onClick={onLinkClick}
                  className={({ isActive }) =>
                    "nav-link " + (isActive ? "active-gold" : "text-white")
                  }
                >
                  <i className="fas fa-plus-circle me-2"></i>
                  Create PR
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/HistoryPR"
                  onClick={onLinkClick}
                  className={({ isActive }) =>
                    "nav-link " + (isActive ? "active-gold" : "text-white")
                  }
                >
                  <i className="fa-solid fa-clock-rotate-left me-2"></i>
                  History PR
                </NavLink>
              </li>
            </ul>
          )}
        </li>

        {/* ── PO ── */}
        <li className="nav-item">
          <div
            className="nav-link text-white d-flex justify-content-between align-items-center"
            role="button"
            onClick={() => !collapsed && setOpenPO(!openPO)}
          >
            <span>
              <i className="fas fa-file-invoice"></i>
              {!collapsed && <span className="ms-2">PO</span>}
            </span>
            {!collapsed && (
              <i
                className="fas fa-chevron-right"
                style={{
                  transform: openPO ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "0.3s",
                }}
              />
            )}
          </div>

          {openPO && !collapsed && (
            <ul className="nav flex-column ms-3">
              <li className="nav-item">
                <NavLink
                  to="/exportPO"
                  onClick={onLinkClick}
                  className={({ isActive }) =>
                    "nav-link " + (isActive ? "active-gold" : "text-white")
                  }
                >
                  <i className="fas fa-file-export me-2"></i>
                  Export PO
                </NavLink>
              </li>
            </ul>
          )}
        </li>

      </ul>

      <div className="mt-auto">
        <hr className="border-white opacity-25" />
        <button
          className="nav-link text-white sidebar-logout"
          onClick={handleLogout}
        >
          <i className="fas fa-sign-out-alt"></i>
          {!collapsed && <span className="ms-2">Logout</span>}
        </button>
        <p
          className="text-center text-white-50 mt-2 mb-0"
          style={{ fontSize: "0.75rem" }}
        >
          2026 Version : Develop
        </p>
      </div>
    </div>
  );
};

export default MainLayout;