import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CURRENCIES, Currency } from '../../../types/database';

const CurrencyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [originCurrency, setOriginCurrency] = useState<Currency | null>(null);
  const [destinationCurrency, setDestinationCurrency] = useState<Currency | null>(null);
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(1);

  useEffect(() => {
    // En un caso real, aquí obtendríamos las tasas de cambio actualizadas
    // Por ahora usamos tasas fijas de ejemplo
    if (originCurrency && destinationCurrency) {
      const rates: Record<string, Record<string, number>> = {
        'MXN': { 'USDT': 0.059 },
        'PEN': { 'USDT': 0.27 },
        'COP': { 'USDT': 0.00025 },
        'VES': { 'USDT': 0.028 },
        'USDT': {
          'MXN': 17.0,
          'PEN': 3.7,
          'COP': 4000,
          'VES': 35.7
        }
      };

      const rate = rates[originCurrency.code]?.[destinationCurrency.code] || 1;
      setExchangeRate(rate);
    }
  }, [originCurrency, destinationCurrency]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originCurrency || !destinationCurrency || !amount) return;

    navigate('/transfers/usd/confirm', {
      state: {
        ...location.state,
        originCurrency: originCurrency.code,
        destinationCurrency: destinationCurrency.code,
        amount: parseFloat(amount),
        exchangeRate,
        destinationAmount: parseFloat(amount) * exchangeRate
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Seleccionar Divisas
          </h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Divisa de Origen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Divisa de Origen
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CURRENCIES.map((currency) => (
                    <button
                      key={currency.code}
                      type="button"
                      onClick={() => setOriginCurrency(currency)}
                      className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                        originCurrency?.code === currency.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <span className="text-2xl">{currency.flag}</span>
                      <span className="text-sm font-medium">{currency.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divisa de Destino */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Divisa de Destino
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CURRENCIES.map((currency) => (
                    <button
                      key={currency.code}
                      type="button"
                      onClick={() => setDestinationCurrency(currency)}
                      className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                        destinationCurrency?.code === currency.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <span className="text-2xl">{currency.flag}</span>
                      <span className="text-sm font-medium">{currency.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Monto y Tasa de Cambio */}
            {originCurrency && destinationCurrency && (
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Enviar
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">
                        {originCurrency.symbol}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="block w-full pl-7 pr-12 py-2 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">
                        {originCurrency.code}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{originCurrency.flag}</span>
                    <span>1 {originCurrency.code}</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                  <div className="flex items-center space-x-2">
                    <span>{exchangeRate.toFixed(4)} {destinationCurrency.code}</span>
                    <span className="text-2xl">{destinationCurrency.flag}</span>
                  </div>
                </div>

                {amount && (
                  <div className="text-right text-sm text-gray-600">
                    Recibirás aproximadamente: {destinationCurrency.symbol}
                    {(parseFloat(amount) * exchangeRate).toFixed(2)} {destinationCurrency.code}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={!originCurrency || !destinationCurrency || !amount}
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

export default CurrencyPage;