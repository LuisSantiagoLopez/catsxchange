import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Transfer } from '../../types/database';
import TransferChat from '../../components/TransferChat';

const TransferDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!user?.role === 'admin') {
      navigate('/dashboard');
      return;
    }
    
    fetchTransfer();
  }, [id, user]);

  const fetchTransfer = async () => {
    try {
      const { data: transferData, error: transferError } = await supabase
        .from('transfers')
        .select(`
          *,
          user:profiles(id, email, full_name)
        `)
        .eq('id', id)
        .single();

      if (transferError) throw transferError;
      setTransfer(transferData);
    } catch (error) {
      console.error('Error al cargar transferencia:', error);
      setError('Error al cargar los datos de la transferencia');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'pending' | 'completed' | 'failed') => {
    if (!transfer || !user) return;

    try {
      setUpdatingStatus(true);

      // For USDT transfers, enforce state machine
      if (transfer.destination_currency === 'USDT') {
        if (transfer.status === 'pending_usd_approval' && newStatus === 'completed') {
          setError('Las transferencias USDT deben ser aprobadas antes de completarse');
          return;
        }
      }

      // For cardless withdrawals, set to pending_cardless and redirect to code entry
      if (transfer.type === 'cardless') {
        const { error: updateError } = await supabase
          .from('transfers')
          .update({ status: 'pending_cardless' })
          .eq('id', transfer.id);

        if (updateError) throw updateError;

        // Redirect to code entry page
        navigate(`/admin/transfers/cardless/${transfer.id}`);
        return;
      }

      const { error: updateError } = await supabase
        .from('transfers')
        .update({ status: newStatus })
        .eq('id', transfer.id);

      if (updateError) throw updateError;

      // Notificar al usuario
      await supabase
        .from('notifications')
        .insert({
          user_id: transfer.user_id,
          title: `Transferencia ${transfer.type === 'cardless' ? 'sin Tarjeta' : transfer.destination_currency === 'USDT' ? 'USDT' : 'Internacional'} ${newStatus === 'completed' ? 'Aprobada' : 'Rechazada'}`,
          content: `Tu transferencia ha sido ${newStatus === 'completed' ? 'aprobada y será procesada' : 'rechazada'}`,
          read: false
        });

      setTransfer({ ...transfer, status: newStatus });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      setError('Error al actualizar el estado de la transferencia');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <p className="text-gray-500">No se encontró la transferencia</p>
          <button
            onClick={() => navigate('/admin/transfers')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Transferencias
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/admin/transfers')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver a Transferencias
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            transfer.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : transfer.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : transfer.status === 'pending_usd_approval'
              ? 'bg-blue-100 text-blue-800'
              : transfer.status === 'pending_cardless'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {transfer.status === 'completed' ? 'Completada' : 
             transfer.status === 'pending' ? 'Pendiente' :
             transfer.status === 'pending_usd_approval' ? 'Pendiente de Aprobación USDT' :
             transfer.status === 'pending_cardless' ? 'Pendiente de Código' :
             'Fallida'}
          </span>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Detalles de la transferencia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Tipo</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {transfer.type === 'cardless' ? 'Retiro sin Tarjeta' :
                 transfer.destination_currency === 'USDT' ? 'Envío USDT' : 
                 'Envío Internacional'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Estado</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {transfer.status === 'completed' ? 'Completada' : 
                 transfer.status === 'pending' ? 'Pendiente' :
                 transfer.status === 'pending_usd_approval' ? 'Pendiente de Aprobación USDT' :
                 transfer.status === 'pending_cardless' ? 'Pendiente de Código' :
                 'Fallida'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Monto</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {transfer.amount} {transfer.origin_currency}
              </p>
              <p className="text-sm text-gray-500">
                ≈ {transfer.destination_amount} {transfer.destination_currency}
              </p>
            </div>
            {transfer.type !== 'cardless' && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Destino</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {transfer.destination_type === 'clabe' 
                    ? `CLABE: ${transfer.destination_details.clabe}`
                    : `Tarjeta: ****${transfer.destination_details.card_number?.slice(-4)}`
                  }
                </p>
                {transfer.destination_type === 'card' && (
                  <p className="text-sm text-gray-500">
                    {transfer.destination_details.card_holder}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Aviso USDT */}
        {transfer.destination_currency === 'USDT' && transfer.status === 'pending_usd_approval' && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">
                  Transferencia USDT Pendiente de Aprobación
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Tu transferencia está siendo revisada. Utiliza el chat a continuación para comunicarte con el administrador.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Acciones */}
        {(transfer.status === 'pending' || 
          transfer.status === 'pending_usd_approval' || 
          transfer.status === 'pending_cardless') && (
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() => handleUpdateStatus('failed')}
              disabled={updatingStatus}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              Rechazar
            </button>
            {transfer.destination_currency === 'USDT' && transfer.status === 'pending_usd_approval' ? (
              <button
                onClick={() => handleUpdateStatus('pending')}
                disabled={updatingStatus}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                Aprobar
              </button>
            ) : (
              <button
                onClick={() => handleUpdateStatus('completed')}
                disabled={updatingStatus}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {transfer.type === 'cardless' ? 'Generar Código' : 'Completar'}
              </button>
            )}
          </div>
        )}

        {/* Botón para ver código de retiro sin tarjeta */}
        {transfer.type === 'cardless' && transfer.status === 'completed' && (
          <div className="mt-6">
            <button
              onClick={() => navigate(`/admin/transfers/cardless/${transfer.id}`)}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Gestionar Código de Retiro
            </button>
          </div>
        )}
      </div>

      {/* Chat */}
      <TransferChat transferId={transfer.id} />
    </div>
  );
};

export default TransferDetailPage;