import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { SupportChat } from '../../types/database';
import SupportChatComponent from '../../components/SupportChat';

const SupportChatsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchChats();
    subscribeToChats();
  }, [user, navigate]);

  const fetchChats = async () => {
    try {
      const { data } = await supabase
        .from('support_chats')
        .select(`
          *,
          user:profiles(id, email, full_name)
        `)
        .order('updated_at', { ascending: false });

      if (data) {
        setChats(data);
      }
    } catch (error) {
      console.error('Error al cargar chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChats = () => {
    const subscription = supabase
      .channel('support-chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_chats'
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const filteredChats = chats.filter(chat => 
    chat.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Lista de Chats */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Chats de Soporte
            </h2>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por email o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay chats</h3>
              <p className="mt-1 text-sm text-gray-500">
                No hay chats de soporte activos
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat.user_id)}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedChat === chat.user_id
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                } border`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {chat.user?.full_name || 'Usuario Desconocido'}
                    </h3>
                    <p className="text-sm text-gray-500">{chat.user?.email}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    chat.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {chat.status === 'open' ? 'Abierto' : 'Cerrado'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Última actualización: {new Date(chat.updated_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Activo */}
      <div className="md:col-span-2">
        {selectedChat ? (
          <SupportChatComponent userId={selectedChat} onNewMessage={fetchChats} />
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Selecciona un chat
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Selecciona un chat de la lista para ver la conversación
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportChatsPage;