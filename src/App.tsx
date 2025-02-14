import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminTransfersPage from './pages/admin/TransfersPage';
import AdminTransferDetailPage from './pages/admin/TransferDetailPage';
import AdminStatsPage from './pages/admin/StatsPage';
import AdminSupportChatsPage from './pages/admin/SupportChatsPage';
import AdminExchangeRatesPage from './pages/admin/ExchangeRatesPage';
import AdminAccountsPage from './pages/admin/AccountsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import WelcomePage from './pages/WelcomePage';

// Transfer pages
import TransferDetailPage from './pages/TransferDetailPage';
import OtherNewTransferPage from './pages/transfers/other/NewTransferPage';
import ConfirmPage from './pages/transfers/ConfirmPage';

// Cardless withdrawal pages
import AdminCardlessCodePage from './pages/transfers/cardless/AdminCodePage';
import UserCardlessCodePage from './pages/transfers/cardless/UserCodePage';

function App() {
  const { loading, initialize, user } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/welcome" element={
          user && !user.has_seen_welcome ? (
            <WelcomePage />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        } />
        
        <Route element={<ProtectedRoute />}>
          {/* User routes */}
          <Route path="/dashboard" element={
            user && !user.has_seen_welcome ? (
              <Navigate to="/welcome" replace />
            ) : (
              <DashboardPage />
            )
          } />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/transfers/:id" element={<TransferDetailPage />} />
          <Route path="/transfers/cardless/:id" element={<UserCardlessCodePage />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/transfers" element={<AdminTransfersPage />} />
          <Route path="/admin/transfers/:id" element={<AdminTransferDetailPage />} />
          <Route path="/admin/transfers/cardless/:id" element={<AdminCardlessCodePage />} />
          <Route path="/admin/stats" element={<AdminStatsPage />} />
          <Route path="/admin/support" element={<AdminSupportChatsPage />} />
          <Route path="/admin/exchange-rates" element={<AdminExchangeRatesPage />} />
          <Route path="/admin/accounts" element={<AdminAccountsPage />} />
          
          {/* Transfer routes */}
          <Route path="/transfers/other/new" element={<OtherNewTransferPage />} />
          <Route path="/transfers/confirm" element={<ConfirmPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;