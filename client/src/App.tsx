import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import Dashboard from "@/pages/Dashboard";
import Inspection from "@/pages/Inspection";
import Photos from "@/pages/Photos";
import Forecast from "@/pages/Forecast";
import Jobs from "@/pages/Jobs";
import Schedule from "@/pages/Schedule";
import Builders from "@/pages/Builders";
import Financials from "@/pages/Financials";
import Reports from "@/pages/Reports";
import ReportInstancePage from "@/pages/ReportInstance";
import Analytics from "@/pages/Analytics";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => (
        <RouteErrorBoundary>
          <Dashboard />
        </RouteErrorBoundary>
      )} />
      <Route path="/jobs" component={() => (
        <RouteErrorBoundary>
          <Jobs />
        </RouteErrorBoundary>
      )} />
      <Route path="/schedule" component={() => (
        <RouteErrorBoundary>
          <Schedule />
        </RouteErrorBoundary>
      )} />
      <Route path="/builders" component={() => (
        <RouteErrorBoundary>
          <Builders />
        </RouteErrorBoundary>
      )} />
      <Route path="/financials" component={() => (
        <RouteErrorBoundary>
          <Financials />
        </RouteErrorBoundary>
      )} />
      <Route path="/reports" component={() => (
        <RouteErrorBoundary>
          <Reports />
        </RouteErrorBoundary>
      )} />
      <Route path="/reports/:id" component={() => (
        <RouteErrorBoundary>
          <ReportInstancePage />
        </RouteErrorBoundary>
      )} />
      <Route path="/analytics" component={() => (
        <RouteErrorBoundary>
          <Analytics />
        </RouteErrorBoundary>
      )} />
      <Route path="/settings" component={() => (
        <RouteErrorBoundary>
          <SettingsPage />
        </RouteErrorBoundary>
      )} />
      <Route path="/inspection/:id" component={() => (
        <RouteErrorBoundary>
          <Inspection />
        </RouteErrorBoundary>
      )} />
      <Route path="/photos" component={() => (
        <RouteErrorBoundary>
          <Photos />
        </RouteErrorBoundary>
      )} />
      <Route path="/photos/:id" component={() => (
        <RouteErrorBoundary>
          <Photos />
        </RouteErrorBoundary>
      )} />
      <Route path="/forecast/:id" component={() => (
        <RouteErrorBoundary>
          <Forecast />
        </RouteErrorBoundary>
      )} />
      <Route component={() => (
        <RouteErrorBoundary>
          <NotFound />
        </RouteErrorBoundary>
      )} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between p-2 border-b">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
