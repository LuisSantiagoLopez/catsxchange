import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { CURRENCIES } from '../../types/database';

interface ExchangeRate {
  id: string;
  currency_pair: string;
  provider_rate: number;
  our_rate: number;
  profit_margin: number;
  created_at: string;
  updated_at: string;
}

const ExchangeRatesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBase, setSelectedBase] = useState('USDT');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchRates();
  }, [user, navigate]);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('currency_pair', { ascending: true });

      if (error) throw error;
      setRates(data || []);
    } catch (error) {
      console.error('Error loading rates:', error);
      setError('Error loading exchange rates');
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (id: string, field: keyof ExchangeRate, value: number) => {
    setRates(prev => prev.map(rate => {
      if (rate.id === id) {
        const updatedRate = { ...rate, [field]: value };
        
        if (field === 'provider_rate' || field === 'profit_margin') {
          updatedRate.our_rate = updatedRate.provider_rate * (1 + updatedRate.profit_margin);
        }
        else if (field === 'our_rate') {
          updatedRate.profit_margin = (updatedRate.our_rate / updatedRate.provider_rate) - 1;
        }
        
        return updatedRate;
      }
      return rate;
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const updates = rates.map(({ id, currency_pair, provider_rate, our_rate, profit_margin }) => ({
        id,
        currency_pair,
        provider_rate,
        our_rate,
        profit_margin
      }));

      const { error } = await supabase
        .from('exchange_rates')
        .upsert(updates);

      if (error) throw error;

      setSuccess('Exchange rates updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving rates:', error);
      setError('Error saving exchange rates');
    } finally {
      setSaving(false);
    }
  };

  // Filter rates by base currency
  const filteredRates = rates.filter(rate => 
    rate.currency_pair.startsWith(`${selectedBase}/`)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Exchange Rates
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedBase}
              onChange={(e) => setSelectedBase(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              {CURRENCIES.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
            <button
              onClick={fetchRates}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency Pair
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit Margin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Our Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRates.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {rate.currency_pair}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={rate.provider_rate}
                      onChange={(e) => handleRateChange(rate.id, 'provider_rate', parseFloat(e.target.value))}
                      step="0.0001"
                      min="0"
                      className="w-32 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={rate.profit_margin}
                        onChange={(e) => handleRateChange(rate.id, 'profit_margin', parseFloat(e.target.value))}
                        step="0.001"
                        min="0"
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={rate.our_rate}
                      onChange={(e) => handleRateChange(rate.id, 'our_rate', parseFloat(e.target.value))}
                      step="0.0001"
                      min="0"
                      className="w-32 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRatesPage;