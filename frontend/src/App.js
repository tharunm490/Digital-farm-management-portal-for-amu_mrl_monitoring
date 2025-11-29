import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import VetDashboard from './pages/VetDashboard';
import CreatePrescription from './pages/CreatePrescription';
import VetTreatmentRecording from './pages/VetTreatmentRecording';
import VetWithdrawalAlerts from './pages/VetWithdrawalAlerts';
import ProcessorPortal from './pages/ProcessorPortal';
import AuthorityAnalytics from './pages/AuthorityAnalytics';
import AuthorityDashboard from './pages/AuthorityDashboard';
import QRVerification from './pages/QRVerification';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/role-selection" element={<RoleSelection />} />
      <Route path="/verify/:hash" element={<QRVerification />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><FarmerNotifications /></ProtectedRoute>} />
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

      {/* Veterinarian Routes */}
      <Route path="/vet/dashboard" element={<ProtectedRoute><VetDashboard /></ProtectedRoute>} />
      <Route path="/vet/create-prescription" element={<ProtectedRoute><CreatePrescription /></ProtectedRoute>} />
      <Route path="/vet/record-treatment" element={<ProtectedRoute><VetTreatmentRecording /></ProtectedRoute>} />
      <Route path="/vet/record-treatment/:farmId" element={<ProtectedRoute><VetTreatmentRecording /></ProtectedRoute>} />
      <Route path="/vet/withdrawals" element={<ProtectedRoute><VetWithdrawalAlerts /></ProtectedRoute>} />

      {/* Processor Routes */}
      <Route path="/processor/portal" element={<ProtectedRoute><ProcessorPortal /></ProtectedRoute>} />

      {/* Authority Routes */}
      <Route path="/authority/dashboard" element={<ProtectedRoute><AuthorityDashboard /></ProtectedRoute>} />
      <Route path="/authority/analytics" element={<ProtectedRoute><AuthorityAnalytics /></ProtectedRoute>} />
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
