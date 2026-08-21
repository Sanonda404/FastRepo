import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/navbar";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import RepositoryPage from "./pages/RepositoryPage";
import { useAuth } from "@/lib/use-auth";
import RepositoryCreatePage from "./pages/RepositoryCreatePage";

export default function App() {
  const { isLoggedIn } = useAuth();

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<AuthPage />} />

        {/* Root Route: dashboard for logged-in users, homepage otherwise */}
        <Route path="/" element={isLoggedIn ? <Dashboard /> : <HomePage />} />
        <Route path="/:owner/:repository" element={<RepositoryPage />} />

        {/* Default Route */}
        <Route path="*" element={<Navigate to="/" replace />} />

        {/* Repository Create Route */}
        <Route path="/create/repository" element={<RepositoryCreatePage />} />

      </Routes>
    </BrowserRouter>
  );
}
