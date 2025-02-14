import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Chat, ChatMessage, Transfer } from '../types/database';

// Admin ID constante
const ADMIN_ID = "89efab8d-36d8-4cf6-b3c7-8806ff9b1409";

interface Props {
  transferId: string;
  onNewMessage?: () => void;
}

const TransferChat: React.FC<Props> = ({ transferId, onNewMessage }) => {
  const { user } = useAuthStore();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && transferId) {
      fetchChat();
      fetchTransfer();
    }
  }, [user, transferId]);

  useEffect(() => {
    if (chat) {
      subscribeToChat();
      scrollToBottom();
    }
  }, [chat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTransfer = async () => {
    try {
      const { data } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', transferId)
        .single();

      if (data) {
        setTransfer(data);
      }
    } catch (error) {
      console.error('Error al cargar transferencia:', error);
    }
  };

  const fetchChat = async () => {
    try {
      const { data: chats } = await supabase
        .from('chats')
        .select('*')
        .eq('transfer_id', transferId);

      if (chats && chats.length > 0) {
        const currentChat = chats[0];
        setChat(currentChat);

        const { data: messages } = await supabase
          .from('chat_messages')
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
      console.error('Error al cargar chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChat = () => {
    if (!chat?.id) return;

    const subscription = supabase
      .channel(`chat-${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chat.id}`
        },
        async (payload) => {
          const { data: message } = await supabase
            .from('chat_messages')
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

      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chat.id,
          user_id: user.id,
          content: newMessage
        })
        .select(`
          *,
          user:profiles(id, email, full_name)
        `)
        .single();

      if (messageError) throw messageError;

      if (message) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }

      // Obtener el ID del destinatario
      const { data: transfer } = await supabase
        .from('transfers')
        .select('user_id')
        .eq('id', transferId)
        .single();

      if (transfer) {
        // Notificar al destinatario
        const notifyUserId = user.id === ADMIN_ID ? transfer.user_id : ADMIN_ID;

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: notifyUserId,
            title: 'Nuevo mensaje en transferencia',
            content: newMessage,
            read: false
          });

        if (notificationError) {
          console.error('Error al crear notificación:', notificationError);
        }
      }

      setNewMessage('');
      if (onNewMessage) onNewMessage();
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleApproveTransfer = async () => {
    if (!transfer || !user || user.id !== ADMIN_ID) return;

    try {
      // First update status to pending
      const { error: updateError } = await supabase
        .from('transfers')
        .update({ status: 'pending' })
        .eq('id', transfer.id);

      if (updateError) throw updateError;

      // Notify user
      await supabase
        .from('notifications')
        .insert({
          user_id: transfer.user_id,
          title: 'Transferencia USDT Aprobada',
          content: 'Tu transferencia USDT ha sido aprobada. Por favor, procede con el depósito.',
          read: false
        });

      // Send message in chat
      await supabase
        .from('chat_messages')
        .insert({
          chat_id: chat?.id,
          user_id: ADMIN_ID,
          content: '✅ Transferencia aprobada. Por favor, procede con el depósito.'
        });

      // Update local transfer
      setTransfer({ ...transfer, status: 'pending' });

    } catch (error) {
      console.error('Error al aprobar transferencia:', error);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transfer || !user || user.id !== ADMIN_ID) return;

    try {
      // Update to completed only if in pending state
      const { error: updateError } = await supabase
        .from('transfers')
        .update({ status: 'completed' })
        .eq('id', transfer.id)
        .eq('status', 'pending'); // Only update if in pending state

      if (updateError) throw updateError;

      // Notify user
      await supabase
        .from('notifications')
        .insert({
          user_id: transfer.user_id,
          title: 'Transferencia USDT Completada',
          content: 'Tu transferencia USDT ha sido completada exitosamente.',
          read: false
        });

      // Send message in chat
      await supabase
        .from('chat_messages')
        .insert({
          chat_id: chat?.id,
          user_id: ADMIN_ID,
          content: '✅ Transferencia completada exitosamente.'
        });

      // Update local transfer
      setTransfer({ ...transfer, status: 'completed' });

    } catch (error) {
      console.error('Error al confirmar transferencia:', error);
    }
  };

  const handleRejectTransfer = async () => {
    if (!transfer || !user || user.id !== ADMIN_ID) return;

    try {
      const { error: updateError } = await supabase
        .from('transfers')
        .update({ status: 'failed' })
        .eq('id', transfer.id);

      if (updateError) throw updateError;

      // Notify user
      await supabase
        .from('notifications')
        .insert({
          user_id: transfer.user_id,
          title: 'Transferencia USDT Rechazada',
          content: 'Tu transferencia USDT ha sido rechazada. Por favor, contacta con soporte para más información.',
          read: false
        });

      // Send message in chat
      await supabase
        .from('chat_messages')
        .insert({
          chat_id: chat?.id,
          user_id: ADMIN_ID,
          content: '❌ Transferencia rechazada.'
        });

      // Update local transfer
      setTransfer({ ...transfer, status: 'failed' });

    } catch (error) {
      console.error('Error al rechazar transferencia:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No hay chat disponible
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No se pudo cargar el chat para esta transferencia
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-medium text-gray-900">
            Chat de la Transferencia
          </h2>
        </div>
        {/* Botones de aprobación para admin si es USDT */}
        {user?.id === ADMIN_ID && 
         transfer?.destination_currency === 'USDT' && (
          <div className="flex space-x-2">
            {transfer.status === 'pending_usd_approval' && (
              <>
                <button
                  onClick={handleRejectTransfer}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rechazar
                </button>
                <button
                  onClick={handleApproveTransfer}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aprobar
                </button>
              </>
            )}
            {transfer.status === 'pending' && (
              <button
                onClick={handleConfirmTransfer}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirmar
              </button>
            )}
          </div>
        )}
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

export default TransferChat;