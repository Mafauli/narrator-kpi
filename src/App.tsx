import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import TestBriefGeneration from "./pages/TestBriefGeneration";
import Admin from "./pages/Admin";
import AdminPrompts from "./pages/AdminPrompts";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/app/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />
          <Route path="/app" element={
            <ProtectedRoute>
              <Dashboard />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
