import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { useTheme } from "./hooks/useTheme";
import { AuthProvider } from "./context/AuthContext";
import { AuthCallback } from "./components/AuthCallback";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { Pricing } from "./components/Pricing";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import Clients from "./pages/dashboard/Clients";
import Workflows from "./pages/dashboard/Workflows";
import Leads from "./pages/dashboard/Leads";

const Home = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div data-testid="home-page">
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <Hero />
      <Features />
      <Pricing />
      <Contact />
      <Footer />
    </div>
  );
};

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="clients" element={<Clients />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="leads" element={<Leads />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
