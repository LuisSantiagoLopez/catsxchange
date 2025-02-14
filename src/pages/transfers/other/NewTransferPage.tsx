import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useExchangeRates } from '../../../hooks/useExchangeRates';
import type { SavedAccount } from '../../../types/database';
import type { DestinationType, TransferFormData } from '../../../types/transfers';
import TransferTypeSelector from '../../../components/transfers/TransferTypeSelector';
import AccountSelector from '../../../components/transfers/AccountSelector';
import NewAccountForm from '../../../components/transfers/NewAccountForm';
import CurrencySelector from '../../../components/transfers/CurrencySelector';

const NewTransferPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [destinationType, setDestinationType] = useState<DestinationType | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showNewAccountForm, setShowNewAccountForm] = useState(false);
  const [formData, setFormData] = useState<TransferFormData>({
    clabe: '',
    cardNumber: '',
    cardHolder: '',
    binanceId: '',
    binanceEmail: '',
    originCurrency: '',
    destinationCurrency: '',
    amount: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { loading: loadingRates, error: ratesError, convert } = useExchangeRates();

  useEffect(() => {
    if (user) {
      fetchSavedAccounts();
    }
  }, [user, destinationType]);

  const fetchSavedAccounts = async () => {
    if (!user || !destinationType || destinationType === 'cardless') return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', destinationType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedAccounts(data || []);
    } catch (err) {
      console.error('Error loading saved accounts:', err);
      setError('Could not load your saved accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveNewAccount = async () => {
    if (!user || !destinationType) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      let details;
      switch (destinationType) {
        case 'clabe':
          if (!formData.clabe || formData.clabe.length !== 18) {
            throw new Error('CLABE must be 18 digits');
          }
          details = { clabe: formData.clabe };
          break;
        case 'card':
          if (!formData.cardNumber || formData.cardNumber.length !== 16) {
            throw new Error('Card number must be 16 digits');
          }
          if (!formData.cardHolder) {
            throw new Error('Card holder name is required');
          }
          details = {
            card_number: formData.cardNumber,
            card_holder: formData.cardHolder
          };
          break;
        case 'binance':
          if (!formData.binanceId.trim()) {
            throw new Error('Binance ID is required');
          }
          if (!formData.binanceEmail.trim()) {
            throw new Error('Binance email is required');
          }
          if (!formData.binanceEmail.includes('@')) {
            throw new Error('Invalid Binance email');
          }
          details = {
            binance_id: formData.binanceId.trim(),
            binance_email: formData.binanceEmail.trim()
          };
          break;
        default:
          throw new Error('Invalid account type');
      }

      if (destinationType === 'binance') {
        const exists = savedAccounts.some(acc => 
          acc.details.binance_id === details.binance_id ||
          acc.details.binance_email === details.binance_email
        );
        if (exists) {
          throw new Error('A Binance account with this ID or email already exists');
        }
      }

      const { data: newAccount, error: saveError } = await supabase
        .from('saved_accounts')
        .insert({
          user_id: user.id,
          type: destinationType,
          details
        })
        .select()
        .single();

      if (saveError) {
        if (saveError.code === '23505') {
          throw new Error('This account is already registered');
        }
        throw saveError;
      }

      if (newAccount) {
        setSavedAccounts(prev => [newAccount, ...prev]);
        setSelectedAccountId(newAccount.id);
        setShowNewAccountForm(false);
        setFormData({
          ...formData,
          clabe: '',
          cardNumber: '',
          cardHolder: '',
          binanceId: '',
          binanceEmail: ''
        });
        setSuccess('Account saved successfully');
      }
    } catch (err) {
      console.error('Error saving account:', err);
      setError(err instanceof Error ? err.message : 'Error saving account');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    // Create support chat if it doesn't exist
    const createSupportChat = async () => {
      try {
        const { data: existingChat } = await supabase
          .from('support_chats')
          .select('*')
          .eq('user_id', user?.id)
          .eq('status', 'open')
          .single();

        if (!existingChat) {
          await supabase
            .from('support_chats')
            .insert({
              user_id: user?.id,
              status: 'open'
            });
        }

        // Navigate to dashboard where support chat is available
        navigate('/dashboard');
      } catch (error) {
        console.error('Error creating support chat:', error);
        navigate('/dashboard');
      }
    };

    createSupportChat();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationType) return;

    const selectedAccount = savedAccounts.find(acc => acc.id === selectedAccountId);
    
    if (formData.destinationCurrency === 'USDT') {
      if (destinationType !== 'binance') {
        setError('Only Binance accounts can receive USDT transfers');
        return;
      }
      if (!selectedAccount?.usdt_enabled || !selectedAccount?.verified_at) {
        setError('This Binance account is not verified for USDT transfers. Please contact an administrator to verify your account.');
        return;
      }
    }

    const conversion = convert(
      parseFloat(formData.amount),
      formData.originCurrency,
      formData.destinationCurrency
    );

    if (!conversion) {
      setError('Error calculating conversion');
      return;
    }

    navigate('/transfers/confirm', {
      state: {
        destinationType: destinationType === 'cardless' ? null : destinationType,
        destinationDetails: selectedAccount ? {
          account_id: selectedAccountId,
          ...selectedAccount.details
        } : null,
        originCurrency: formData.originCurrency,
        destinationCurrency: formData.destinationCurrency,
        amount: parseFloat(formData.amount),
        exchangeRate: conversion.rate,
        destinationAmount: conversion.amount,
        type: destinationType === 'cardless' ? 'cardless' : 'other'
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            New Transfer
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      {error}
                    </p>
                    {error.includes('not verified') && (
                      <div className="mt-2">
                        <p className="text-sm text-yellow-700">
                          To verify your Binance account:
                        </p>
                        <ol className="list-decimal list-inside mt-1 text-sm text-yellow-700">
                          <li>Contact our support team</li>
                          <li>Provide your Binance account details</li>
                          <li>Wait for verification confirmation</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Type Selector */}
            <TransferTypeSelector
              selectedType={destinationType}
              onTypeSelect={setDestinationType}
            />

            {/* Account Selector */}
            {destinationType && destinationType !== 'cardless' && (
              <AccountSelector
                accounts={savedAccounts}
                selectedAccountId={selectedAccountId}
                showNewAccountForm={showNewAccountForm}
                onAccountSelect={setSelectedAccountId}
                onNewAccountClick={() => setShowNewAccountForm(!showNewAccountForm)}
              />
            )}

            {/* New Account Form */}
            {showNewAccountForm && destinationType && destinationType !== 'cardless' && (
              <NewAccountForm
                type={destinationType}
                formData={formData}
                onChange={handleFormChange}
                onCancel={() => setShowNewAccountForm(false)}
                onSave={handleSaveNewAccount}
                loading={loading}
              />
            )}

            {/* Currency Selector */}
            {destinationType && (
              <CurrencySelector
                originCurrency={formData.originCurrency}
                destinationCurrency={formData.destinationCurrency}
                onOriginChange={(currency) => handleFormChange('originCurrency', currency)}
                onDestinationChange={(currency) => handleFormChange('destinationCurrency', currency)}
                amount={formData.amount}
                onAmountChange={(amount) => handleFormChange('amount', amount)}
                exchangeRate={
                  formData.originCurrency && formData.destinationCurrency
                    ? convert(1, formData.originCurrency, formData.destinationCurrency)?.rate
                    : undefined
                }
                destinationAmount={
                  formData.amount && formData.originCurrency && formData.destinationCurrency
                    ? convert(
                        parseFloat(formData.amount),
                        formData.originCurrency,
                        formData.destinationCurrency
                      )?.amount
                    : undefined
                }
                type={destinationType === 'binance' ? 'binance' : destinationType === 'cardless' ? 'cardless' : 'other'}
                onContactSupport={handleContactSupport}
              />
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !destinationType ||
                  !formData.originCurrency ||
                  !formData.destinationCurrency ||
                  !formData.amount ||
                  (destinationType !== 'cardless' && !selectedAccountId && !showNewAccountForm) ||
                  loading ||
                  loadingRates
                }
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewTransferPage;