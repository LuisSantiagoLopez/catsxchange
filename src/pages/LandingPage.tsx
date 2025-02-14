import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Clock } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <img src="/logo-catsxchange.png" alt="CatsXChange" className="h-10 w-10" />
              <span className="ml-2 text-xl font-bold text-gray-900">CatsXChange</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700"
              >
                Comenzar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Intercambio de Divisas</span>
              <span className="block text-purple-600">Simple y Seguro</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Envía dinero a cualquier parte del mundo con solo unos clics. Transferencias rápidas, seguras y confiables al alcance de tu mano.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <Link
                to="/register"
                className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 md:py-4 md:text-lg md:px-10"
              >
                Empezar Ahora
                <img src="/logo-catsxchange.png" alt="" className="ml-2 h-6 w-6" />
              </Link>
            </div>
          </div>

          <div className="mt-24">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Transferencias Seguras</h3>
                <p className="mt-2 text-base text-gray-500 text-center">
                  Seguridad bancaria protegiendo tu dinero e información personal.
                </p>
              </div>

              <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Procesamiento Instantáneo</h3>
                <p className="mt-2 text-base text-gray-500 text-center">
                  Transferencias ultrarrápidas completadas en minutos, no días.
                </p>
              </div>

              <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Soporte 24/7</h3>
                <p className="mt-2 text-base text-gray-500 text-center">
                  Atención al cliente las 24 horas para todas tus necesidades de transferencia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;