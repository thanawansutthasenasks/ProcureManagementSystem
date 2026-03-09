/**
 * client/src/layouts/MainLayout.tsx
 * Design: Light sidebar (Notion/Linear) + light content
 * Stack: Tailwind CSS v4 + Ant Design · Light mode only
 */

import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { Tooltip, Avatar, ConfigProvider, Badge } from "antd";
import {
  HomeOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  HistoryOutlined,
  FileProtectOutlined,
  ExportOutlined,
  LogoutOutlined,
  MenuOutlined,
  BellOutlined,
  RightOutlined,
  SearchOutlined,
} from "@ant-design/icons";

// ─── Nav Config ────────────────────────────────────────────────
interface NavChild {
  key: string;
  label: string;
  icon: React.ReactNode;
  to: string;
}
interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  to?: string;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { key: "home", label: "Home", icon: <HomeOutlined />, to: "/" },
  {
    key: "pr",
    label: "Purchase Request",
    icon: <FileTextOutlined />,
    children: [
      { key: "createPR", label: "Create PR", icon: <PlusCircleOutlined />, to: "/createPR" },
      { key: "historyPR", label: "History PR", icon: <HistoryOutlined />, to: "/HistoryPR" },
    ],
  },
  {
    key: "po",
    label: "Purchase Order",
    icon: <FileProtectOutlined />,
    children: [
      { key: "exportPO", label: "Export PO", icon: <ExportOutlined />, to: "/exportPO" },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────
function getInitials(email: string): string {
  if (!email) return "U";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─── Main Layout ───────────────────────────────────────────────
const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userContext = JSON.parse(localStorage.getItem("userContext") || "{}");
  const email = userContext.email || "";
  const initials = getInitials(email);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#6366f1",
          colorBgBase: "#ffffff",
          colorTextBase: "#111128",
          borderRadius: 8,
          fontFamily: '"Sarabun", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <div className="page-root">

        {/* ── Desktop Sidebar ─────────────────────────────────── */}
        <aside className={`sidebar hidden md:flex ${collapsed ? "sidebar-collapsed" : "sidebar-wide"}`}>
          <SidebarContent
            collapsed={collapsed}
            email={email}
            initials={initials}
          />
        </aside>

        {/* ── Mobile Sidebar ──────────────────────────────────── */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="sidebar sidebar-wide flex md:hidden z-50">
              <SidebarContent
                collapsed={false}
                email={email}
                initials={initials}
                onLinkClick={() => setMobileOpen(false)}
              />
            </aside>
          </>
        )}

        {/* ── Content ─────────────────────────────────────────── */}
        <div
          className="flex flex-1 flex-col h-screen overflow-hidden"
          style={{
            marginLeft: collapsed
              ? "var(--width-sidebar-collapsed)"
              : "var(--width-sidebar)",
            transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Topbar */}
          <header className="topbar">
            <button className="icon-btn md:hidden" onClick={() => setMobileOpen(true)}>
              <MenuOutlined style={{ fontSize: 16 }} />
            </button>
            <button className="icon-btn hidden md:flex" onClick={() => setCollapsed((c) => !c)}>
              <MenuOutlined style={{ fontSize: 16 }} />
            </button>

            <Link to="/" className="flex items-center ml-1">
              <img src="/T2_removeBG.png" alt="PMS" className="h-7 w-auto object-contain" />
            </Link>

            {/* Search — desktop */}
            <div className="hidden md:flex flex-1 max-w-xs ml-4">
              <div
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm cursor-pointer"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                }}
              >
                <SearchOutlined style={{ fontSize: 13 }} />
                <span>Search...</span>
              </div>
            </div>

            <div className="flex-1" />

            <Tooltip title="Notifications">
              <button className="icon-btn">
                <Badge count={3} size="small" color="#6366f1">
                  <BellOutlined style={{ fontSize: 16 }} />
                </Badge>
              </button>
            </Tooltip>

            <Tooltip title={email} placement="bottomRight">
              <Avatar
                size={32}
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {initials}
              </Avatar>
            </Tooltip>
          </header>

          {/* Page content */}
          <main
            className="flex flex-1 p-4 md:p-5 overflow-hidden"
            style={{ background: "var(--color-bg-base, #f8fafc)" }}
          >
            <div className="flex-1 w-full h-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

// ─── Sidebar Content ───────────────────────────────────────────
interface SidebarContentProps {
  collapsed: boolean;
  email: string;
  initials: string;
  onLinkClick?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  collapsed,
  email,
  initials,
  onLinkClick,
}) => {
  const { instance } = useMsal();
  const [openGroups, setOpenGroups] = useState<string[]>(["pr"]);

  const handleLogout = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: "/login" });
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="flex flex-col h-full w-full">

      {/* Brand header */}
      <div
        className="flex h-14 shrink-0 items-center px-4"
        style={{ borderBottom: "1px solid var(--color-sidebar-border)" }}
      >
        {collapsed ? (
          /* Collapsed — icon only */
          <div
            className="mx-auto w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: "linear-gradient(135deg, #4f46e5, #818cf8)" }}
          >
            <span className="text-white font-bold text-xs">P</span>
          </div>
        ) : (
          /* Expanded */
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ background: "linear-gradient(135deg, #4f46e5, #818cf8)" }}
            >
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <div>
              <p
                className="text-sm font-semibold leading-tight"
                style={{ color: "var(--color-text)" }}
              >
                PMS
              </p>
              <p
                className="text-[11px] leading-tight"
                style={{ color: "var(--color-sidebar-dim)" }}
              >
                Procure Management
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-0.5">
        {NAV.map((item) => {

          if (!item.children) {
            return (
              <Tooltip key={item.key} title={collapsed ? item.label : ""} placement="right">
                <NavLink
                  to={item.to!}
                  end
                  onClick={onLinkClick}
                  className={({ isActive }) =>
                    `nav-item ${collapsed ? "nav-item-centered" : ""} ${isActive ? "nav-item-active" : ""}`
                  }
                >
                  <span className="text-[15px] shrink-0 leading-none">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </Tooltip>
            );
          }

          const isOpen = openGroups.includes(item.key);

          return (
            <div key={item.key}>
              <Tooltip title={collapsed ? item.label : ""} placement="right">
                <button
                  onClick={() => !collapsed && toggleGroup(item.key)}
                  className={`nav-item ${collapsed ? "nav-item-centered" : ""}`}
                  style={!collapsed ? { justifyContent: "space-between" } : {}}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[15px] shrink-0 leading-none">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </span>
                  {!collapsed && (
                    <RightOutlined
                      style={{
                        fontSize: 10,
                        color: "var(--color-sidebar-dim)",
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  )}
                </button>
              </Tooltip>

              {isOpen && !collapsed && (
                <div
                  className="ml-4 pl-3 mt-0.5 space-y-0.5"
                  style={{ borderLeft: "2px solid var(--color-sidebar-border)" }}
                >
                  {item.children!.map((child) => (
                    <NavLink
                      key={child.key}
                      to={child.to}
                      onClick={onLinkClick}
                      className={({ isActive }) =>
                        `nav-item py-1.5 text-[13px] ${isActive ? "nav-item-active" : ""}`
                      }
                    >
                      <span className="text-xs shrink-0 leading-none">{child.icon}</span>
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-2.5 pb-3 pt-2 shrink-0 space-y-1"
        style={{ borderTop: "1px solid var(--color-sidebar-border)" }}
      >
        {/* User info */}
        {!collapsed && (
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1"
            style={{ background: "var(--color-sidebar-hover)" }}
          >
            <Avatar
              size={28}
              style={{
                background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </Avatar>
            <div className="min-w-0">
              <p
                className="text-xs font-medium truncate leading-tight"
                style={{ color: "var(--color-text)" }}
              >
                {email || "User"}
              </p>
              <p
                className="text-[11px] truncate leading-tight"
                style={{ color: "var(--color-sidebar-dim)" }}
              >
                Member
              </p>
            </div>
          </div>
        )}

        {/* Logout */}
        <Tooltip title={collapsed ? "Logout" : ""} placement="right">
          <button
            onClick={handleLogout}
            className={`nav-item ${collapsed ? "nav-item-centered" : ""}`}
            style={{ color: "#ef4444" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <LogoutOutlined style={{ fontSize: 15, flexShrink: 0 }} />
            {!collapsed && <span>Logout</span>}
          </button>
        </Tooltip>

        {!collapsed && (
          <p
            className="text-center text-[11px] pt-1"
            style={{ color: "var(--color-sidebar-dim)" }}
          >
            v2026 · Development
          </p>
        )}
      </div>
    </div>
  );
};

export default MainLayout;