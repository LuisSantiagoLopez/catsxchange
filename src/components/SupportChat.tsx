import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { SupportChat, SupportMessage } from '../types/database';

// Admin ID constante
const ADMIN_ID = "89efab8d-36d8-4cf6-b3c7-8806ff9b1409";

interface Props {
  userId?: string;
  onNewMessage?: () => void;
}

const SupportChat: React.FC<Props> = ({ userId, onNewMessage }) => {
  const { user } = useAuthStore();
  const [chat, setChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchOrCreateChat();
    }
  }, [user, userId]);

  useEffect(() => {
    if (chat) {
      subscribeToChat();
      scrollToBottom();
    }
  }, [chat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOrCreateChat = async () => {
    try {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      // Buscar chat existente
      const { data: existingChats } = await supabase
        .from('support_chats')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);

      let currentChat = existingChats?.[0];

      // Crear nuevo chat si no existe y no estamos en modo admin
      if (!currentChat && !userId) {
        const { data: newChat, error: createError } = await supabase
          .from('support_chats')
          .insert({
            user_id: user.id,
            status: 'open'
          })
          .select()
          .single();

        if (createError) throw createError;
        currentChat = newChat;
      }

      if (currentChat) {
        setChat(currentChat);

        // Cargar mensajes
        const { data: messages } = await supabase
          .from('support_messages')
          .select(`
            *,
            user:profiles(id, email, full_name)
          `)
          .eq('chat_id', currentChat.id)
          .order('created_at', { ascending: true });

        if (messages) {
          setMessages(messages);
          scrollToBottom();
        }
      }
    } catch (error) {
      console.error('Error al cargar/crear chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChat = () => {
    if (!chat?.id) return;

    const subscription = supabase
      .channel(`support-chat-${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `chat_id=eq.${chat.id}`
        },
        async (payload) => {
          const { data: message } = await supabase
            .from('support_messages')
            .select(`
              *,
              user:profiles(id, email, full_name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (message) {
            setMessages(prev => [...prev, message]);
            scrollToBottom();
            if (onNewMessage) onNewMessage();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chat || !user) return;

    try {
      setSendingMessage(true);

      // Insertar mensaje
      const { data: message, error: messageError } = await supabase
        .from('support_messages')
        .insert({
          chat_id: chat.id,
          user_id: user.id,
          content: newMessage,
          read: false
        })
        .select(`
          *,
          user:profiles(id, email, full_name)
        `)
        .single();

      if (messageError) throw messageError;

      // Actualizar mensajes localmente
      if (message) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }

      // Notificar al destinatario
      const notifyUserId = user.id === ADMIN_ID ? chat.user_id : ADMIN_ID;

      await supabase
        .from('notifications')
        .insert({
          user_id: notifyUserId,
          title: 'Nuevo mensaje de soporte',
          content: newMessage,
          read: false
        });

      setNewMessage('');
      if (onNewMessage) onNewMessage();
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!chat && userId) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No hay chat activo
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          El usuario no tiene un chat de soporte abierto
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <MessageSquare className="h-6 w-6 text-blue-600" />
        <h2 className="text-lg font-medium text-gray-900">
          Chat con {user?.id === ADMIN_ID ? 'Usuario' : 'Soporte'}
        </h2>
      </div>

      <div className="h-96 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.user_id === user?.id
                  ? 'bg-blue-100 text-blue-900'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm font-medium mb-1">
                  {message.user?.full_name}
                </p>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportChat;