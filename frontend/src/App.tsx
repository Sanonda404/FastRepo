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
import PullCreatePage from "./pages/PullCreatePage";
import PullDetailPage from "./pages/PullDetailPage";
import RepositoryTeamsPage from "./pages/RepositoryTeamsPage";
import RepositorySettingsPage from "./pages/RepositorySettingsPage";
import RepositoryCommitsPage from "./pages/RepositoryCommitsPage";
import RepositoryCommitReportPage from "./pages/RepositoryCommitReportPage";
import RepositoryIssueNew from './pages/RepositoryIssueCreatePage';
import RepositoryIssueDetails from "./pages/RepositoryIssueDetails";
import UserProfilePage from "./pages/UserProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import IssuePullCreatePage from "./pages/IssuePrCreatePage";
import DocsPage from "./pages/DocsPage";
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
        <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <AuthPage />} />

        <Route path="/create/repository" element={<RepositoryCreatePage />} />

        <Route path="/" element={isLoggedIn ? <Dashboard /> : <HomePage />} />

        <Route path="/:username" element={<UserProfilePage />} />

        <Route path="/:owner/:repository" element={<RepositoryPage />} />
        <Route path="/:owner/:repository/issues" element={<RepositoryIssuesPage />} />
        <Route path="/:owner/:repository/issues/create" element={<RepositoryIssueNew />} />
        <Route path="/:owner/:repository/issues/:issueNumber" element={<RepositoryIssueDetails />} />
        <Route path="/:owner/:repository/commits" element={<RepositoryCommitsPage />} />
        <Route path="/:owner/:repository/commits/:sha" element={<RepositoryCommitReportPage />} />
        <Route path="/:owner/:repository/pulls" element={<RepositoryPullsPage />} />
        <Route path="/:owner/:repository/pulls/create" element={<PullCreatePage />} />
        <Route path="/:owner/:repository/pulls/:pullNumber" element={<PullDetailPage />} />
        <Route path="/:owner/:repository/teams" element={<RepositoryTeamsPage />} />
        <Route path="/:owner/:repository/settings" element={<RepositorySettingsPage />} />
        <Route  path="/forgot-password" element={<ForgotPasswordPage />}/>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/:owner/:repository/pulls/new/issue" element={<IssuePullCreatePage />} />
        {/* Default Route */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
