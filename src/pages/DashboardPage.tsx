import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ArrowRight, Clock, History, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Transfer } from '../types/database';
import SupportChat from '../components/SupportChat';

const DashboardPage = () => {
  const { user } = useAuthStore();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [transfersVisible, setTransfersVisible] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTransfers();
    }
  }, [user]);

  const fetchTransfers = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('transfers')
        .select(`
          *,
          cardless_withdrawal:cardless_withdrawals(*)
        `)
        .eq('user_id', user.id)
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

  const getTransferStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'pending_usd_approval':
      case 'pending_cardless':
        return 'bg-yellow-100 text-yellow-800';
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
        return 'Pendiente Aprobación';
      case 'pending_cardless':
        return 'Pendiente de Código';
      case 'failed':
        return 'Fallida';
      default:
        return status;
    }
  };

  const getTransferContinueUrl = (transfer: Transfer) => {
    if (transfer.type === 'cardless') {
      if (transfer.status === 'completed' && transfer.cardless_withdrawal?.[0]) {
        return `/transfers/cardless/${transfer.id}`;
      }
      return '/transfers/other/new';
    }
    
    if (!transfer.destination_type) {
      return '/transfers/other/new';
    } else if (!transfer.amount) {
      return '/transfers/other/currency';
    } else {
      return '/transfers/other/confirm';
    }
  };

  return (
    <div className="space-y-6">
      {/* Opciones de Envío */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-green-100 rounded-full p-3">
            <Globe className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Envío Internacional</h3>
            <p className="text-sm text-gray-500">Envía dinero en múltiples divisas de forma segura</p>
          </div>
        </div>
        
        <Link
          to="/transfers/other/new"
          className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          Realizar Envío
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      {/* Transferencias */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setTransfersVisible(!transfersVisible)}>
            <History className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Mis Transferencias
            </h2>
            <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${transfersVisible ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {transfersVisible && (
          loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay transferencias</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comienza realizando tu primera transferencia
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                  {transfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {transfer.type === 'cardless' ? 'Retiro sin Tarjeta' :
                           transfer.destination_currency === 'USDT' ? 'USDT Transfer' : 
                           'International Transfer'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transfer.amount ? (
                            <>
                              {transfer.amount} {transfer.origin_currency}
                              <span className="text-sm text-gray-500 block">
                                ≈ {transfer.destination_amount} {transfer.destination_currency}
                              </span>
                            </>
                          ) : (
                            'Pendiente'
                          )}
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
                        {transfer.type === 'cardless' && transfer.status === 'completed' && transfer.cardless_withdrawal?.[0] ? (
                          <Link
                            to={`/transfers/cardless/${transfer.id}`}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
                          >
                            Ver Código
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        ) : transfer.status === 'pending' && !transfer.amount ? (
                          <Link
                            to={getTransferContinueUrl(transfer)}
                            state={{ transfer }}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                          >
                            Continuar
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        ) : (
                          <Link
                            to={`/transfers/${transfer.id}`}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                          >
                            Ver Detalles
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Chat de Soporte */}
      <SupportChat />
    </div>
  );
};

export default DashboardPage;