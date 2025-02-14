import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';

const AdminCodePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawal, setWithdrawal] = useState<any>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchTransfer();
  }, [id, user]);

  const fetchTransfer = async () => {
    try {
      const { data: transfer, error: transferError } = await supabase
        .from('transfers')
        .select(`
          *,
          user:profiles(id, email, full_name),
          cardless_withdrawal:cardless_withdrawals(*)
        `)
        .eq('id', id)
        .single();

      if (transferError) throw transferError;
      setWithdrawal(transfer);
    } catch (error) {
      console.error('Error loading transfer:', error);
      setError('Error loading transfer data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    try {
      // Generate random 8-digit code
      const randomCode = Math.random().toString().slice(2, 10);
      
      const { error: withdrawalError } = await supabase
        .from('cardless_withdrawals')
        .insert({
          transfer_id: id,
          code: randomCode
        });

      if (withdrawalError) throw withdrawalError;

      // Update transfer status
      const { error: transferError } = await supabase
        .from('transfers')
        .update({ status: 'completed' })
        .eq('id', id);

      if (transferError) throw transferError;

      // Notify user
      await supabase
        .from('notifications')
        .insert({
          user_id: withdrawal.user_id,
          title: 'Withdrawal Code Generated',
          content: 'Your cardless withdrawal code is now available',
          read: false
        });

      fetchTransfer();
    } catch (error) {
      console.error('Error creating code:', error);
      setError('Error generating withdrawal code');
    }
  };

  const handleCopyCode = () => {
    if (withdrawal?.cardless_withdrawal?.[0]?.code) {
      navigator.clipboard.writeText(withdrawal.cardless_withdrawal[0].code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!withdrawal) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Error loading transfer
            </h2>
            <p className="text-gray-600 mb-6">
              {error || 'Transfer not found'}
            </p>
            <button
              onClick={() => navigate('/admin/transfers')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transfers
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasCode = withdrawal.cardless_withdrawal?.length > 0;
  const currentCode = hasCode ? withdrawal.cardless_withdrawal[0] : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/admin/transfers')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Transfers
          </button>
          {hasCode && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              currentCode.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {currentCode.status === 'active' ? 'Active' : 'Expired'}
            </span>
          )}
        </div>

        <div className="space-y-6">
          {/* Transfer Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Transfer Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">User</p>
                <p className="text-lg font-medium text-gray-900">
                  {withdrawal.user.full_name}
                </p>
                <p className="text-sm text-gray-500">{withdrawal.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-lg font-medium text-gray-900">
                  {withdrawal.amount} {withdrawal.origin_currency}
                </p>
                <p className="text-sm text-gray-500">
                  ≈ {withdrawal.destination_amount} {withdrawal.destination_currency}
                </p>
              </div>
            </div>
          </div>

          {/* Withdrawal Code */}
          {hasCode ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-blue-900">
                  Withdrawal Code
                </h3>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="bg-white rounded-lg p-4 font-mono text-xl text-center">
                {currentCode.code}
              </div>
              <p className="mt-4 text-sm text-blue-700">
                {currentCode.status === 'active' ? (
                  <>
                    This code will expire on{' '}
                    {new Date(currentCode.expires_at).toLocaleString()}
                  </>
                ) : (
                  'This code has expired'
                )}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <h3 className="text-lg font-medium text-yellow-900">
                  Generate Withdrawal Code
                </h3>
              </div>
              <p className="text-yellow-700 mb-6">
                This transfer requires a cardless withdrawal code. When generated, 
                the user will be notified and can access the code from their dashboard.
              </p>
              <button
                onClick={handleCreateCode}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
              >
                Generate Code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCodePage;