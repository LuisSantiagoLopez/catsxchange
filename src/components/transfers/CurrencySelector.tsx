import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { CURRENCIES } from '../../types/database';

interface CurrencySelectorProps {
  originCurrency: string;
  destinationCurrency: string;
  onOriginChange: (currency: string) => void;
  onDestinationChange: (currency: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  exchangeRate?: number;
  destinationAmount?: number;
  type: 'cardless' | 'other' | 'binance';
  onContactSupport?: () => void;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  originCurrency,
  destinationCurrency,
  onOriginChange,
  onDestinationChange,
  amount,
  onAmountChange,
  exchangeRate,
  destinationAmount,
  type,
  onContactSupport
}) => {
  // Get available origin currencies based on type
  const availableOriginCurrencies = CURRENCIES.filter(currency => {
    if (type === 'binance') {
      return currency.code === 'USDT';
    }
    // For all types, only allow MXN and PEN as origin
    return ['MXN', 'PEN'].includes(currency.code);
  });

  // Get available destination currencies based on type and selected origin currency
  const availableDestinationCurrencies = CURRENCIES.filter(currency => {
    // For cardless, only allow MXN and PEN, excluding the origin currency
    if (type === 'cardless') {
      return ['MXN', 'PEN'].includes(currency.code) && currency.code !== originCurrency;
    }
    
    // For CLABE and Card, allow all currencies except USDT and the origin currency
    if (type === 'other') {
      return currency.code !== 'USDT' && currency.code !== originCurrency;
    }

    // For Binance, only allow USDT
    if (type === 'binance') {
      return currency.code === 'USDT';
    }

    return false;
  });

  return (
    <div className="space-y-6">
      {/* USDT Warning */}
      {type === 'binance' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Las transferencias USDT requieren verificación. Por favor, contacta a nuestro equipo de soporte para verificar tu cuenta.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onContactSupport}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Contactar Soporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Currency Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Origin Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Moneda de Origen
          </label>
          <div className="grid grid-cols-2 gap-3">
            {availableOriginCurrencies.map((currency) => (
              <button
                key={currency.code}
                type="button"
                onClick={() => {
                  onOriginChange(currency.code);
                  // Reset destination currency if it's the same as the new origin
                  if (destinationCurrency === currency.code) {
                    onDestinationChange('');
                  }
                }}
                className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                  originCurrency === currency.code
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-200'
                }`}
              >
                <span className="text-2xl">{currency.flag}</span>
                <span className="text-sm font-medium">{currency.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Destination Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Moneda de Destino
          </label>
          <div className="grid grid-cols-2 gap-3">
            {availableDestinationCurrencies.map((currency) => (
              <button
                key={currency.code}
                type="button"
                onClick={() => onDestinationChange(currency.code)}
                disabled={currency.code === originCurrency}
                className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                  destinationCurrency === currency.code
                    ? 'border-purple-500 bg-purple-50'
                    : currency.code === originCurrency
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-purple-200'
                }`}
              >
                <span className="text-2xl">{currency.flag}</span>
                <span className="text-sm font-medium">{currency.code}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Amount and Exchange Rate */}
      {originCurrency && destinationCurrency && (
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Monto a Enviar
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">
                  {CURRENCIES.find(c => c.code === originCurrency)?.symbol}
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                className="block w-full pl-7 pr-12 py-2 rounded-md border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                placeholder="0.00"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">
                  {originCurrency}
                </span>
              </div>
            </div>
          </div>

          {exchangeRate && (
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {CURRENCIES.find(c => c.code === originCurrency)?.flag}
                </span>
                <span>1 {originCurrency}</span>
              </div>
              <span className="text-gray-500">=</span>
              <div className="flex items-center space-x-2">
                <span>{exchangeRate.toFixed(4)} {destinationCurrency}</span>
                <span className="text-2xl">
                  {CURRENCIES.find(c => c.code === destinationCurrency)?.flag}
                </span>
              </div>
            </div>
          )}

          {amount && destinationAmount && (
            <div className="text-right text-sm text-gray-600">
              Recibirás aproximadamente: {
                CURRENCIES.find(c => c.code === destinationCurrency)?.symbol
              }
              {destinationAmount.toFixed(2)} {destinationCurrency}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;