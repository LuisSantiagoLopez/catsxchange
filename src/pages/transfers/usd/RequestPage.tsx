import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import type { UsdPermission } from '../../../types/database';

const RequestPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState<UsdPermission | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchPermission();
    }
  }, [user]);

  const fetchPermission = async () => {
    try {
      const { data } = await supabase
        .from('usd_permissions')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (data) {
        setPermission(data);
        
        // Si el permiso está aprobado, redirigir a la página de nueva transferencia
        if (data.status === 'approved') {
          navigate('/transfers/usd/new');
        }
      }
    } catch (error) {
      console.error('Error al cargar permiso:', error);
    }
  };

  const handleRequest = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');

      // Crear la solicitud de permiso
      const { error: requestError } = await supabase
        .from('usd_permissions')
        .insert({
          user_id: user.id,
          status: 'pending'
        });

      if (requestError) throw requestError;

      // Crear notificación para administradores
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Nueva Solicitud USD',
          content: `${user.full_name} ha solicitado acceso para envíos USD`,
          read: false
        });

      await fetchPermission();
    } catch (error) {
      console.error('Error al solicitar permiso:', error);
      setError('Error al procesar la solicitud. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;

    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Mensaje sobre Solicitud USD',
          content: message,
          read: false
        });

      setMessage('');
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <AlertCircle className="h-8 w-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Solicitud de Envío USD
            </h2>
          </div>

          {permission ? (
            <div className="space-y-6">
              {/* Estado de la solicitud */}
              <div className={`p-4 rounded-lg ${
                permission.status === 'approved' 
                  ? 'bg-green-50 border border-green-200' 
                  : permission.status === 'rejected'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <Clock className={`h-5 w-5 ${
                    permission.status === 'approved' 
                      ? 'text-green-600' 
                      : permission.status === 'rejected'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`} />
                  <div>
                    <h3 className="text-lg font-medium">
                      {permission.status === 'approved' 
                        ? 'Solicitud Aprobada' 
                        : permission.status === 'rejected'
                        ? 'Solicitud Rechazada'
                        : 'Solicitud en Proceso'}
                    </h3>
                    <p className="text-sm mt-1">
                      {permission.status === 'approved' 
                        ? 'Ya puedes realizar envíos en USD' 
                        : permission.status === 'rejected'
                        ? 'Tu solicitud fue rechazada. Por favor, contacta con soporte.'
                        : 'Estamos revisando tu solicitud. Te notificaremos cuando sea aprobada.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Chat con Soporte
                  </h3>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="h-48 mb-4 flex items-center justify-center text-gray-500">
                    El chat estará disponible próximamente
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Volver al Panel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="prose max-w-none mb-8">
                <p className="text-gray-600">
                  Para realizar envíos en dólares digitales (USDT), necesitamos verificar algunos detalles y asegurarnos de que el destinatario tenga una cuenta en Binance. Esto garantiza:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mt-4">
                  <li>Transferencias seguras y rápidas</li>
                  <li>Protección contra la devaluación</li>
                  <li>Acceso inmediato a los fondos</li>
                  <li>Conversión a moneda local cuando sea necesario</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRequest}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : 'Solicitar Acceso'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestPage;