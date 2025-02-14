import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, DollarSign, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleContinue = async () => {
    if (!user) return;
    
    try {
      // Update user profile to mark welcome page as seen
      const { error } = await supabase
        .from('profiles')
        .update({ has_seen_welcome: true })
        .eq('id', user.id);

      if (error) throw error;

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      // Still navigate to dashboard even if there's an error
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <img 
            src="/logo-catsxchange.png" 
            alt="CatsXChange" 
            className="h-32 w-32 mx-auto mb-6" 
          />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ¡Bienvenido a CatsXChange!
          </h1>
          <p className="text-xl text-gray-600">
            Tu plataforma segura para envíos internacionales
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Shield className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Envíos Seguros</h3>
            <p className="text-gray-600">
              Todas tus transacciones están protegidas con la más alta seguridad y cifrado.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <Zap className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Transferencias Rápidas</h3>
            <p className="text-gray-600">
              Envía dinero en minutos a cualquier cuenta bancaria o para retiro sin tarjeta.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <DollarSign className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Múltiples Monedas</h3>
            <p className="text-gray-600">
              Soportamos MXN, PEN y USDT para tus envíos internacionales.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <img 
              src="/logo-catsxchange.png" 
              alt="" 
              className="h-8 w-8 mb-4" 
            />
            <h3 className="text-lg font-semibold mb-2">Soporte 24/7</h3>
            <p className="text-gray-600">
              Nuestro equipo está disponible para ayudarte en cualquier momento.
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6">Cómo Funciona</h2>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-purple-100 rounded-full p-2">
                <span className="text-purple-600 font-semibold">1</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold">Registra tus Cuentas</h3>
                <p className="text-gray-600">
                  Agrega tus cuentas bancarias para enviar y recibir dinero fácilmente.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 bg-purple-100 rounded-full p-2">
                <span className="text-purple-600 font-semibold">2</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold">Elige el Tipo de Envío</h3>
                <p className="text-gray-600">
                  Selecciona entre envío a cuenta bancaria o retiro sin tarjeta.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 bg-purple-100 rounded-full p-2">
                <span className="text-purple-600 font-semibold">3</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold">Realiza tu Envío</h3>
                <p className="text-gray-600">
                  Ingresa el monto y confirma la transacción. ¡Listo!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Comenzar
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;