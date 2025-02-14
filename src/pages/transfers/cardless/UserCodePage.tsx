import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';

const UserCodePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawal, setWithdrawal] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/dashboard');
      return;
    }
    fetchWithdrawal();
  }, [id, user]);

  const fetchWithdrawal = async () => {
    try {
      // First check if the transfer exists and belongs to the user
      const { data: transfer, error: transferError } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .eq('type', 'cardless')
        .single();

      if (transferError) {
        throw new Error('No se encontró la transferencia');
      }

      if (transfer.status !== 'completed') {
        throw new Error('La transferencia aún no está lista para retiro');
      }

      // Then get the withdrawal code
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('cardless_withdrawals')
        .select(`
          *,
          transfer:transfers(
            id,
            amount,
            origin_currency,
            destination_currency,
            destination_amount,
            status,
            user_id
          )
        `)
        .eq('transfer_id', id)
        .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error

      if (withdrawalError) {
        throw withdrawalError;
      }

      if (!withdrawalData) {
        throw new Error('El código de retiro aún no está disponible');
      }

      // Verify transfer belongs to user
      if (withdrawalData?.transfer?.user_id !== user?.id) {
        throw new Error('No tienes permiso para ver este código');
      }

      setWithdrawal(withdrawalData);
    } catch (error) {
      console.error('Error loading code:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar el código de retiro');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (withdrawal?.code) {
      navigator.clipboard.writeText(withdrawal.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !withdrawal) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error || 'Error al cargar el código'}
            </h2>
            <p className="text-gray-600 mb-6">
              Por favor, intenta de nuevo más tarde o contacta a soporte si el problema persiste.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver al Dashboard
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            withdrawal.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {withdrawal.status === 'active' ? 'Activo' : 'Expirado'}
          </span>
        </div>

        <div className="space-y-6">
          {/* Transfer Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Detalles de la Transferencia
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Monto a Enviar</p>
                <p className="text-lg font-medium text-gray-900">
                  {withdrawal.transfer.amount} {withdrawal.transfer.origin_currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monto a Recibir</p>
                <p className="text-lg font-medium text-gray-900">
                  {withdrawal.transfer.destination_amount} {withdrawal.transfer.destination_currency}
                </p>
              </div>
            </div>
          </div>

          {/* Withdrawal Code */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-blue-900">
                Código de Retiro
              </h3>
              {withdrawal.status === 'active' && (
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="bg-white rounded-lg p-4 font-mono text-xl text-center">
              {withdrawal.code}
            </div>
            <p className="mt-4 text-sm text-blue-700">
              {withdrawal.status === 'active' ? (
                <>
                  Este código expirará el{' '}
                  {new Date(withdrawal.expires_at).toLocaleString()}
                </>
              ) : (
                'Este código ha expirado'
              )}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Instrucciones
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Visita cualquier sucursal bancaria participante</li>
              <li>Indica que deseas realizar un retiro sin tarjeta</li>
              <li>Proporciona el código de retiro</li>
              <li>Recibe tu dinero</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCodePage;