import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import TransferDetails from './components/TransferDetails';
import CodeDisplay from './components/CodeDisplay';
import CodeInput from './components/CodeInput';

const AdminCodePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawal, setWithdrawal] = useState<any>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (!withdrawal?.user?.id || !code) return;

    try {
      setSaving(true);
      setError('');

      // Validate code format (exactly 8 digits)
      if (!/^\d{8}$/.test(code)) {
        throw new Error('El código debe ser exactamente 8 dígitos numéricos');
      }

      // Create withdrawal code
      const { error: withdrawalError } = await supabase
        .from('cardless_withdrawals')
        .insert({
          transfer_id: id,
          code: code,
          status: 'active',
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
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
          title: 'Código de Retiro Disponible',
          content: 'Tu código de retiro sin tarjeta está listo. Puedes verlo en los detalles de la transferencia.',
          read: false
        });

      // Create chat message
      const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('transfer_id', id)
        .single();

      if (chat) {
        await supabase
          .from('chat_messages')
          .insert({
            chat_id: chat.id,
            user_id: user.id,
            content: '✅ Código de retiro generado y disponible'
          });
      }

      // Refresh data
      await fetchTransfer();
    } catch (error) {
      console.error('Error creating code:', error);
      setError(error instanceof Error ? error.message : 'Error al generar el código de retiro');
    } finally {
      setSaving(false);
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
          <TransferDetails 
            transfer={withdrawal}
            onBack={() => navigate('/admin/transfers')}
          />

          {hasCode ? (
            <CodeDisplay
              code={currentCode.code}
              expiresAt={currentCode.expires_at}
              status={currentCode.status}
              onCopy={handleCopyCode}
              copied={copied}
            />
          ) : (
            <CodeInput
              code={code}
              onChange={setCode}
              onSubmit={handleCreateCode}
              error={error}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCodePage;