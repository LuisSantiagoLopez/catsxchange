import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { CURRENCIES } from '../../types/database';

interface AdminAccount {
  id: string;
  currency: string;
  account_type: 'binance' | 'bank';
  account_details: {
    binance_id?: string;
    binance_email?: string;
    bank_name?: string;
    account_number?: string;
    account_holder?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AccountsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    currency: 'MXN',
    account_type: 'bank',
    binance_id: '',
    binance_email: '',
    bank_name: '',
    account_number: '',
    account_holder: ''
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchAccounts();
  }, [user, navigate]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select('*')
        .order('currency', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setError('Error loading accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check if there's already an active account for this currency
      const existingActive = accounts.find(acc => 
        acc.currency === formData.currency && acc.is_active
      );

      if (existingActive) {
        throw new Error(`Ya existe una cuenta activa para ${formData.currency}. Por favor, desactívela primero.`);
      }

      const accountDetails = formData.account_type === 'binance' 
        ? {
            binance_id: formData.binance_id,
            binance_email: formData.binance_email
          }
        : {
            bank_name: formData.bank_name,
            account_number: formData.account_number,
            account_holder: formData.account_holder
          };

      const { error } = await supabase
        .from('admin_accounts')
        .insert({
          currency: formData.currency,
          account_type: formData.account_type,
          account_details: accountDetails,
          is_active: true // New accounts are active by default
        });

      if (error) throw error;

      setShowForm(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      setError(error instanceof Error ? error.message : 'Error saving account');
    }
  };

  const toggleAccountStatus = async (account: AdminAccount) => {
    try {
      // If trying to activate, check if there's already an active account
      if (!account.is_active) {
        const existingActive = accounts.find(acc => 
          acc.currency === account.currency && 
          acc.is_active &&
          acc.id !== account.id
        );

        if (existingActive) {
          throw new Error(`Ya existe una cuenta activa para ${account.currency}. Por favor, desactívela primero.`);
        }
      }

      const { error } = await supabase
        .from('admin_accounts')
        .update({ is_active: !account.is_active })
        .eq('id', account.id);

      if (error) throw error;
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      setError(error instanceof Error ? error.message : 'Error updating account status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  // Group accounts by currency
  const groupedAccounts = accounts.reduce((groups, account) => {
    const group = groups[account.currency] || [];
    group.push(account);
    groups[account.currency] = group;
    return groups;
  }, {} as Record<string, AdminAccount[]>);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Cuentas de Recepción
            </h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cuenta
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Moneda
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.name} ({currency.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tipo de Cuenta
                </label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    account_type: e.target.value as 'binance' | 'bank'
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                >
                  <option value="bank">Cuenta Bancaria</option>
                  <option value="binance">Cuenta Binance</option>
                </select>
              </div>

              {formData.account_type === 'binance' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Binance ID
                    </label>
                    <input
                      type="text"
                      value={formData.binance_id}
                      onChange={(e) => setFormData({ ...formData, binance_id: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Binance Email
                    </label>
                    <input
                      type="email"
                      value={formData.binance_email}
                      onChange={(e) => setFormData({ ...formData, binance_email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Número de Cuenta
                    </label>
                    <input
                      type="text"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Titular de la Cuenta
                    </label>
                    <input
                      type="text"
                      value={formData.account_holder}
                      onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
              >
                Guardar Cuenta
              </button>
            </div>
          </form>
        )}

        <div className="space-y-6">
          {Object.entries(groupedAccounts).map(([currency, currencyAccounts]) => (
            <div key={currency} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 flex items-center">
                <span className="text-2xl mr-2">
                  {CURRENCIES.find(c => c.code === currency)?.flag}
                </span>
                <span className="font-medium text-gray-900">
                  {CURRENCIES.find(c => c.code === currency)?.name} ({currency})
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Detalles
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currencyAccounts.map((account) => (
                      <tr key={account.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            account.account_type === 'binance'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {account.account_type === 'binance' ? 'Binance' : 'Banco'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {account.account_type === 'binance' ? (
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {account.account_details.binance_id}
                              </p>
                              <p className="text-sm text-gray-500">
                                {account.account_details.binance_email}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {account.account_details.bank_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {account.account_details.account_number}
                              </p>
                              <p className="text-sm text-gray-500">
                                {account.account_details.account_holder}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            account.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {account.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleAccountStatus(account)}
                            className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                              account.is_active
                                ? 'text-red-700 bg-red-100 hover:bg-red-200'
                                : 'text-green-700 bg-green-100 hover:bg-green-200'
                            }`}
                          >
                            {account.is_active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Activar
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountsPage;