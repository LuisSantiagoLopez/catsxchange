import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types/database';
import { useAuthStore } from '../store/authStore';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      const channel = supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications(prev => [payload.new as Notification, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev => 
                prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
              );
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to notifications');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to notifications');
            setError('Error al suscribirse a las notificaciones');
          }
        });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close notifications when scrolling on mobile
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      setError('Error al cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
      setError('Error al marcar la notificación como leída');
    }
  };

  const retryConnection = () => {
    setError(null);
    fetchNotifications();
  };

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full"
        aria-label="Notificaciones"
      >
        <Bell className="h-6 w-6" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-0 top-16 mx-4 sm:mx-auto sm:max-w-md sm:relative sm:top-auto sm:inset-x-auto sm:right-0 sm:mt-2 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Notificaciones</h3>
            
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-600 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="font-medium">{error}</p>
                </div>
                <button
                  onClick={retryConnection}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Reintentar
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay notificaciones nuevas</p>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <h4 className="font-medium">{notification.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{notification.content}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-sm text-purple-500 hover:text-purple-600 font-medium"
                      >
                        Marcar como leída
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;