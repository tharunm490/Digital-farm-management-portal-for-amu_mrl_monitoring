import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Homepage from './pages/Homepage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AddFarm from './pages/AddFarm';
import FarmList from './pages/FarmList';
import BatchManagement from './pages/BatchManagement';
import TreatmentManagement from './pages/TreatmentManagement';
import VaccinationManagement from './pages/VaccinationManagement';
import QRGenerator from './pages/QRGenerator';
import AuthCallback from './pages/AuthCallback';
import RoleSelection from './pages/RoleSelection';
import AMURecords from './pages/AMURecords';
import FarmerNotifications from './pages/FarmerNotifications';
import TreatmentRequestManagement from './pages/TreatmentRequestManagement';
import ApplyForLoan from './pages/ApplyForLoan';
import LoanStatus from './pages/LoanStatus';
import AuthorityNavigation from './components/AuthorityNavigation';
import AuthorityDashboard from './pages/authority/AuthorityDashboard';
import AuthorityAMUAnalytics from './pages/authority/AuthorityAMUAnalytics';
import AuthorityHeatMap from './pages/authority/AuthorityHeatMap';
import AuthorityComplaints from './pages/authority/AuthorityComplaints';
import AuthorityReports from './pages/authority/AuthorityReports';
import AuthorityMapView from './pages/authority/AuthorityMapView';
import AuthorityProfile from './pages/authority/AuthorityProfile';
import AuthorityNotifications from './pages/authority/AuthorityNotifications';
import AuthorityLoanApplications from './pages/authority/AuthorityLoanApplications';
import AuthorityLoanDetail from './pages/authority/AuthorityLoanDetail';
import './App.css';

// Authority Routes Component
const AuthorityRoutes = () => {
  return (
    <>
      <AuthorityNavigation />
      <Routes>
        <Route path="/dashboard" element={<AuthorityDashboard />} />
        <Route path="/amu-analytics" element={<AuthorityAMUAnalytics />} />
        <Route path="/heat-map" element={<AuthorityHeatMap />} />
        <Route path="/complaints" element={<AuthorityComplaints />} />
        <Route path="/reports" element={<AuthorityReports />} />
        <Route path="/map-view" element={<AuthorityMapView />} />
        <Route path="/profile" element={<AuthorityProfile />} />
        <Route path="/notifications" element={<AuthorityNotifications />} />
        <Route path="/loan-applications" element={<AuthorityLoanApplications />} />
        <Route path="/loan-detail/:loanId" element={<AuthorityLoanDetail />} />
        <Route path="/" element={<Navigate to="/authority/dashboard" />} />
      </Routes>
    </>
  );
};

function AppRoutes() {
  const { user } = useAuth();
  
  // Redirect authority users to their dashboard
  if (user && user.role === 'authority') {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/authority/dashboard" />} />
        <Route path="/authority/*" element={<AuthorityRoutes />} />
        <Route path="*" element={<Navigate to="/authority/dashboard" />} />
      </Routes>
    );
  }
  
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/role-selection" element={<RoleSelection />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><FarmerNotifications /></ProtectedRoute>} />
      <Route path="/treatment-requests" element={<ProtectedRoute><TreatmentRequestManagement /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/farms" element={<ProtectedRoute><FarmList /></ProtectedRoute>} />
      <Route path="/add-farm" element={<ProtectedRoute><AddFarm /></ProtectedRoute>} />
      <Route path="/batches" element={<ProtectedRoute><BatchManagement /></ProtectedRoute>} />
      <Route path="/batches/farm/:farm_id" element={<ProtectedRoute><BatchManagement /></ProtectedRoute>} />
      <Route path="/animals" element={<ProtectedRoute><BatchManagement /></ProtectedRoute>} />
      <Route path="/treatments" element={<ProtectedRoute><TreatmentManagement /></ProtectedRoute>} />
      <Route path="/treatments/entity/:entity_id" element={<ProtectedRoute><TreatmentManagement /></ProtectedRoute>} />
      <Route path="/vaccinations" element={<ProtectedRoute><VaccinationManagement /></ProtectedRoute>} />
      <Route path="/vaccinations/entity/:entity_id" element={<ProtectedRoute><VaccinationManagement /></ProtectedRoute>} />
      <Route path="/qr-generator" element={<ProtectedRoute><QRGenerator /></ProtectedRoute>} />
      <Route path="/amu-records" element={<ProtectedRoute><AMURecords /></ProtectedRoute>} />
      <Route path="/apply-loan" element={<ProtectedRoute><ApplyForLoan /></ProtectedRoute>} />
      <Route path="/loan-status" element={<ProtectedRoute><LoanStatus /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
