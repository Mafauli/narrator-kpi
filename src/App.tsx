import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import BriefSetup from "./pages/BriefSetup";
import Sources from "./pages/Sources";
import TestBriefGeneration from "./pages/TestBriefGeneration";
import Admin from "./pages/Admin";
import AdminPrompts from "./pages/AdminPrompts";
import AdminDatabase from "./pages/AdminDatabase";
import AdminLogs from "./pages/AdminLogs";
import AdminAvatars from "./pages/AdminAvatars";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminButton } from "./components/AdminButton";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AdminButton />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/app/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />
          <Route path="/app/brief-setup" element={
            <ProtectedRoute>
              <BriefSetup />
            </ProtectedRoute>
          } />
          <Route path="/app" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/app/sources" element={
            <ProtectedRoute>
              <Sources />
            </ProtectedRoute>
          } />
          <Route path="/app/test-brief-generation" element={
            <ProtectedRoute>
              <TestBriefGeneration />
            </ProtectedRoute>
          } />
          <Route path="/app/admin" element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/app/admin/prompts" element={
            <ProtectedRoute>
              <AdminPrompts />
            </ProtectedRoute>
          } />
          <Route path="/app/admin/database" element={
            <ProtectedRoute>
              <AdminDatabase />
            </ProtectedRoute>
          } />
          <Route path="/app/admin/logs" element={
            <ProtectedRoute>
              <AdminLogs />
            </ProtectedRoute>
          } />
          <Route path="/app/admin/avatars" element={
            <ProtectedRoute>
              <AdminAvatars />
            </ProtectedRoute>
          } />
          <Route path="/app/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
