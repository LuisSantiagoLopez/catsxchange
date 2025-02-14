import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, AlertTriangle, Clock, CheckCircle, ArrowLeft, Copy, ArrowDownToLine, ArrowUpToLine, Building2, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import TransferChat from '../../components/TransferChat';

interface TransferState {
  destinationType?: 'clabe' | 'card' | 'binance' | null;
  destinationDetails: any;
  originCurrency: string;
  destinationCurrency: string;
  amount: number;
  exchangeRate: number;
  destinationAmount: number;
  type: 'other' | 'cardless' | 'usd';
  transferId?: string;
}

const ConfirmPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const transferCreated = useRef(false);
  const [adminAccount, setAdminAccount] = useState<any>(null);

  // Destructure location state at the beginning
  const {
    destinationType,
    destinationDetails,
    originCurrency,
    destinationCurrency,
    amount,
    exchangeRate,
    destinationAmount,
    type = 'other'
  } = (location.state || {}) as TransferState;

  useEffect(() => {
    const createInitialTransfer = async () => {
      if (!location.state || !user || transferCreated.current) return;

      if (location.state.transferId) {
        setTransferId(location.state.transferId);
        return;
      }

      try {
        // Validación detallada de datos
        if (!amount || isNaN(Number(amount))) {
          throw new Error('El monto de la transferencia es inválido');
        }
        if (!originCurrency) {
          throw new Error('La moneda de origen es requerida');
        }
        if (!destinationCurrency) {
          throw new Error('La moneda de destino es requerida');
        }

        transferCreated.current = true;
        setLoading(true);

        // Construir objeto de transferencia
        const transferData = {
          user_id: user.id,
          amount: Number(amount),
          type: destinationCurrency === 'USDT' ? 'usd' : type || 'other',
          origin_currency: originCurrency,
          destination_currency: destinationCurrency,
          exchange_rate: Number(exchangeRate) || 1,
          destination_amount: Number(destinationAmount),
          // Solo incluir destination_type y details si no es cardless
          ...(type !== 'cardless' && {
            destination_type: destinationCurrency === 'USDT' ? 'binance' : destinationType,
            destination_details: destinationDetails
          }),
          // Determinar el estado inicial
          status: type === 'cardless' ? 'pending_cardless' : 
                 destinationCurrency === 'USDT' ? 'pending_usd_approval' : 
                 'pending'
        };

        const { data: transfer, error: transferError } = await supabase
          .from('transfers')
          .insert(transferData)
          .select()
          .single();

        if (transferError) {
          console.error('Error de Supabase:', transferError);
          if (transferError.code === '42501') {
            throw new Error('No tienes permiso para crear transferencias');
          } else if (transferError.code === '23514') {
            throw new Error('Los datos de la transferencia no cumplen con las restricciones requeridas');
          } else {
            throw new Error(transferError.message);
          }
        }

        if (!transfer) {
          throw new Error('No se pudo crear la transferencia');
        }

        setTransferId(transfer.id);

        // Notificar al admin
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: '89efab8d-36d8-4cf6-b3c7-8806ff9b1409', // Admin ID
            title: `Nueva Transferencia ${type === 'cardless' ? 'sin Tarjeta' : destinationCurrency === 'USDT' ? 'USDT' : 'Internacional'}`,
            content: `${user.full_name} ha iniciado una transferencia por ${amount} ${originCurrency}`,
            read: false
          });

        if (notificationError) {
          console.error('Error al crear notificación:', notificationError);
        }

      } catch (error) {
        console.error('Error detallado:', error);
        setError(
          error instanceof Error 
            ? `Error al inicializar la transferencia: ${error.message}`
            : 'Error desconocido al inicializar la transferencia'
        );
        transferCreated.current = false; // Permitir reintentar si hubo error
      } finally {
        setLoading(false);
      }
    };

    createInitialTransfer();
  }, [location.state, user]);

  useEffect(() => {
    const fetchAdminAccount = async () => {
      if (!originCurrency) return;
      
      try {
        const { data: accounts, error } = await supabase
          .from('admin_accounts')
          .select('*')
          .eq('currency', originCurrency)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        if (accounts && accounts.length > 0) {
          setAdminAccount(accounts[0]);
        }
      } catch (error) {
        console.error('Error fetching admin account:', error);
      }
    };

    fetchAdminAccount();
  }, [originCurrency]);

  if (!location.state || !user) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Error al cargar la transferencia
            </h2>
            <p className="text-gray-600 mb-6">
              No se encontraron los datos necesarios para procesar la transferencia.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
            >
              Volver al Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const estimatedArrival = new Date(Date.now() + 15 * 60000).toLocaleTimeString();

  const handleConfirm = async () => {
    if (!transferId) return;

    try {
      setLoading(true);
      setError('');

      // No necesitamos actualizar el estado aquí, ya que el estado inicial
      // se establece correctamente al crear la transferencia
      setConfirmed(true);
    } catch (error) {
      console.error('Error al procesar transferencia:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar la transferencia');
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Transferencia Iniciada!
            </h2>
            {type === 'cardless' ? (
              <>
                <p className="text-gray-600 mb-6">
                  Tu transferencia está siendo procesada. Te notificaremos cuando el código de retiro esté disponible.
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
                  >
                    Volver al Panel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  Tu transferencia está siendo procesada. El dinero llegará aproximadamente a las {estimatedArrival}.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
                  >
                    Volver al Panel
                  </button>
                  <button
                    onClick={() => navigate(`/transfers/${transferId}`)}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Ver Detalles
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {showChat && transferId && (
          <div className="mt-6">
            <TransferChat transferId={transferId} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Confirmar Transferencia
          </h2>

          {loading && (
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2" />
              Procesando transferencia...
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Detalles de la transferencia */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles de la Transferencia
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Monto a Enviar</p>
                  <p className="text-lg font-medium text-gray-900">
                    {amount} {originCurrency}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monto a Recibir</p>
                  <p className="text-lg font-medium text-gray-900">
                    {destinationAmount.toFixed(2)} {destinationCurrency}
                  </p>
                </div>
                {type !== 'cardless' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Tipo de Destino</p>
                      <p className="text-lg font-medium text-gray-900">
                        {destinationType === 'clabe' ? 'CLABE Bancaria' : destinationType === 'binance' ? 'Cuenta Binance' : 'Tarjeta'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Detalles de Destino</p>
                      <p className="text-lg font-medium text-gray-900">
                        {destinationType === 'clabe' 
                          ? destinationDetails.clabe
                          : destinationType === 'binance'
                          ? destinationDetails.binance_id
                          : `${destinationDetails.card_holder} - ****${destinationDetails.card_number?.slice(-4)}`
                        }
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Instrucciones de depósito */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-yellow-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Instrucciones de Depósito
              </h3>
              
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-full p-2">
                    <ArrowUpToLine className="h-5 w-5 text-yellow-700" />
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-900">1. Envía el dinero a nuestra cuenta</h4>
                    {adminAccount ? (
                      <div className="mt-2 bg-white rounded-lg p-4 border border-yellow-200">
                        {adminAccount.account_type === 'bank' ? (
                          <>
                            <div className="flex items-center mb-2">
                              <Building2 className="h-5 w-5 text-yellow-700 mr-2" />
                              <span className="font-medium">{adminAccount.account_details.bank_name}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              Número de cuenta: {adminAccount.account_details.account_number}
                            </p>
                            <p className="text-sm text-gray-600">
                              Titular: {adminAccount.account_details.account_holder}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center mb-2">
                              <CreditCard className="h-5 w-5 text-yellow-700 mr-2" />
                              <span className="font-medium">Cuenta Binance</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              ID: {adminAccount.account_details.binance_id}
                            </p>
                            <p className="text-sm text-gray-600">
                              Email: {adminAccount.account_details.binance_email}
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-yellow-700 mt-1">
                        Error al cargar la información de la cuenta. Por favor, contacta a soporte.
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-full p-2">
                    <ArrowDownToLine className="h-5 w-5 text-yellow-700" />
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-900">2. Nosotros procesaremos tu transferencia</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Una vez confirmado tu depósito, procesaremos la transferencia a la cuenta destino en {destinationCurrency}.
                      {type === 'cardless' 
                        ? ' Te proporcionaremos un código para retiro sin tarjeta.'
                        : ` Tiempo estimado de llegada: ${estimatedArrival}`
                      }
                    </p>
                  </div>
                </div>

                {/* Reference */}
                <div className="mt-4 bg-white rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm font-medium text-gray-900">Referencia para tu depósito:</p>
                  <div className="flex items-center justify-between mt-1">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      TR-{Math.random().toString(36).substr(2, 9).toUpperCase()}
                    </code>
                    <button
                      onClick={() => {/* Add copy function */}}
                      className="text-yellow-700 hover:text-yellow-800"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Incluye esta referencia en tu depósito para agilizar el proceso
                  </p>
                </div>
              </div>
            </div>

            {/* Botón para mostrar/ocultar chat */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowChat(!showChat)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {showChat ? 'Ocultar Chat' : '¿Tienes preguntas? Abre el chat'}
              </button>
            </div>

            {/* Chat condicional */}
            {showChat && transferId && (
              <div className="border border-gray-200 rounded-lg">
                <TransferChat transferId={transferId} />
              </div>
            )}

            {showWarning ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  <h3 className="text-lg font-medium text-yellow-900">
                    Confirmar Depósito
                  </h3>
                </div>
                <p className="text-yellow-700 mb-6">
                  ¿Confirmas que has realizado el depósito por {amount} {originCurrency} a la cuenta especificada?
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowWarning(false)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
                  >
                    {loading ? 'Procesando...' : 'Sí, Confirmar Depósito'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setShowWarning(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
                >
                  Confirmar Depósito
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPage;