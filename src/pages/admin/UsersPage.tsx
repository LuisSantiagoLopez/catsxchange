import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, CheckCircle, XCircle, AlertTriangle, Bitcoin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

const UsersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [verifyingAccount, setVerifyingAccount] = useState<string | null>(null);
  const [approvingUsd, setApprovingUsd] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          *,
          saved_accounts!saved_accounts_user_id_fkey (
            id,
            type,
            details,
            usdt_enabled,
            verified_at,
            verified_by
          ),
          usd_permissions!usd_permissions_user_id_fkey (
            id,
            status,
            created_at
          )
        `)
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setError('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAccount = async (accountId: string, verified: boolean) => {
    try {
      setVerifyingAccount(accountId);
      setError('');

      // Obtener el usuario dueño de la cuenta primero
      const account = users
        .flatMap(u => u.saved_accounts || [])
        .find(acc => acc.id === accountId);

      if (!account) {
        throw new Error('Cuenta no encontrada');
      }

      // Obtener el usuario al que pertenece la cuenta
      const accountUser = users.find(u => 
        u.saved_accounts?.some(acc => acc.id === accountId)
      );

      if (!accountUser) {
        throw new Error('Usuario no encontrado');
      }

      // Primero actualizar la cuenta
      const { error: accountError } = await supabase
        .from('saved_accounts')
        .update({
          usdt_enabled: verified,
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: verified ? user?.id : null
        })
        .eq('id', accountId);

      if (accountError) throw accountError;

      // Si la cuenta fue verificada, actualizar transferencias pendientes
      if (verified) {
        const { error: transferError } = await supabase
          .from('transfers')
          .update({ status: 'pending' })
          .eq('user_id', accountUser.id)
          .eq('status', 'pending_usd_approval')
          .eq('destination_currency', 'USDT');

        if (transferError) throw transferError;
      }

      // Actualizar estado local
      setUsers(prev => prev.map(u => ({
        ...u,
        saved_accounts: u.saved_accounts?.map(acc => 
          acc.id === accountId 
            ? {
                ...acc,
                usdt_enabled: verified,
                verified_at: verified ? new Date().toISOString() : null,
                verified_by: verified ? user?.id : null
              }
            : acc
        )
      })));

      // Notificar al usuario
      await supabase
        .from('notifications')
        .insert({
          user_id: accountUser.id,
          title: verified ? 'Cuenta Binance Verificada' : 'Verificación Binance Removida',
          content: verified 
            ? 'Tu cuenta Binance ha sido verificada para operaciones USDT. Tus transferencias pendientes han sido actualizadas.'
            : 'La verificación USDT de tu cuenta Binance ha sido removida. No podrás realizar operaciones USDT hasta obtener una nueva verificación.',
          read: false
        });

    } catch (error) {
      console.error('Error al verificar cuenta:', error);
      setError(error instanceof Error ? error.message : 'Error al verificar la cuenta');
    } finally {
      setVerifyingAccount(null);
    }
  };

  const handleApproveUsdPermission = async (userId: string, approved: boolean) => {
    try {
      setApprovingUsd(userId);
      setError('');

      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) {
        throw new Error('Usuario no encontrado');
      }

      // Check if user has a permission request
      const existingPermission = targetUser.usd_permissions?.[0];
      
      if (!existingPermission) {
        // Create new permission if none exists
        const { error: insertError } = await supabase
          .from('usd_permissions')
          .insert({
            user_id: userId,
            status: approved ? 'approved' : 'rejected',
            admin_id: user?.id
          });

        if (insertError) throw insertError;
      } else {
        // Update existing permission
        const { error: updateError } = await supabase
          .from('usd_permissions')
          .update({
            status: approved ? 'approved' : 'rejected',
            admin_id: user?.id
          })
          .eq('id', existingPermission.id);

        if (updateError) throw updateError;
      }

      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            usd_permissions: [{
              id: existingPermission?.id || 'temp-id',
              status: approved ? 'approved' : 'rejected',
              created_at: existingPermission?.created_at || new Date().toISOString()
            }]
          };
        }
        return u;
      }));

      // Notify user
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: approved ? 'Permiso USD Aprobado' : 'Permiso USD Rechazado',
          content: approved 
            ? 'Tu solicitud para realizar operaciones USD ha sido aprobada.'
            : 'Tu solicitud para realizar operaciones USD ha sido rechazada.',
          read: false
        });

    } catch (error) {
      console.error('Error al gestionar permiso USD:', error);
      setError(error instanceof Error ? error.message : 'Error al gestionar el permiso USD');
    } finally {
      setApprovingUsd(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" />
          Usuarios
        </h1>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {users
          .filter(user => 
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(user => (
            <div key={user.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{user.full_name}</h2>
                  <p className="text-gray-600">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* USD Permission Status */}
                  {user.usd_permissions?.[0] ? (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user.usd_permissions[0].status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : user.usd_permissions[0].status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.usd_permissions[0].status === 'approved'
                        ? 'USD Aprobado'
                        : user.usd_permissions[0].status === 'rejected'
                        ? 'USD Rechazado'
                        : 'USD Pendiente'}
                    </span>
                  ) : null}
                </div>
              </div>
              
              {/* USD Permission Management */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bitcoin className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium">Permisos USD</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveUsdPermission(user.id, false)}
                      disabled={approvingUsd === user.id}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleApproveUsdPermission(user.id, true)}
                      disabled={approvingUsd === user.id}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {user.saved_accounts && user.saved_accounts.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-700">Cuentas registradas:</h3>
                  <div className="grid gap-4">
                    {user.saved_accounts.map((account: any) => (
                      <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{account.type}</p>
                          <p className="text-sm text-gray-600">
                            {account.type === 'binance' 
                              ? `${account.details.binance_id} - ${account.details.binance_email}`
                              : account.type === 'card'
                              ? `${account.details.card_holder} - ****${account.details.card_number?.slice(-4)}`
                              : account.details.clabe}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {account.type === 'binance' && (
                            account.usdt_enabled ? (
                              <button
                                onClick={() => handleVerifyAccount(account.id, false)}
                                disabled={verifyingAccount === account.id}
                                className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                                Remover Verificación
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerifyAccount(account.id, true)}
                                disabled={verifyingAccount === account.id}
                                className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Verificar
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic">No hay cuentas registradas</p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default UsersPage;