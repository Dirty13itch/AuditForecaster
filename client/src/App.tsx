import { initSentry } from "@/lib/sentry";
initSentry();

import { useEffect, useState, lazy, Suspense } from "react";
import { Switch, Route, useParams, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { InstallPrompt } from "@/components/InstallPrompt";
import { DevModeIndicator } from "@/components/DevModeIndicator";
import { DevModeBanner } from "@/components/DevModeBanner";
import { useAuth } from "@/hooks/useAuth";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationBell } from "@/components/NotificationBell";
import { fetchCsrfToken } from "@/lib/csrfToken";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import type { ShortcutConfig } from "@/hooks/useKeyboardShortcuts";

import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Inspection = lazy(() => import("@/pages/Inspection"));
const Photos = lazy(() => import("@/pages/Photos"));
const PhotoAnnotation = lazy(() => import("@/pages/PhotoAnnotation"));
const PhotoCleanup = lazy(() => import("@/pages/PhotoCleanup"));
const Forecast = lazy(() => import("@/pages/Forecast"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const Gamification = lazy(() => import("@/pages/Gamification"));
const Challenges = lazy(() => import("@/pages/Challenges"));
const Schedule = lazy(() => import("@/pages/Schedule"));
const RouteView = lazy(() => import("@/pages/RouteView"));
const Builders = lazy(() => import("@/pages/Builders"));
const Plans = lazy(() => import("@/pages/Plans"));
const Financials = lazy(() => import("@/pages/Financials"));
const FinancialDashboard = lazy(() => import("@/pages/FinancialDashboard"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Mileage = lazy(() => import("@/pages/Mileage"));
const MileageClassify = lazy(() => import("@/pages/MileageClassify"));
const Reports = lazy(() => import("@/pages/Reports"));
const ReportInstancePage = lazy(() => import("@/pages/ReportInstance"));
const ReportTemplates = lazy(() => import("@/pages/ReportTemplates"));
const ReportTemplateDetail = lazy(() => import("@/pages/ReportTemplateDetail"));
const ReportTemplateDesigner = lazy(() => import("@/pages/ReportTemplateDesigner"));
const ReportFillout = lazy(() => import("@/pages/ReportFillout"));
const ScheduledExports = lazy(() => import("@/pages/ScheduledExports"));
const BlowerDoorTest = lazy(() => import("@/pages/BlowerDoorTest"));
const DuctLeakageTest = lazy(() => import("@/pages/DuctLeakageTest"));
const VentilationTests = lazy(() => import("@/pages/VentilationTests"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminDiagnostics = lazy(() => import("@/pages/AdminDiagnostics"));
const CalendarPOC = lazy(() => import("@/pages/CalendarPOC"));
const CalendarReview = lazy(() => import("@/pages/CalendarReview"));
const CalendarImportHistory = lazy(() => import("@/pages/CalendarImportHistory"));
const CalendarImportQueuePage = lazy(() => import("@/pages/CalendarImportQueuePage"));
const CalendarManagement = lazy(() => import("@/pages/CalendarManagement"));
const TaxCredit45L = lazy(() => import("@/pages/TaxCredit45L"));
const TaxCreditProject = lazy(() => import("@/pages/TaxCreditProject"));
const TaxCreditCompliance = lazy(() => import("@/pages/TaxCreditCompliance"));
const TaxCreditReports = lazy(() => import("@/pages/TaxCreditReports"));
const Equipment = lazy(() => import("@/pages/Equipment"));
const EquipmentDetails = lazy(() => import("@/pages/EquipmentDetails"));
const CalibrationSchedule = lazy(() => import("@/pages/CalibrationSchedule"));
const QualityAssurance = lazy(() => import("@/pages/QualityAssurance"));
const QAScoring = lazy(() => import("@/pages/QAScoring"));
const QAChecklists = lazy(() => import("@/pages/QAChecklists"));
const QAPerformance = lazy(() => import("@/pages/QAPerformance"));
const QAReview = lazy(() => import("@/components/QAReview"));
const ConflictResolution = lazy(() => import("@/pages/ConflictResolution"));
const CustomReports = lazy(() => import("@/pages/CustomReports"));
const KPISettings = lazy(() => import("@/pages/KPISettings"));
const NotificationTest = lazy(() => import("@/pages/NotificationTest"));

const LoadingFallback = () => (
  <div className="flex h-full items-center justify-center">
    <div className="text-center space-y-4">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
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
      <Route path="/mileage/classify" component={() => (
        <RouteErrorBoundary>
          <MileageClassify />
        </RouteErrorBoundary>
      )} />
      <Route path="/reports" component={() => (
        <RouteErrorBoundary>
          <Reports />
        </RouteErrorBoundary>
      )} />
      <Route path="/scheduled-exports" component={() => (
        <RouteErrorBoundary>
          <ScheduledExports />
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
      <Route path="/report-templates/:id" component={() => (
        <RouteErrorBoundary>
          <ReportTemplateDetail />
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
      <Route path="/ventilation-tests" component={() => (
        <RouteErrorBoundary>
          <VentilationTests />
        </RouteErrorBoundary>
      )} />
      <Route path="/ventilation-tests/:jobId" component={() => (
        <RouteErrorBoundary>
          <VentilationTests />
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
      <Route path="/calendar-management" component={() => (
        <RouteErrorBoundary>
          <CalendarManagement />
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credit/45l" component={() => (
        <RouteErrorBoundary>
          <TaxCredit45L />
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
    </Suspense>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  // Global keyboard shortcuts
  useGlobalShortcuts({
    onShowShortcuts: () => setShowShortcutsModal(true),
    onGoHome: () => navigate('/'),
    onGoJobs: () => navigate('/jobs'),
    onGoBuilders: () => navigate('/builders'),
    onGoPhotos: () => navigate('/photos'),
    onGoSchedule: () => navigate('/schedule'),
    onGoEquipment: () => navigate('/equipment'),
  });

  // Collect all shortcuts for the modal
  const allShortcuts: ShortcutConfig[] = [
    {
      id: 'show-shortcuts',
      description: 'Show keyboard shortcuts',
      category: 'global',
      key: '?',
      modifiers: { shift: true },
      handler: () => setShowShortcutsModal(true)
    },
    {
      id: 'go-home',
      description: 'Go to Dashboard',
      category: 'navigation',
      key: 'g+h',
      sequence: true,
      handler: () => navigate('/')
    },
    {
      id: 'go-jobs',
      description: 'Go to Jobs',
      category: 'navigation',
      key: 'g+j',
      sequence: true,
      handler: () => navigate('/jobs')
    },
    {
      id: 'go-builders',
      description: 'Go to Builders',
      category: 'navigation',
      key: 'g+b',
      sequence: true,
      handler: () => navigate('/builders')
    },
    {
      id: 'go-photos',
      description: 'Go to Photos',
      category: 'navigation',
      key: 'g+p',
      sequence: true,
      handler: () => navigate('/photos')
    },
    {
      id: 'go-schedule',
      description: 'Go to Schedule',
      category: 'navigation',
      key: 'g+s',
      sequence: true,
      handler: () => navigate('/schedule')
    },
    {
      id: 'go-equipment',
      description: 'Go to Equipment',
      category: 'navigation',
      key: 'g+e',
      sequence: true,
      handler: () => navigate('/equipment')
    },
  ];

  // Pre-fetch CSRF token when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCsrfToken().catch(err => {
        console.error('[App] Failed to pre-fetch CSRF token:', err);
      });
    }
  }, [isAuthenticated]);

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
      <SidebarProvider 
        style={style as React.CSSProperties} 
        defaultOpen={false}
      >
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
      
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        shortcuts={allShortcuts}
      />
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
