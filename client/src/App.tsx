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
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { DevModeIndicator } from "@/components/DevModeIndicator";
import { DevModeBanner } from "@/components/DevModeBanner";
import { useAuth } from "@/hooks/useAuth";
import { BiometricEnrollmentPrompt } from "@/components/BiometricEnrollmentPrompt";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationBell } from "@/components/NotificationBell";
import { fetchCsrfToken } from "@/lib/csrfToken";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import type { ShortcutConfig } from "@/hooks/useKeyboardShortcuts";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  RouteLoadingFallback,
  DashboardLoadingFallback,
  PhotoGridLoadingFallback,
  CanvasLoadingFallback,
  ChartLoadingFallback,
} from "@/components/LoadingStates";

// Landing page - always loaded (needed immediately)
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";

// Tier 1: Critical paths - Field work essentials
// These are prioritized for field inspectors doing their daily work
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const FieldDay = lazy(() => import("@/pages/FieldDay"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const Inspection = lazy(() => import("@/pages/Inspection"));

// Tier 2: Common workflows - Photo and documentation
const Photos = lazy(() => import("@/pages/Photos"));
const Schedule = lazy(() => import("@/pages/Schedule"));
const Builders = lazy(() => import("@/pages/Builders"));
const ConstructionManagers = lazy(() => import("@/pages/ConstructionManagers"));
const Equipment = lazy(() => import("@/pages/Equipment"));

// Tier 3: Heavy visualization and editing tools
// These contain heavy libraries like Konva, Recharts, PDF generation
const PhotoAnnotation = lazy(() => 
  import(/* webpackChunkName: "photo-annotation" */ "@/pages/PhotoAnnotation")
);
const Analytics = lazy(() => 
  import(/* webpackChunkName: "analytics" */ "@/pages/Analytics")
);
const Reports = lazy(() => 
  import(/* webpackChunkName: "reports" */ "@/pages/Reports")
);
const CalendarManagement = lazy(() => 
  import(/* webpackChunkName: "calendar" */ "@/pages/CalendarManagement")
);

// Tier 4: Financial and reporting features
const FinancialDashboard = lazy(() => import("@/pages/FinancialDashboard"));
const Invoices = lazy(() => import("@/pages/financial/invoices"));
const Payments = lazy(() => import("@/pages/financial/payments"));
const ARAgingReport = lazy(() => import("@/pages/financial/ar-aging"));
const UnbilledWorkTracker = lazy(() => import("@/pages/financial/unbilled-work"));
const ExpensesSwipe = lazy(() => import("@/pages/financial/expenses"));
const FinancialAnalytics = lazy(() => import("@/pages/financial/analytics"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Mileage = lazy(() => import("@/pages/Mileage"));
const MileageClassify = lazy(() => import("@/pages/MileageClassify"));

// Tier 5: Administrative and settings pages
const SettingsHub = lazy(() => 
  import(/* webpackChunkName: "settings" */ "@/pages/SettingsHub")
);
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminDiagnostics = lazy(() => import("@/pages/AdminDiagnostics"));
const BackgroundJobs = lazy(() => import("@/pages/BackgroundJobs"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const KPISettings = lazy(() => import("@/pages/KPISettings"));
const StatusFeaturesPage = lazy(() => import("@/pages/StatusFeaturesPage"));

// Tier 6: Specialized features and testing
const BlowerDoorTest = lazy(() => import("@/pages/BlowerDoorTest"));
const DuctLeakageTest = lazy(() => import("@/pages/DuctLeakageTest"));
const VentilationTests = lazy(() => import("@/pages/VentilationTests"));
const PhotoCleanup = lazy(() => import("@/pages/PhotoCleanup"));
const Forecast = lazy(() => import("@/pages/Forecast"));
const RouteView = lazy(() => import("@/pages/RouteView"));
const BuilderReview = lazy(() => import("@/pages/BuilderReview"));
const Plans = lazy(() => import("@/pages/Plans"));
const Financials = lazy(() => import("@/pages/Financials"));

// Tier 7: Report templates and instances
const ReportInstancePage = lazy(() => import("@/pages/ReportInstance"));
const ReportTemplates = lazy(() => import("@/pages/ReportTemplates"));
const ReportTemplateDetail = lazy(() => import("@/pages/ReportTemplateDetail"));
const ReportTemplateDesigner = lazy(() => import("@/pages/ReportTemplateDesigner"));
const ReportFillout = lazy(() => import("@/pages/ReportFillout"));
const ScheduledExports = lazy(() => import("@/pages/ScheduledExports"));
const CustomReports = lazy(() => import("@/pages/CustomReports"));

// Tier 8: Calendar and import features
const CalendarPOC = lazy(() => import("@/pages/CalendarPOC"));
const CalendarReview = lazy(() => import("@/pages/CalendarReview"));
const CalendarImportHistory = lazy(() => import("@/pages/CalendarImportHistory"));
const CalendarImportQueuePage = lazy(() => import("@/pages/CalendarImportQueuePage"));

// Tier 9: Tax credit and compliance
const TaxCredit45L = lazy(() => import("@/pages/TaxCredit45L"));
const TaxCreditProject = lazy(() => import("@/pages/TaxCreditProject"));
const TaxCreditCompliance = lazy(() => import("@/pages/TaxCreditCompliance"));
const TaxCreditReports = lazy(() => import("@/pages/TaxCreditReports"));
const ComplianceHub = lazy(() => import("@/pages/ComplianceHub"));

// Tier 10: Quality assurance
const QualityAssurance = lazy(() => import("@/pages/QualityAssurance"));
const QAScoring = lazy(() => import("@/pages/QAScoring"));
const QAChecklists = lazy(() => import("@/pages/QAChecklists"));
const QAPerformance = lazy(() => import("@/pages/QAPerformance"));
const QAReview = lazy(() => import("@/components/QAReview"));
const CalibrationSchedule = lazy(() => import("@/pages/CalibrationSchedule"));
const EquipmentDetails = lazy(() => import("@/pages/EquipmentDetails"));

// Tier 11: Gamification
const Gamification = lazy(() => import("@/pages/Gamification"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const Challenges = lazy(() => import("@/pages/Challenges"));

// Tier 12: Compliance sub-modules
const MultifamilyProgramSetup = lazy(() => import("@/pages/compliance/MultifamilyProgramSetup"));
const BuilderVerifiedItemsTracker = lazy(() => import("@/pages/compliance/BuilderVerifiedItemsTracker"));
const SamplingProtocolCalculator = lazy(() => import("@/pages/compliance/SamplingProtocolCalculator"));
const EnergyStarMFNCChecklist = lazy(() => import("@/pages/compliance/EnergyStarMFNCChecklist"));
const MNHousingEGCCWorksheet = lazy(() => import("@/pages/compliance/MNHousingEGCCWorksheet"));
const ZERHComplianceTracker = lazy(() => import("@/pages/compliance/ZERHComplianceTracker"));
const BenchmarkingDeadlineTracker = lazy(() => import("@/pages/compliance/BenchmarkingDeadlineTracker"));
const ComplianceDocumentsLibrary = lazy(() => import("@/pages/compliance/ComplianceDocumentsLibrary"));

// Tier 13: Miscellaneous and testing
const ConflictResolution = lazy(() => import("@/pages/ConflictResolution"));
const NotificationTest = lazy(() => import("@/pages/NotificationTest"));
const OfflineTest = lazy(() => import("@/pages/offline-test"));
const ReadinessChipTest = lazy(() => import("@/pages/ReadinessChipTest"));

// Generic loading fallback for most routes
const LoadingFallback = () => <RouteLoadingFallback />;

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
          <ProtectedRoute path="/jobs">
            <Jobs />
          </ProtectedRoute>
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
      <Route path="/field-day" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/field-day">
            <FieldDay />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/schedule" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/schedule">
            <Schedule />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/route" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/route">
            <RouteView />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/builders" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/builders">
            <Builders />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/business-data/construction-managers" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/business-data/construction-managers">
            <ConstructionManagers />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/builder-review" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/builder-review">
            <BuilderReview />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/plans" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/plans">
            <Plans />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/financials" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/financials">
            <Financials />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/financial-dashboard" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/financial-dashboard">
            <FinancialDashboard />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/invoices" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/invoices">
            <Invoices />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/invoices/new" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/invoices/new">
            <Invoices />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/invoices/:id" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/invoices/:id">
            <Invoices />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/financial/payments" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/financial/payments">
            <Payments />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/financial/ar-aging" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/financial/ar-aging">
            <ARAgingReport />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/financial/unbilled-work" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/financial/unbilled-work">
            <UnbilledWorkTracker />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/financial/expenses" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/financial/expenses">
            <ExpensesSwipe />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/financial/analytics" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/financial/analytics">
            <FinancialAnalytics />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/expenses" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/expenses">
            <Expenses />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/expenses/new" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/expenses/new">
            <Expenses />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/mileage" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/mileage">
            <Mileage />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/mileage/new" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/mileage/new">
            <Mileage />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/mileage/classify" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/mileage/classify">
            <MileageClassify />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/reports" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/reports">
            <Reports />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/scheduled-exports" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/scheduled-exports">
            <ScheduledExports />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/reports/:id" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/reports/:id">
            <ReportInstancePage />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/report-templates" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/report-templates">
            <ReportTemplates />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/report-templates/:id" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/report-templates/:id">
            <ReportTemplateDetail />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/report-template-designer" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/report-template-designer">
            <ReportTemplateDesigner />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/report-template-designer/:id" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/report-template-designer/:id">
            <ReportTemplateDesigner />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/reports/fillout/:id" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/reports/fillout/:id">
            <ReportFillout />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/blower-door-test" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/blower-door-test">
            <BlowerDoorTest />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/blower-door/:jobId" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/blower-door/:jobId">
            <BlowerDoorTest />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/duct-leakage-test" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/duct-leakage-test">
            <DuctLeakageTest />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/duct-leakage/:jobId" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/duct-leakage/:jobId">
            <DuctLeakageTest />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/ventilation-tests" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/ventilation-tests">
            <VentilationTests />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/ventilation-tests/:jobId" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/ventilation-tests/:jobId">
            <VentilationTests />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/analytics" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/analytics">
            <Analytics />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/audit-logs" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/audit-logs">
            <AuditLogs />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/settings" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/settings">
            <SettingsPage />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/offline-test" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/offline-test">
            <OfflineTest />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/readiness-chip-test" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/readiness-chip-test">
            <ReadinessChipTest />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/settings-hub" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/settings-hub">
            <SettingsHub />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/custom-reports" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/custom-reports">
            <CustomReports />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/kpi-settings" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/kpi-settings">
            <KPISettings />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/admin/diagnostics" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/admin/diagnostics">
            <AdminDiagnostics />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/admin/background-jobs" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/admin/background-jobs">
            <BackgroundJobs />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/status/features" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/status/features">
            <StatusFeaturesPage />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/admin/calendar-import" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/admin/calendar-import">
            <CalendarImportQueuePage />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/calendar-poc" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/calendar-poc">
            <CalendarPOC />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/calendar-review" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/calendar-review">
            <CalendarReview />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/calendar-imports" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/calendar-imports">
            <CalendarImportHistory />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/calendar-management" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/calendar-management">
            <CalendarManagement />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credit/45l" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/tax-credit/45l">
            <TaxCredit45L />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credits" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/tax-credits">
            <TaxCredit45L />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credits/projects/new" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/tax-credits/projects/new">
            <TaxCreditProject />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credits/projects/:id" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/tax-credits/projects/:id">
            <TaxCreditProject />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credits/compliance" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/tax-credits/compliance">
            <TaxCreditCompliance />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/tax-credits/reports" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/tax-credits/reports">
            <TaxCreditReports />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/equipment" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/equipment">
            <Equipment />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/equipment/calibrations" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/equipment/calibrations">
            <CalibrationSchedule />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/equipment/:id" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/equipment/:id">
            <EquipmentDetails />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/qa" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/qa">
            <QualityAssurance />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/qa/scoring" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/qa/scoring">
            <QAScoring />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/qa/scoring/:jobId" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/qa/scoring/:jobId">
            <QAScoring />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/qa/checklists" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/qa/checklists">
            <QAChecklists />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/qa/performance" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/qa/performance">
            <QAPerformance />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/qa/review" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/qa/review">
            <QAReview />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/inspection/:id" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/inspection/:id">
            <Inspection />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/photos" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/photos">
            <Photos />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/photos/:id" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/photos/:id">
            <Photos />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/photos/annotate/:photoId" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/photos/annotate/:photoId">
            <PhotoAnnotation />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/photos/cleanup" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/photos/cleanup">
            <PhotoCleanup />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/conflicts" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/conflicts">
            <ConflictResolution />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/gamification" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/gamification">
            <Gamification />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/achievements" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/achievements">
            <Achievements />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/challenges" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/challenges">
            <Challenges />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/forecast/:id" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/forecast/:id">
            <Forecast />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/notification-test" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/notification-test">
            <NotificationTest />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/compliance" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/compliance">
            <ComplianceHub />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/compliance/multifamily-setup" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/compliance/multifamily-setup">
            <MultifamilyProgramSetup />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/compliance/builder-verified-items/:jobId" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/compliance/builder-verified-items/:jobId">
            <BuilderVerifiedItemsTracker />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/compliance/sampling-calculator" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/compliance/sampling-calculator">
            <SamplingProtocolCalculator />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/compliance/energy-star-checklist/:jobId" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/compliance/energy-star-checklist/:jobId">
            <EnergyStarMFNCChecklist />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/compliance/mn-housing-egcc/:jobId" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/compliance/mn-housing-egcc/:jobId">
            <MNHousingEGCCWorksheet />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/compliance/zerh-tracker/:jobId" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/compliance/zerh-tracker/:jobId">
            <ZERHComplianceTracker />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/compliance/benchmarking-tracker/:buildingId" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/compliance/benchmarking-tracker/:buildingId">
            <BenchmarkingDeadlineTracker />
          </ProtectedRoute>
        </RouteErrorBoundary>
      )} />
      <Route path="/compliance/documents" component={() => (
        <RouteErrorBoundary>
          <ProtectedRoute path="/compliance/documents">
            <ComplianceDocumentsLibrary />
          </ProtectedRoute>
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

  // Global keyboard shortcuts with enhanced functionality
  useGlobalShortcuts({
    onShowShortcuts: () => setShowShortcutsModal(true),
    onGoHome: () => navigate('/'),
    onGoJobs: () => navigate('/jobs'),
    onGoBuilders: () => navigate('/builders'),
    onGoPhotos: () => navigate('/photos'),
    onGoSchedule: () => navigate('/schedule'),
    onGoEquipment: () => navigate('/equipment'),
    onGoFieldDay: () => navigate('/field-day'),
    onNewJob: () => navigate('/jobs?new=true'),
    onQuickSearch: () => {
      // Open command palette/search - could integrate with a command palette component
      const searchInput = document.querySelector('[data-testid="search-input"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    onSaveForm: () => {
      // Trigger save on active form
      const event = new CustomEvent('keyboard-save');
      window.dispatchEvent(event);
    },
    onCloseModal: () => {
      // Close active modal/dialog
      const closeButton = document.querySelector('[data-testid*="close"], [aria-label*="close"]') as HTMLButtonElement;
      if (closeButton) {
        closeButton.click();
      }
    },
    onQuickNav: (index: number) => {
      // Quick navigation to menu items by index
      const menuItems = [
        '/',
        '/jobs',
        '/field-day',
        '/photos',
        '/builders',
        '/schedule',
        '/financial-dashboard',
        '/reports',
        '/settings'
      ];
      if (index <= menuItems.length) {
        navigate(menuItems[index - 1]);
      }
    }
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
        // CSRF token will be fetched on first API request if not available
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
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 border-b gap-2">
              <div className="flex items-center gap-2 flex-1">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <Breadcrumbs className="hidden sm:flex flex-1" maxItems={4} />
              </div>
              <div className="flex items-center gap-2">
                <SyncStatusBadge />
                <NotificationBell />
                <OfflineIndicator />
              </div>
            </header>
            {/* Mobile breadcrumbs - shown below header on small screens */}
            <div className="sm:hidden px-2 py-1 border-b">
              <Breadcrumbs maxItems={2} />
            </div>
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
            <PWAInstallBanner />
            <InstallPrompt />
            <DevModeIndicator />
            <BiometricEnrollmentPrompt />
          </NotificationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
