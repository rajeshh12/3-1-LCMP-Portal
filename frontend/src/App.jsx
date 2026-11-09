import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import { Dashboard, PortalPage } from "./pages/PortalPages.jsx";
import PublicPage from "./pages/PublicPage.jsx";

const pages = [
  ["/cases", "Cases"], ["/tasks", "Tasks"], ["/calendar", "Calendar"], ["/risk", "Deadline risk"],
  ["/clients", "Clients"], ["/communications", "Communications"], ["/documents", "Documents"],
  ["/analytics", "Analytics"], ["/notifications", "Notifications"], ["/users", "User management", ["admin"]],
  ["/audit", "Audit log", ["admin"]], ["/settings", "Settings"], ["/profile", "Profile"]
];

function RolePage({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? children : <Navigate to="/" replace/>;
}

export default function App() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace/> : <Login/>}/>
    <Route path="/register" element={user ? <Navigate to="/" replace/> : <PublicPage mode="register"/>}/>
    <Route path="/forgot-password" element={user ? <Navigate to="/" replace/> : <PublicPage mode="forgot"/>}/>
    <Route path="/reset-password" element={user ? <Navigate to="/" replace/> : <PublicPage mode="reset"/>}/>
    <Route element={<ProtectedRoute/>}><Route element={<Layout/>}>
      <Route index element={<Dashboard/>}/>
      {pages.map(([path, title, roles]) => <Route key={path} path={path.slice(1)} element={roles ? <RolePage roles={roles}><PortalPage title={title}/></RolePage> : <PortalPage title={title}/>}/>)}
      <Route path="cases/:id" element={<PortalPage title="Case details"/>}/>
      <Route path="tasks/:id" element={<PortalPage title="Task details"/>}/>
    </Route></Route>
    <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace/>}/>
  </Routes>;
}
