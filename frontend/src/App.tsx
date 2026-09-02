import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/navbar";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import RepositoryPage from "./pages/RepositoryPage";
import { useAuth } from "@/lib/auth/use-auth";
import RepositoryCreatePage from "./pages/RepositoryCreatePage";
import RepositoryIssuesPage from "./pages/RepositoryIssuesPage";
import RepositoryPullsPage from "./pages/RepositoryPullsPage";
import RepositoryTeamsPage from "./pages/RepositoryTeamsPage";
import RepositorySettingsPage from "./pages/RepositorySettingsPage";
import RepositoryIssueNew from './pages/RepositoryIssueCreatePage';
import RepositoryIssueDetails from "./pages/RepositoryIssueDetails";
import UserProfilePage from "./pages/UserProfilePage";
import { Toaster } from "@/components/ui/sonner";
import { clearAuthToken, getAuthToken } from "@/lib/apis/api";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    if (typeof payload.exp !== "number") return false
    return Date.now() >= payload.exp * 1000
  } catch {
    return false
  }
}

export default function App() {
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) return
    const check = () => {
      const token = getAuthToken()
      if (token && isTokenExpired(token)) {
        clearAuthToken()
        try {
          sessionStorage.setItem("fastrepo_session_expired", "1")
        } catch (e) {
          void e
        }
        if (window.location.pathname !== "/login") window.location.href = "/login"
      }
    }
    check()
    const id = window.setInterval(check, 30_000)
    return () => window.clearInterval(id)
  }, [isLoggedIn])

  return (
    <BrowserRouter>
      <Navbar />
      <Toaster />
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<AuthPage />} />

        {/* Repository Create Route - before dynamic username */}
        <Route path="/create/repository" element={<RepositoryCreatePage />} />

        {/* Root Route: dashboard for logged-in users, homepage otherwise */}
        <Route path="/" element={isLoggedIn ? <Dashboard /> : <HomePage />} />

        <Route path="/:username" element={<UserProfilePage />} />

        <Route path="/:owner/:repository" element={<RepositoryPage />} />
        <Route path="/:owner/:repository/issues" element={<RepositoryIssuesPage />} />
        <Route path="/:owner/:repository/issues/create" element={<RepositoryIssueNew />} />
        <Route path="/:owner/:repository/issues/:issueNumber" element={<RepositoryIssueDetails />} />
        <Route path="/:owner/:repository/pulls" element={<RepositoryPullsPage />} />
        <Route path="/:owner/:repository/teams" element={<RepositoryTeamsPage />} />
        <Route path="/:owner/:repository/settings" element={<RepositorySettingsPage />} />

        {/* Default Route */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
