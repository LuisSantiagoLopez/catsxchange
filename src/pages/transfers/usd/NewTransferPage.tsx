import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Building2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

type DestinationType = 'clabe' | 'card';

const NewTransferPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [destinationType, setDestinationType] = useState<DestinationType | null>(null);
  const [formData, setFormData] = useState({
    clabe: '',
    cardNumber: '',
    cardHolder: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationType) return;

    const details = destinationType === 'clabe'
      ? { clabe: formData.clabe }
      : { 
          card_number: formData.cardNumber,
          card_holder: formData.cardHolder
        };

    navigate('/transfers/currency', {
      state: {
        destinationType,
        destinationDetails: details,
        isUsdTransfer: true
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Nuevo Envío USD
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opción CLABE */}
              <div
                onClick={() => setDestinationType('clabe')}
                className={`cursor-pointer rounded-lg border-2 p-6 transition-colors ${
                  destinationType === 'clabe'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <Building2 className={`h-6 w-6 ${
                    destinationType === 'clabe' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <h3 className="text-lg font-medium text-gray-900">
                    CLABE Bancaria
                  </h3>
                </div>
                {destinationType === 'clabe' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      CLABE
                    </label>
                    <input
                      type="text"
                      value={formData.clabe}
                      onChange={(e) => setFormData({ ...formData, clabe: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="18 dígitos"
                      maxLength={18}
                      required={destinationType === 'clabe'}
                    />
                  </div>
                )}
              </div>

              {/* Opción Tarjeta */}
              <div
                onClick={() => setDestinationType('card')}
                className={`cursor-pointer rounded-lg border-2 p-6 transition-colors ${
                  destinationType === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <CreditCard className={`h-6 w-6 ${
                    destinationType === 'card' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <h3 className="text-lg font-medium text-gray-900">
                    Tarjeta Bancaria
                  </h3>
                </div>
                {destinationType === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Número de Tarjeta
                      </label>
                      <input
                        type="text"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="16 dígitos"
                        maxLength={16}
                        required={destinationType === 'card'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nombre del Titular
                      </label>
                      <input
                        type="text"
                        value={formData.cardHolder}
                        onChange={(e) => setFormData({ ...formData, cardHolder: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Como aparece en la tarjeta"
                        required={destinationType === 'card'}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!destinationType}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewTransferPage;