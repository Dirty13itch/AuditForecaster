import { initSentry } from "@/lib/sentry";
initSentry();

import { Switch, Route, useParams, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { InstallPrompt } from "@/components/InstallPrompt";
import { DevModeIndicator } from "@/components/DevModeIndicator";
import { DevModeBanner } from "@/components/DevModeBanner";
import { useAuth } from "@/hooks/useAuth";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationBell } from "@/components/NotificationBell";
import Dashboard from "@/pages/Dashboard";
import Inspection from "@/pages/Inspection";
import Photos from "@/pages/Photos";
import PhotoAnnotation from "@/pages/PhotoAnnotation";
import PhotoCleanup from "@/pages/PhotoCleanup";
import Forecast from "@/pages/Forecast";
import Jobs from "@/pages/Jobs";
import Gamification from "@/pages/Gamification";
import Challenges from "@/pages/Challenges";
import Schedule from "@/pages/Schedule";
import RouteView from "@/pages/RouteView";
import Builders from "@/pages/Builders";
import Plans from "@/pages/Plans";
import Financials from "@/pages/Financials";
import FinancialDashboard from "@/pages/FinancialDashboard";
import Invoices from "@/pages/Invoices";
import Expenses from "@/pages/Expenses";
import Mileage from "@/pages/Mileage";
import Reports from "@/pages/Reports";
import ReportInstancePage from "@/pages/ReportInstance";
import ReportTemplates from "@/pages/ReportTemplates";
import ReportTemplateDesigner from "@/pages/ReportTemplateDesigner";
import ReportFillout from "@/pages/ReportFillout";
import BlowerDoorTest from "@/pages/BlowerDoorTest";
import DuctLeakageTest from "@/pages/DuctLeakageTest";
import Analytics from "@/pages/Analytics";
import AuditLogs from "@/pages/AuditLogs";
import SettingsPage from "@/pages/SettingsPage";
import AdminDiagnostics from "@/pages/AdminDiagnostics";
import CalendarPOC from "@/pages/CalendarPOC";
import CalendarReview from "@/pages/CalendarReview";
import CalendarImportHistory from "@/pages/CalendarImportHistory";
import CalendarImportQueuePage from "@/pages/CalendarImportQueuePage";
import TaxCredit45L from "@/pages/TaxCredit45L";
import TaxCreditProject from "@/pages/TaxCreditProject";
import TaxCreditCompliance from "@/pages/TaxCreditCompliance";
import TaxCreditReports from "@/pages/TaxCreditReports";
import Equipment from "@/pages/Equipment";
import EquipmentDetails from "@/pages/EquipmentDetails";
import CalibrationSchedule from "@/pages/CalibrationSchedule";
import QualityAssurance from "@/pages/QualityAssurance";
import QAScoring from "@/pages/QAScoring";
import QAChecklists from "@/pages/QAChecklists";
import QAPerformance from "@/pages/QAPerformance";
import QAReview from "@/components/QAReview";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import ConflictResolution from "@/pages/ConflictResolution";
import CustomReports from "@/pages/CustomReports";
import KPISettings from "@/pages/KPISettings";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import NotificationTest from "@/pages/NotificationTest";

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
      <Route path="/jobs/:id" component={() => {
        const { id } = useParams<{ id: string }>();
        const [, setLocation] = useLocation();
        // Redirect /jobs/:id to /inspection/:id for consistency
        if (id) {
          setLocation(`/inspection/${id}`);
        }
        return null;
      }} />
      <Route path="/schedule" component={() => (
        <RouteErrorBoundary>
          <Schedule />
        </RouteErrorBoundary>
      )} />
      <Route path="/route" component={() => (
        <RouteErrorBoundary>
          <RouteView />
        </RouteErrorBoundary>
      )} />
      <Route path="/builders" component={() => (
        <RouteErrorBoundary>
          <Builders />
        </RouteErrorBoundary>
      )} />
      <Route path="/plans" component={() => (
        <RouteErrorBoundary>
          <Plans />
        </RouteErrorBoundary>
      )} />
      <Route path="/financials" component={() => (
        <RouteErrorBoundary>
          <Financials />
        </RouteErrorBoundary>
      )} />
      <Route path="/financial-dashboard" component={() => (
        <RouteErrorBoundary>
          <FinancialDashboard />
        </RouteErrorBoundary>
      )} />
      <Route path="/invoices" component={() => (
        <RouteErrorBoundary>
          <Invoices />
        </RouteErrorBoundary>
      )} />
      <Route path="/invoices/new" component={() => (
        <RouteErrorBoundary>
          <Invoices />
        </RouteErrorBoundary>
      )} />
      <Route path="/invoices/:id" component={() => (
        <RouteErrorBoundary>
          <Invoices />
        </RouteErrorBoundary>
      )} />
      <Route path="/expenses" component={() => (
        <RouteErrorBoundary>
          <Expenses />
        </RouteErrorBoundary>
      )} />
      <Route path="/expenses/new" component={() => (
        <RouteErrorBoundary>
          <Expenses />
        </RouteErrorBoundary>
      )} />
      <Route path="/mileage" component={() => (
        <RouteErrorBoundary>
          <Mileage />
        </RouteErrorBoundary>
      )} />
      <Route path="/mileage/new" component={() => (
        <RouteErrorBoundary>
          <Mileage />
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
      <Route path="/report-templates" component={() => (
        <RouteErrorBoundary>
          <ReportTemplates />
        </RouteErrorBoundary>
      )} />
      <Route path="/report-template-designer" component={() => (
        <RouteErrorBoundary>
          <ReportTemplateDesigner />
        </RouteErrorBoundary>
      )} />
      <Route path="/report-template-designer/:id" component={() => (
        <RouteErrorBoundary>
          <ReportTemplateDesigner />
        </RouteErrorBoundary>
      )} />
      <Route path="/reports/fillout/:id" component={() => (
        <RouteErrorBoundary>
          <ReportFillout />
        </RouteErrorBoundary>
      )} />
      <Route path="/blower-door-test" component={() => (
        <RouteErrorBoundary>
          <BlowerDoorTest />
        </RouteErrorBoundary>
      )} />
      <Route path="/blower-door/:jobId" component={() => (
        <RouteErrorBoundary>
          <BlowerDoorTest />
        </RouteErrorBoundary>
      )} />
      <Route path="/duct-leakage-test" component={() => (
        <RouteErrorBoundary>
          <DuctLeakageTest />
        </RouteErrorBoundary>
      )} />
      <Route path="/duct-leakage/:jobId" component={() => (
        <RouteErrorBoundary>
          <DuctLeakageTest />
        </RouteErrorBoundary>
      )} />
      <Route path="/analytics" component={() => (
        <RouteErrorBoundary>
          <Analytics />
        </RouteErrorBoundary>
      )} />
      <Route path="/audit-logs" component={() => (
        <RouteErrorBoundary>
          <AuditLogs />
        </RouteErrorBoundary>
      )} />
      <Route path="/settings" component={() => (
        <RouteErrorBoundary>
          <SettingsPage />
        </RouteErrorBoundary>
      )} />
      <Route path="/custom-reports" component={() => (
        <RouteErrorBoundary>
          <CustomReports />
        </RouteErrorBoundary>
      )} />
      <Route path="/kpi-settings" component={() => (
        <RouteErrorBoundary>
          <KPISettings />
        </RouteErrorBoundary>
      )} />
      <Route path="/admin/diagnostics" component={() => (
        <RouteErrorBoundary>
          <AdminDiagnostics />
        </RouteErrorBoundary>
      )} />
      <Route path="/admin/calendar-import" component={() => (
        <RouteErrorBoundary>
          <CalendarImportQueuePage />
        </RouteErrorBoundary>
      )} />
      <Route path="/calendar-poc" component={() => (
        <RouteErrorBoundary>
          <CalendarPOC />
        </RouteErrorBoundary>
      )} />
      <Route path="/calendar-review" component={() => (
        <RouteErrorBoundary>
          <CalendarReview />
        </RouteErrorBoundary>
      )} />
      <Route path="/calendar-imports" component={() => (
        <RouteErrorBoundary>
          <CalendarImportHistory />
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credits" component={() => (
        <RouteErrorBoundary>
          <TaxCredit45L />
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credits/projects/new" component={() => (
        <RouteErrorBoundary>
          <TaxCreditProject />
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credits/projects/:id" component={() => (
        <RouteErrorBoundary>
          <TaxCreditProject />
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credits/compliance" component={() => (
        <RouteErrorBoundary>
          <TaxCreditCompliance />
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credits/reports" component={() => (
        <RouteErrorBoundary>
          <TaxCreditReports />
        </RouteErrorBoundary>
      )} />
      <Route path="/equipment" component={() => (
        <RouteErrorBoundary>
          <Equipment />
        </RouteErrorBoundary>
      )} />
      <Route path="/equipment/calibrations" component={() => (
        <RouteErrorBoundary>
          <CalibrationSchedule />
        </RouteErrorBoundary>
      )} />
      <Route path="/equipment/:id" component={() => (
        <RouteErrorBoundary>
          <EquipmentDetails />
        </RouteErrorBoundary>
      )} />
      <Route path="/qa" component={() => (
        <RouteErrorBoundary>
          <QualityAssurance />
        </RouteErrorBoundary>
      )} />
      <Route path="/qa/scoring" component={() => (
        <RouteErrorBoundary>
          <QAScoring />
        </RouteErrorBoundary>
      )} />
      <Route path="/qa/scoring/:jobId" component={() => (
        <RouteErrorBoundary>
          <QAScoring />
        </RouteErrorBoundary>
      )} />
      <Route path="/qa/checklists" component={() => (
        <RouteErrorBoundary>
          <QAChecklists />
        </RouteErrorBoundary>
      )} />
      <Route path="/qa/performance" component={() => (
        <RouteErrorBoundary>
          <QAPerformance />
        </RouteErrorBoundary>
      )} />
      <Route path="/qa/review" component={() => (
        <RouteErrorBoundary>
          <QAReview />
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
      <Route path="/photos/annotate/:photoId" component={() => (
        <RouteErrorBoundary>
          <PhotoAnnotation />
        </RouteErrorBoundary>
      )} />
      <Route path="/photos/cleanup" component={() => (
        <RouteErrorBoundary>
          <PhotoCleanup />
        </RouteErrorBoundary>
      )} />
      <Route path="/conflicts" component={() => (
        <RouteErrorBoundary>
          <ConflictResolution />
        </RouteErrorBoundary>
      )} />
      <Route path="/gamification" component={() => (
        <RouteErrorBoundary>
          <Gamification />
        </RouteErrorBoundary>
      )} />
      <Route path="/challenges" component={() => (
        <RouteErrorBoundary>
          <Challenges />
        </RouteErrorBoundary>
      )} />
      <Route path="/forecast/:id" component={() => (
        <RouteErrorBoundary>
          <Forecast />
        </RouteErrorBoundary>
      )} />
      <Route path="/notification-test" component={() => (
        <RouteErrorBoundary>
          <NotificationTest />
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

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <DevModeBanner />
        <Landing />
      </>
    );
  }

  return (
    <>
      <DevModeBanner />
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-between p-2 border-b">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <NotificationBell />
                <OfflineIndicator />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NotificationProvider>
            <AppContent />
            <Toaster />
            <InstallPrompt />
            <DevModeIndicator />
          </NotificationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
