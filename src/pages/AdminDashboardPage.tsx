import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Users, RefreshCw, Search, TrendingUp, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Transfer, Profile } from '../types/database';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalTransfers: 0,
    pendingTransfers: 0,
    completedTransfers: 0,
    failedTransfers: 0,
    totalUsers: 0,
    activeUsers: 0
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
    subscribeToTransfers();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [transfersResponse, usersResponse] = await Promise.all([
        supabase
          .from('transfers')
          .select(`
            *,
            user:profiles(id, email, full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
      ]);

      if (transfersResponse.data) {
        setTransfers(transfersResponse.data);
        setStats(prev => ({
          ...prev,
          totalTransfers: transfersResponse.data.length,
          pendingTransfers: transfersResponse.data.filter(t => t.status === 'pending').length,
          completedTransfers: transfersResponse.data.filter(t => t.status === 'completed').length,
          failedTransfers: transfersResponse.data.filter(t => t.status === 'failed').length,
        }));
      }

      if (usersResponse.data) {
        setUsers(usersResponse.data);
        setStats(prev => ({
          ...prev,
          totalUsers: usersResponse.data.length,
          activeUsers: usersResponse.data.filter(u => u.last_login_at).length
        }));
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToTransfers = () => {
    const subscription = supabase
      .channel('admin-transfers')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transfers'
        },
        async (payload) => {
          await supabase.from('notifications').insert({
            user_id: user?.id,
            title: 'Nueva Transferencia',
            content: `Nueva transferencia por $${payload.new.amount} recibida`
          });
          fetchData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const getTransferStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending_usd_approval':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransferStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'pending':
        return 'Pendiente';
      case 'pending_usd_approval':
        return 'Requiere Aprobación';
      case 'failed':
        return 'Fallida';
      default:
        return status;
    }
  };

  const filteredTransfers = transfers.filter(transfer => 
    transfer.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Control Administrativo</h1>
              <p className="text-gray-500">Gestiona y supervisa todas las transferencias y usuarios del sistema</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transferencias</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTransfers}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.pendingTransfers}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-2xl font-semibold text-green-600">{stats.completedTransfers}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fallidas</p>
              <p className="text-2xl font-semibold text-red-600">{stats.failedTransfers}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Gestión de Transferencias */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Gestión de Transferencias
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchData}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por email, nombre o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransfers.map((transfer) => (
                <tr 
                  key={transfer.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    transfer.status === 'pending_usd_approval' ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">
                        {transfer.user?.full_name || 'Usuario Desconocido'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transfer.user?.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      transfer.destination_currency === 'USDT'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {transfer.destination_currency === 'USDT' ? 'USDT' : 'Internacional'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {transfer.amount} {transfer.origin_currency}
                    </div>
                    <div className="text-sm text-gray-500">
                      ≈ {transfer.destination_amount} {transfer.destination_currency}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      getTransferStatusColor(transfer.status)
                    }`}>
                      {getTransferStatusText(transfer.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transfer.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => navigate(`/admin/transfers/${transfer.id}`)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      Ver Detalles
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;