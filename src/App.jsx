import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HRLayout from './components/HRLayout';
import AdminLayout from './components/AdminLayout';
import EmployeeLayout from './components/EmployeeLayout';
import { useAuth } from './context/AuthContext';
import HRDashboard from './pages/HRDashboard';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeProfilePage from './pages/EmployeeProfilePage';
import ApplyLeavePage from './pages/ApplyLeavePage';
import HRLeavesPage from './pages/HRLeavesPage';
import CalendarPage from './pages/CalendarPage';
import HRPayrollPage from './pages/HRPayrollPage';
import HRPayrollEmployeePage from './pages/HRPayrollEmployeePage';
import HRStatutorySettingsPage from './pages/HRStatutorySettingsPage';
import HRStatutoryCompliancePage from './pages/HRStatutoryCompliancePage';
import HRTaxDeclarationPage from './pages/HRTaxDeclarationPage';
import HRForm16Page from './pages/HRForm16Page';
import EmployeePayslipsPage from './pages/EmployeePayslipsPage';
import HRAttendancePage from './pages/HRAttendancePage';
import HRProjectsPage from './pages/HRProjectsPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeAttendancePage from './pages/EmployeeAttendancePage';
import EmployeeProjectsPage from './pages/EmployeeProjectsPage';
import OfferLetterPage from './pages/OfferLetterPage';
import EmployeeIDCardPage from './pages/EmployeeIDCardPage';
import EmployeeComplaintsPage from './pages/EmployeeComplaintsPage';
import HRComplaintsPage from './pages/HRComplaintsPage';
import HRAuditLogsPage from './pages/HRAuditLogsPage';
import HRPerformancePage from './pages/HRPerformancePage';
import HROnboardingPage from './pages/HROnboardingPage';
import HRDepartmentsPage from './pages/HRDepartmentsPage';
import HROrgChartPage from './pages/HROrgChartPage';
import HRExpenseApprovalsPage from './pages/HRExpenseApprovalsPage';
import HRReimbursementSummaryPage from './pages/HRReimbursementSummaryPage';
import HRShiftManagementPage from './pages/HRShiftManagementPage';
import HRLeaveEncashmentPage from './pages/HRLeaveEncashmentPage';
import HROffboardingPage from './pages/HROffboardingPage';
import HRAssetsPage from './pages/HRAssetsPage';
import ChatPage from './pages/ChatPage';
import MeetingsPage from './pages/MeetingsPage';
import MeetingRoomPage from './pages/MeetingRoomPage';
import DrivePage from './pages/DrivePage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import EmployeePerformancePage from './pages/EmployeePerformancePage';
import EmployeeOnboardingPage from './pages/EmployeeOnboardingPage';
import EmployeeExpensesPage from './pages/EmployeeExpensesPage';
import EmployeeLeaveEncashmentPage from './pages/EmployeeLeaveEncashmentPage';
import EmployeeExitInterviewPage from './pages/EmployeeExitInterviewPage';
import EmployeeAssetsPage from './pages/EmployeeAssetsPage';
import EmployeeTaxDeclarationPage from './pages/EmployeeTaxDeclarationPage';
import EmployeeForm16Page from './pages/EmployeeForm16Page';
import EmployeeSalaryStructurePage from './pages/EmployeeSalaryStructurePage';
import HRHelpDeskPage from './pages/HRHelpDeskPage';
import EmployeeHelpDeskPage from './pages/EmployeeHelpDeskPage';
import HRSurveysPage from './pages/HRSurveysPage';
import HRSurveyCreatePage from './pages/HRSurveyCreatePage';
import HRSurveyResultsPage from './pages/HRSurveyResultsPage';
import EmployeeSurveysPage from './pages/EmployeeSurveysPage';
import EmployeeSurveyFillPage from './pages/EmployeeSurveyFillPage';
import AdminManagementPage from './pages/AdminManagementPage';
import { Toaster } from 'react-hot-toast';
import { SocketProvider, useSocket } from './context/SocketContext';
import CallModal from './components/Chat/CallModal';
import './index.css';

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
          <Routes>
          {/* Public Route */}
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
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
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
