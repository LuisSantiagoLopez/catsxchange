import React, { useState } from 'react';
import { Bell, Shield, CreditCard, Trash2, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const SettingsPage = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    try {
      setDeleteLoading(true);
      
      const { error } = await supabase.rpc('delete_user_account', {
        user_id: user.id
      });

      if (error) throw error;

      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error al eliminar la cuenta:', error);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      setShowChangePassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setPasswordError('Error al cambiar la contraseña');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Notificaciones</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Notificaciones por Correo</h3>
                <p className="text-sm text-gray-500">Recibe actualizaciones de transferencias por correo</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`${
                  emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    emailNotifications ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Notificaciones Push</h3>
                <p className="text-sm text-gray-500">Recibe notificaciones push instantáneas</p>
              </div>
              <button
                onClick={() => setPushNotifications(!pushNotifications)}
                className={`${
                  pushNotifications ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    pushNotifications ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Key className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Contraseña</h2>
          </div>

          {!showChangePassword ? (
            <button
              onClick={() => setShowChangePassword(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cambiar Contraseña
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="text-sm text-red-600">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Seguridad</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Autenticación de Dos Factores</h3>
                <p className="text-sm text-gray-500">Agrega una capa extra de seguridad</p>
              </div>
              <button
                onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                className={`${
                  twoFactorAuth ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Trash2 className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Eliminar Cuenta</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Al eliminar tu cuenta, todos tus datos serán borrados permanentemente. Esta acción no se puede deshacer.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar mi cuenta
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-red-600">
                  ¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {deleteLoading ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;