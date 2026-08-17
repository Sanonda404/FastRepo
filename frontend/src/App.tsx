import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/navbar";
import AuthPage from "./pages/AuthPage"

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<AuthPage />} />

        {/* Default Route: Redirect to /login for now */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}