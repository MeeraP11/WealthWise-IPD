import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

// Page components
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import Savings from "@/pages/Savings";
import Goals from "@/pages/Goals";
import Predictions from "@/pages/Predictions";
import Achievements from "@/pages/Achievements";
import AIModelExplanation from "@/pages/AIModelExplanation";
import NotFound from "@/pages/not-found";

// Auth components
import { LoginForm } from "@/components/auth/LoginForm";

// Layout components
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";

// Shared components
import { CoinReward } from "@/components/shared/CoinReward";

// User context
import { UserProvider, useUser } from "@/lib/userContext";

function Router() {
  const { user, loading } = useUser();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user && location !== "/login") {
      setLocation("/login");
    }
  }, [user, loading, location, setLocation]);

  // Redirect to dashboard if logged in and on login page
  useEffect(() => {
    if (!loading && user && location === "/login") {
      setLocation("/");
    }
  }, [user, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 bg-neutral-50">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/expenses" component={Expenses} />
            <Route path="/savings" component={Savings} />
            <Route path="/goals" component={Goals} />
            <Route path="/predictions" component={Predictions} />
            <Route path="/achievements" component={Achievements} />
            <Route path="/ai-explanation" component={AIModelExplanation} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router />
        <Toaster />
        <CoinReward />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
