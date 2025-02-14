import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Clock, CheckCircle, MessageSquare, DollarSign, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingTransfers: 0,
    completedTransfers: 0,
    failedTransfers: 0
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      const [transfersResponse, usersResponse] = await Promise.all([
        supabase
          .from('transfers')
          .select('status'),
        supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
      ]);

      if (transfersResponse.data && usersResponse.data) {
        const transfers = transfersResponse.data;
        const users = usersResponse.data;

        setStats({
          totalUsers: users.length,
          activeUsers: users.filter(u => u.last_login_at).length,
          pendingTransfers: transfers.filter(t => t.status === 'pending' || t.status === 'pending_usd_approval' || t.status === 'pending_cardless').length,
          completedTransfers: transfers.filter(t => t.status === 'completed').length,
          failedTransfers: transfers.filter(t => t.status === 'failed').length
        });
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
            <p className="text-gray-500">Bienvenido al panel de administración</p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.activeUsers} usuarios activos
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.pendingTransfers}</p>
              <p className="text-sm text-gray-500 mt-1">
                Requieren atención
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-2xl font-semibold text-green-600">{stats.completedTransfers}</p>
              <p className="text-sm text-gray-500 mt-1">
                Transferencias exitosas
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Accesos Directos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="bg-white shadow rounded-lg p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900">Usuarios</h3>
              <p className="text-sm text-gray-500">Gestionar usuarios y permisos</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/transfers')}
          className="bg-white shadow rounded-lg p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900">Transferencias</h3>
              <p className="text-sm text-gray-500">Ver todas las transferencias</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/exchange-rates')}
          className="bg-white shadow rounded-lg p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <DollarSign className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900">Tasas de Cambio</h3>
              <p className="text-sm text-gray-500">Gestionar tasas de cambio</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/accounts')}
          className="bg-white shadow rounded-lg p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900">Cuentas</h3>
              <p className="text-sm text-gray-500">Gestionar cuentas de recepción</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/support')}
          className="bg-white shadow rounded-lg p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900">Soporte</h3>
              <p className="text-sm text-gray-500">Atender consultas de usuarios</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboardPage;