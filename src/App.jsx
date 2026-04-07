import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HRLayout from './components/HRLayout';
import AdminLayout from './components/AdminLayout';
import EmployeeLayout from './components/EmployeeLayout';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { SocketProvider, useSocket } from './context/SocketContext';
import CallModal from './components/Chat/CallModal';
import './index.css';

const pageModules = import.meta.glob('./pages/*.{jsx,js}');

const lazyPage = (path) => lazy(async () => {
  const loader = pageModules[`${path}.jsx`] || pageModules[`${path}.js`] || pageModules[path];
  if (!loader) {
    throw new Error(`Lazy page module not found for path: ${path}`);
  }
  return loader();
});

const LoginPage = lazyPage('./pages/LoginPage');
const LandingPage = lazyPage('./pages/LandingPage');
const ForgotPasswordPage = lazyPage('./pages/ForgotPasswordPage');
const ResetPasswordPage = lazyPage('./pages/ResetPasswordPage');
const HRDashboard = lazyPage('./pages/HRDashboard');
const EmployeesPage = lazyPage('./pages/EmployeesPage');
const EmployeeProfilePage = lazyPage('./pages/EmployeeProfilePage');
const ApplyLeavePage = lazyPage('./pages/ApplyLeavePage');
const HRLeavesPage = lazyPage('./pages/HRLeavesPage');
const CalendarPage = lazyPage('./pages/CalendarPage');
const HRPayrollPage = lazyPage('./pages/HRPayrollPage');
const HRPayrollEmployeePage = lazyPage('./pages/HRPayrollEmployeePage');
const HRStatutorySettingsPage = lazyPage('./pages/HRStatutorySettingsPage');
const HRStatutoryCompliancePage = lazyPage('./pages/HRStatutoryCompliancePage');
const HRTaxDeclarationPage = lazyPage('./pages/HRTaxDeclarationPage');
const HRForm16Page = lazyPage('./pages/HRForm16Page');
const EmployeePayslipsPage = lazyPage('./pages/EmployeePayslipsPage');
const HRAttendancePage = lazyPage('./pages/HRAttendancePage');
const HRProjectsPage = lazyPage('./pages/HRProjectsPage');
const EmployeeDashboard = lazyPage('./pages/EmployeeDashboard');
const EmployeeAttendancePage = lazyPage('./pages/EmployeeAttendancePage');
const EmployeeProjectsPage = lazyPage('./pages/EmployeeProjectsPage');
const OfferLetterPage = lazyPage('./pages/OfferLetterPage');
const EmployeeIDCardPage = lazyPage('./pages/EmployeeIDCardPage');
const EmployeeComplaintsPage = lazyPage('./pages/EmployeeComplaintsPage');
const HRComplaintsPage = lazyPage('./pages/HRComplaintsPage');
const HRAuditLogsPage = lazyPage('./pages/HRAuditLogsPage');
const HRPerformancePage = lazyPage('./pages/HRPerformancePage');
const HROnboardingPage = lazyPage('./pages/HROnboardingPage');
const HRDepartmentsPage = lazyPage('./pages/HRDepartmentsPage');
const HROrgChartPage = lazyPage('./pages/HROrgChartPage');
const HRExpenseApprovalsPage = lazyPage('./pages/HRExpenseApprovalsPage');
const HRReimbursementSummaryPage = lazyPage('./pages/HRReimbursementSummaryPage');
const HRShiftManagementPage = lazyPage('./pages/HRShiftManagementPage');
const HRLeaveEncashmentPage = lazyPage('./pages/HRLeaveEncashmentPage');
const HROffboardingPage = lazyPage('./pages/HROffboardingPage');
const HRAssetsPage = lazyPage('./pages/HRAssetsPage');
const ChatPage = lazyPage('./pages/ChatPage');
const MeetingsPage = lazyPage('./pages/MeetingsPage');
const MeetingRoomPage = lazyPage('./pages/MeetingRoomPage');
const DrivePage = lazyPage('./pages/DrivePage');
const SettingsPage = lazyPage('./pages/SettingsPage');
const ProfilePage = lazyPage('./pages/ProfilePage');
const EmployeePerformancePage = lazyPage('./pages/EmployeePerformancePage');
const EmployeeOnboardingPage = lazyPage('./pages/EmployeeOnboardingPage');
const EmployeeExpensesPage = lazyPage('./pages/EmployeeExpensesPage');
const EmployeeLeaveEncashmentPage = lazyPage('./pages/EmployeeLeaveEncashmentPage');
const EmployeeExitInterviewPage = lazyPage('./pages/EmployeeExitInterviewPage');
const EmployeeAssetsPage = lazyPage('./pages/EmployeeAssetsPage');
const EmployeeTaxDeclarationPage = lazyPage('./pages/EmployeeTaxDeclarationPage');
const EmployeeForm16Page = lazyPage('./pages/EmployeeForm16Page');
const EmployeeSalaryStructurePage = lazyPage('./pages/EmployeeSalaryStructurePage');
const HRHelpDeskPage = lazyPage('./pages/HRHelpDeskPage');
const EmployeeHelpDeskPage = lazyPage('./pages/EmployeeHelpDeskPage');
const HRSurveysPage = lazyPage('./pages/HRSurveysPage');
const HRSurveyCreatePage = lazyPage('./pages/HRSurveyCreatePage');
const HRSurveyResultsPage = lazyPage('./pages/HRSurveyResultsPage');
const EmployeeSurveysPage = lazyPage('./pages/EmployeeSurveysPage');
const EmployeeSurveyFillPage = lazyPage('./pages/EmployeeSurveyFillPage');
const AdminManagementPage = lazyPage('./pages/AdminManagementPage');

const getRoleBasePath = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'hr') return '/hr';
  return '/employee';
};

const LegacySharedRedirect = ({ section }) => {
  const { profile } = useAuth();
  const { id } = useParams();

  if (!profile?.role) {
    return <Navigate to="/login" replace />;
  }

  const basePath = getRoleBasePath(profile.role);
  const targetPath = section === 'meeting-room'
    ? `${basePath}/meetings/${id}`
    : `${basePath}/${section}`;

  return <Navigate to={targetPath} replace />;
};

function App() {
  useEffect(() => {
    const handleFocusIn = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.readOnly || target.disabled) return;

      const supportedTypes = new Set(['number', 'text', 'tel']);
      if (!supportedTypes.has((target.type || '').toLowerCase())) return;
      if (String(target.value).trim() !== '0') return;

      // Select the default 0 so first keypress replaces it instead of appending.
      requestAnimationFrame(() => {
        try {
          target.select();
        } catch (_) {
          // Ignore non-selectable inputs.
        }
      });
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Toaster position="top-center" />
          <GlobalCallContainer />
          <Suspense
            fallback={
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading page...
              </div>
            }
          >
            <Routes>
            {/* Public Route */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* HR Routes */}
            <Route path="/hr/*" element={
              <ProtectedRoute requiredRole={['hr', 'admin']}>
                <HRLayout>
                  <Routes>
                    <Route path="dashboard" element={<HRDashboard />} />
                    <Route path="employees" element={<EmployeesPage />} />
                    <Route path="employees/offboarding" element={<HROffboardingPage />} />
                    <Route path="assets" element={<HRAssetsPage />} />
                    <Route path="employees/:id" element={<EmployeeProfilePage />} />
                    <Route path="leaves" element={<HRLeavesPage />} />
                    <Route path="attendance" element={<HRAttendancePage />} />
                    <Route path="projects" element={<HRProjectsPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="offer-letters" element={<OfferLetterPage />} />
                    <Route path="payroll" element={<HRPayrollPage />} />
                    <Route path="payroll/:employeeId" element={<HRPayrollEmployeePage />} />
                    <Route path="payroll/statutory-settings" element={<HRStatutorySettingsPage />} />
                    <Route path="payroll/statutory-compliance" element={<HRStatutoryCompliancePage />} />
                    <Route path="tax-declarations" element={<HRTaxDeclarationPage />} />
                    <Route path="form16" element={<HRForm16Page />} />
                    <Route path="complaints" element={<HRComplaintsPage />} />
                    <Route path="performance" element={<HRPerformancePage />} />
                    <Route path="onboarding" element={<HROnboardingPage />} />
                    <Route path="departments" element={<HRDepartmentsPage />} />
                    <Route path="org-chart" element={<HROrgChartPage />} />
                    <Route path="expense-approvals" element={<HRExpenseApprovalsPage />} />
                    <Route path="reimbursement-summary" element={<HRReimbursementSummaryPage />} />
                    <Route path="shifts" element={<HRShiftManagementPage />} />
                    <Route path="leave-encashment" element={<HRLeaveEncashmentPage />} />
                    <Route path="helpdesk" element={<HRHelpDeskPage />} />
                    <Route path="surveys" element={<HRSurveysPage />} />
                    <Route path="surveys/create" element={<HRSurveyCreatePage />} />
                    <Route path="surveys/:id/results" element={<HRSurveyResultsPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="meetings" element={<MeetingsPage />} />
                    <Route path="meetings/:id" element={<MeetingRoomPage />} />
                    <Route path="drive" element={<DrivePage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/hr/dashboard" replace />} />
                  </Routes>
                </HRLayout>
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <Routes>
                    <Route path="dashboard" element={<HRDashboard />} />
                    <Route path="admin-management" element={<AdminManagementPage />} />
                    <Route path="employees" element={<EmployeesPage />} />
                    <Route path="employees/offboarding" element={<HROffboardingPage />} />
                    <Route path="employees/:id" element={<EmployeeProfilePage />} />
                    <Route path="leaves" element={<HRLeavesPage />} />
                    <Route path="attendance" element={<HRAttendancePage />} />
                    <Route path="projects" element={<HRProjectsPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="offer-letters" element={<OfferLetterPage />} />
                    <Route path="payroll" element={<HRPayrollPage />} />
                    <Route path="payroll/:employeeId" element={<HRPayrollEmployeePage />} />
                    <Route path="payroll/statutory-settings" element={<HRStatutorySettingsPage />} />
                    <Route path="payroll/statutory-compliance" element={<HRStatutoryCompliancePage />} />
                    <Route path="tax-declarations" element={<HRTaxDeclarationPage />} />
                    <Route path="form16" element={<HRForm16Page />} />
                    <Route path="complaints" element={<HRComplaintsPage />} />
                    <Route path="audit-logs" element={<HRAuditLogsPage />} />
                    <Route path="performance" element={<HRPerformancePage />} />
                    <Route path="onboarding" element={<HROnboardingPage />} />
                    <Route path="departments" element={<HRDepartmentsPage />} />
                    <Route path="org-chart" element={<HROrgChartPage />} />
                    <Route path="expense-approvals" element={<HRExpenseApprovalsPage />} />
                    <Route path="reimbursement-summary" element={<HRReimbursementSummaryPage />} />
                    <Route path="shifts" element={<HRShiftManagementPage />} />
                    <Route path="leave-encashment" element={<HRLeaveEncashmentPage />} />
                    <Route path="helpdesk" element={<HRHelpDeskPage />} />
                    <Route path="surveys" element={<HRSurveysPage />} />
                    <Route path="surveys/create" element={<HRSurveyCreatePage />} />
                    <Route path="surveys/:id/results" element={<HRSurveyResultsPage />} />
                    <Route path="assets" element={<HRAssetsPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="meetings" element={<MeetingsPage />} />
                    <Route path="meetings/:id" element={<MeetingRoomPage />} />
                    <Route path="drive" element={<DrivePage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* Employee Routes */}
            <Route path="/employee/*" element={
              <ProtectedRoute requiredRole="employee">
                <EmployeeLayout>
                  <Routes>
                    <Route path="dashboard" element={<EmployeeDashboard />} />
                    <Route path="attendance" element={<EmployeeAttendancePage />} />
                    <Route path="projects" element={<EmployeeProjectsPage />} />
                    <Route path="apply-leave" element={<ApplyLeavePage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="payslips" element={<EmployeePayslipsPage />} />
                    <Route path="expenses" element={<EmployeeExpensesPage />} />
                    <Route path="leave-encashment" element={<EmployeeLeaveEncashmentPage />} />
                    <Route path="tax-declaration" element={<EmployeeTaxDeclarationPage />} />
                    <Route path="form16" element={<EmployeeForm16Page />} />
                    <Route path="salary-structure" element={<EmployeeSalaryStructurePage />} />
                    <Route path="exit-interview" element={<EmployeeExitInterviewPage />} />
                    <Route path="assets" element={<EmployeeAssetsPage />} />
                    <Route path="id-card" element={<EmployeeIDCardPage />} />
                    <Route path="complaints" element={<EmployeeComplaintsPage />} />
                    <Route path="helpdesk" element={<EmployeeHelpDeskPage />} />
                    <Route path="surveys" element={<EmployeeSurveysPage />} />
                    <Route path="surveys/:id" element={<EmployeeSurveyFillPage />} />
                    <Route path="performance" element={<EmployeePerformancePage />} />
                    <Route path="onboarding" element={<EmployeeOnboardingPage />} />
                    <Route path="profile/:id" element={<EmployeeProfilePage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="meetings" element={<MeetingsPage />} />
                    <Route path="meetings/:id" element={<MeetingRoomPage />} />
                    <Route path="drive" element={<DrivePage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/employee/dashboard" replace />} />
                  </Routes>
                </EmployeeLayout>
              </ProtectedRoute>
            } />

            {/* Legacy shared routes redirected to role-scoped routes */}
            <Route path="/chat" element={
              <ProtectedRoute>
                <LegacySharedRedirect section="chat" />
              </ProtectedRoute>
            } />
            <Route path="/meetings" element={
              <ProtectedRoute>
                <LegacySharedRedirect section="meetings" />
              </ProtectedRoute>
            } />
            <Route path="/meetings/:id" element={
              <ProtectedRoute>
                <LegacySharedRedirect section="meeting-room" />
              </ProtectedRoute>
            } />
            <Route path="/drive" element={
              <ProtectedRoute>
                <LegacySharedRedirect section="drive" />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <LegacySharedRedirect section="profile" />
              </ProtectedRoute>
            } />

            {/* Redirects */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

function GlobalCallContainer() {
  const { callConfig, setCallConfig, socket } = useSocket();
  const { user } = useAuth();

  if (!callConfig) return null;

  return (
    <CallModal
      isOpen={!!callConfig}
      onClose={() => setCallConfig(null)}
      type={callConfig.type}
      remoteUser={callConfig.remoteUser}
      isIncoming={callConfig.isIncoming}
      incomingOffer={callConfig.offer || null}
      socket={socket}
      currentUser={user}
    />
  );
}

export default App;
