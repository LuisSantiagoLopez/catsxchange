import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, RefreshCw, DollarSign, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalTransfers: number;
  totalVolume: number;
  totalProfit: number;
  pendingTransfers: number;
  completedTransfers: number;
  failedTransfers: number;
}

interface TransferStat {
  date: string;
  count: number;
  volume: number;
  profit: number;
}

interface RateHistory {
  date: string;
  currency_pair: string;
  our_rate: number;
}

const StatsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTransfers: 0,
    totalVolume: 0,
    totalProfit: 0,
    pendingTransfers: 0,
    completedTransfers: 0,
    failedTransfers: 0
  });
  const [transferStats, setTransferStats] = useState<TransferStat[]>([]);
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchStats();
  }, [user, navigate, timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Get basic stats
      const [transfersResponse, usersResponse, statsResponse] = await Promise.all([
        supabase
          .from('transfers')
          .select('status'),
        supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin'),
        supabase
          .from('transfer_statistics')
          .select('amount, converted_amount, profit')
      ]);

      if (transfersResponse.data && usersResponse.data && statsResponse.data) {
        const transfers = transfersResponse.data;
        const users = usersResponse.data;
        const transferStats = statsResponse.data;

        setStats({
          totalUsers: users.length,
          activeUsers: users.filter(u => u.last_login_at).length,
          totalTransfers: transfers.length,
          totalVolume: transferStats.reduce((sum, t) => sum + t.amount, 0),
          totalProfit: transferStats.reduce((sum, t) => sum + t.profit, 0),
          pendingTransfers: transfers.filter(t => t.status === 'pending' || t.status === 'pending_usd_approval').length,
          completedTransfers: transfers.filter(t => t.status === 'completed').length,
          failedTransfers: transfers.filter(t => t.status === 'failed').length
        });
      }

      // Get transfer stats over time
      const { data: timeStats } = await supabase
        .from('transfer_statistics')
        .select('created_at, amount, profit')
        .gte('created_at', getDateRange())
        .order('created_at', { ascending: true });

      if (timeStats) {
        const groupedStats = groupStatsByDate(timeStats);
        setTransferStats(groupedStats);
      }

      // Get exchange rate history
      const { data: rateData } = await supabase
        .from('exchange_rate_history')
        .select('created_at, currency_pair, our_rate')
        .gte('created_at', getDateRange())
        .order('created_at', { ascending: true });

      if (rateData) {
        const formattedRates = rateData.map(rate => ({
          date: format(new Date(rate.created_at), 'yyyy-MM-dd'),
          currency_pair: rate.currency_pair,
          our_rate: rate.our_rate
        }));
        setRateHistory(formattedRates);
      }

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case 'week':
      default:
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
    }
  };

  const groupStatsByDate = (stats: any[]) => {
    const grouped = stats.reduce((acc: Record<string, TransferStat>, curr) => {
      const date = format(new Date(curr.created_at), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0,
          volume: 0,
          profit: 0
        };
      }
      acc[date].count++;
      acc[date].volume += curr.amount;
      acc[date].profit += curr.profit;
      return acc;
    }, {});

    return Object.values(grouped);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
              <p className="text-gray-500">Análisis de rendimiento y métricas</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="day">Último día</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
            <button
              onClick={fetchStats}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {stats.activeUsers} usuarios activos
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Volumen Total</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${stats.totalVolume.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {stats.totalTransfers} transferencias
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ganancias</p>
                <p className="text-2xl font-semibold text-green-600">
                  ${stats.totalProfit.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              De transferencias completadas
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {stats.pendingTransfers}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Transferencias por procesar
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transfer Volume Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Volumen de Transferencias
            </h3>
            <div className="h-64">
              {transferStats.map((stat, index) => (
                <div
                  key={stat.date}
                  className="flex items-end space-x-2 mb-2"
                  style={{ height: '24px' }}
                >
                  <div className="w-24 text-sm text-gray-500">
                    {format(new Date(stat.date), 'dd/MM')}
                  </div>
                  <div
                    className="bg-blue-500 rounded"
                    style={{
                      width: `${(stat.volume / Math.max(...transferStats.map(s => s.volume))) * 100}%`,
                      height: '100%'
                    }}
                  />
                  <div className="text-sm text-gray-600">
                    ${stat.volume.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Profit Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Ganancias Diarias
            </h3>
            <div className="h-64">
              {transferStats.map((stat, index) => (
                <div
                  key={stat.date}
                  className="flex items-end space-x-2 mb-2"
                  style={{ height: '24px' }}
                >
                  <div className="w-24 text-sm text-gray-500">
                    {format(new Date(stat.date), 'dd/MM')}
                  </div>
                  <div
                    className="bg-green-500 rounded"
                    style={{
                      width: `${(stat.profit / Math.max(...transferStats.map(s => s.profit))) * 100}%`,
                      height: '100%'
                    }}
                  />
                  <div className="text-sm text-gray-600">
                    ${stat.profit.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exchange Rate History */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Historial de Tasas de Cambio
            </h3>
            <div className="space-y-6">
              {['USDT/MXN', 'USDT/PEN', 'USDT/COP', 'USDT/VES'].map(pair => {
                const rates = rateHistory.filter(r => r.currency_pair === pair);
                if (rates.length === 0) return null;

                return (
                  <div key={pair} className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">{pair}</h4>
                    <div className="h-24">
                      {rates.map((rate, index) => (
                        <div
                          key={rate.date}
                          className="flex items-end space-x-2 mb-2"
                          style={{ height: '24px' }}
                        >
                          <div className="w-24 text-sm text-gray-500">
                            {format(new Date(rate.date), 'dd/MM')}
                          </div>
                          <div
                            className="bg-purple-500 rounded"
                            style={{
                              width: `${(rate.our_rate / Math.max(...rates.map(r => r.our_rate))) * 100}%`,
                              height: '100%'
                            }}
                          />
                          <div className="text-sm text-gray-600">
                            {rate.our_rate.toFixed(4)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;