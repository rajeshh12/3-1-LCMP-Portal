import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Activity, Bell, BriefcaseBusiness, CalendarDays, ChartNoAxesCombined, ChevronLeft, ChevronRight, CircleHelp, FileText, FolderOpen, LayoutDashboard, LogOut, Menu, MessageSquareText, Settings, ShieldAlert, Users, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { api } from "../services/api.js";

const links = [
  ["Overview", "/", LayoutDashboard],
  ["Cases", "/cases", BriefcaseBusiness],
  ["Tasks", "/tasks", FolderOpen],
  ["Calendar", "/calendar", CalendarDays],
  ["Deadline risk", "/risk", ShieldAlert],
  ["Clients", "/clients", Users],
  ["Communications", "/communications", MessageSquareText],
  ["Documents", "/documents", FileText],
  ["Analytics", "/analytics", ChartNoAxesCombined],
  ["Notifications", "/notifications", Bell],
  ["User management", "/users", Users, ["admin"]],
  ["Audit log", "/audit", Activity, ["admin"]],
  ["Settings", "/settings", Settings]
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { api.get("/dashboard").then((data) => setUnread(data.unreadNotifications)).catch(() => {}); }, []);
  const title = links.find((item) => item[1] === location.pathname)?.[0] ?? "Portal";

  return <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
    {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="brand"><div className="brand-mark">B</div>{!collapsed && <span>briefcase<span className="brand-dot">.</span></span>}<button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      {!collapsed && <div className="firm-label">WEXLER & ASSOCIATES <span>LEGAL PRACTICE</span></div>}
      <nav className="nav-list">
        {!collapsed && <span className="nav-caption">WORKSPACE</span>}
        {links.filter((item) => !item[3] || item[3].includes(user?.role)).map(([label, path, Icon]) =>
          <NavLink key={path} to={path} end={path === "/"} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} title={collapsed ? label : undefined}>
            <Icon size={18}/>{!collapsed && <span>{label}</span>}{label === "Notifications" && unread > 0 && !collapsed && <b className="nav-count">{unread}</b>}
          </NavLink>)}
      </nav>
      {!collapsed && <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><b>Need a hand?</b><p>Visit our help center for guidance.</p><button onClick={() => window.alert("Contact your portal administrator for assistance.")}>Get support <span>↗</span></button></div><div className="sidebar-foot">© 2026 Briefcase Legal</div></div>}
      <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">{collapsed ? <ChevronRight size={17}/> : <ChevronLeft size={17}/>}</button>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{title}</strong></div><div className="top-actions"><button className="icon-button notification-top" onClick={() => navigate("/notifications")} aria-label="Notifications"><Bell size={19}/>{unread > 0 && <i/>}</button><div className="top-divider"/><button className="profile-button" onClick={() => navigate("/profile")}><div className="avatar">{user?.name?.split(" ").map((n) => n[0]).slice(0,2).join("")}</div><span className="profile-meta"><b>{user?.name}</b><small>{user?.role}</small></span><ChevronRight size={15}/></button><button className="icon-button" title="Sign out" onClick={() => { logout(); navigate("/login"); }}><LogOut size={18}/></button></div></header>
      <div className="page-content"><Outlet/></div>
      <footer className="page-footer"><span>© 2026 Briefcase Legal Technologies</span><span><i className="live-dot"/> All systems operational</span></footer>
    </main>
  </div>;
}
