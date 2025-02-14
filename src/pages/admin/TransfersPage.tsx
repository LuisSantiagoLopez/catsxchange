import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Transfer } from '../../types/database';

const TransfersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchTransfers();
  }, [user, navigate]);

  const fetchTransfers = async () => {
    try {
      const { data } = await supabase
        .from('transfers')
        .select(`
          *,
          user:profiles(id, email, full_name)
        `)
        .order('created_at', { ascending: false });

      if (data) {
        setTransfers(data);
      }
    } catch (error) {
      console.error('Error al cargar transferencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfers = transfers.filter(transfer => 
    transfer.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending_usd_approval':
        return 'bg-blue-100 text-blue-800';
      case 'pending_cardless':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'pending':
        return 'Pendiente';
      case 'pending_usd_approval':
        return 'Pendiente USDT';
      case 'pending_cardless':
        return 'Pendiente de Código';
      default:
        return 'Fallida';
    }
  };

  const getTransferType = (transfer: Transfer) => {
    if (transfer.type === 'cardless') {
      return {
        text: 'Cardless Withdrawal',
        class: 'bg-purple-100 text-purple-800'
      };
    } else if (transfer.destination_currency === 'USDT') {
      return {
        text: 'USDT',
        class: 'bg-blue-100 text-blue-800'
      };
    } else {
      return {
        text: 'International',
        class: 'bg-gray-100 text-gray-800'
      };
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
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Gestión de Transferencias
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por email, nombre o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
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
              {filteredTransfers.map((transfer) => {
                const transferType = getTransferType(transfer);
                return (
                  <tr 
                    key={transfer.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      transfer.status === 'pending_usd_approval' ? 'bg-blue-50' :
                      transfer.status === 'pending_cardless' ? 'bg-purple-50' : ''
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${transferType.class}`}>
                        {transferType.text}
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
                        getStatusBadge(transfer.status)
                      }`}>
                        {getStatusText(transfer.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transfer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transfer.type === 'cardless' && transfer.status === 'completed' ? (
                        <button
                          onClick={() => navigate(`/admin/transfers/cardless/${transfer.id}`)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
                        >
                          Manage Code
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/admin/transfers/${transfer.id}`)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                        >
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransfersPage;