import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CURRENCIES } from '../types/database';

interface ExchangeRate {
  id: string;
  currency_pair: string;
  provider_rate: number;
  our_rate: number;
  profit_margin: number;
  created_at: string;
  updated_at: string;
}

interface ConversionResult {
  amount: number;
  rate: number;
}

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRates();
    
    // Subscribe to changes
    const channel = supabase
      .channel('exchange_rates_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exchange_rates' },
        () => {
          fetchRates();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('currency_pair', { ascending: true });

      if (error) throw error;
      setRates(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError('Error al cargar las tasas de cambio');
    } finally {
      setLoading(false);
    }
  };

  const getRate = (fromCurrency: string, toCurrency: string): number | null => {
    // Direct pair (e.g., USDT/MXN)
    const directPair = rates.find(r => r.currency_pair === `${fromCurrency}/${toCurrency}`);
    if (directPair) return directPair.our_rate;

    // Inverse pair (e.g., MXN/USDT)
    const inversePair = rates.find(r => r.currency_pair === `${toCurrency}/${fromCurrency}`);
    if (inversePair) return 1 / inversePair.our_rate;

    // Try to find a path through USDT if no direct conversion exists
    if (fromCurrency !== 'USDT' && toCurrency !== 'USDT') {
      const fromToUsdt = getRate(fromCurrency, 'USDT');
      const usdtToTarget = getRate('USDT', toCurrency);
      
      if (fromToUsdt && usdtToTarget) {
        return fromToUsdt * usdtToTarget;
      }
    }

    return null;
  };

  const convert = (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): ConversionResult | null => {
    const rate = getRate(fromCurrency, toCurrency);
    if (!rate) return null;

    return {
      amount: amount * rate,
      rate
    };
  };

  return {
    rates,
    loading,
    error,
    getRate,
    convert,
    refresh: fetchRates
  };
}