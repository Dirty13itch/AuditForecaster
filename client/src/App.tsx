import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import Inspection from "@/pages/Inspection";
import Photos from "@/pages/Photos";
import Forecast from "@/pages/Forecast";
import Jobs from "@/pages/Jobs";
import Schedule from "@/pages/Schedule";
import Builders from "@/pages/Builders";
import Financials from "@/pages/Financials";
import Reports from "@/pages/Reports";
import Analytics from "@/pages/Analytics";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/builders" component={Builders} />
      <Route path="/financials" component={Financials} />
      <Route path="/reports" component={Reports} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/inspection/:id" component={Inspection} />
      <Route path="/photos/:id" component={Photos} />
      <Route path="/forecast/:id" component={Forecast} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
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
  );
}

export default App;
