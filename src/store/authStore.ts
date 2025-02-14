import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  setUser: (user: Profile | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        set({ user: null, loading: false });
        return;
      }

      // Wait a moment for the trigger to create the profile if needed
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      set({ user: profile || null, loading: false });

      // Subscribe to auth changes
      const { data: { subscription } } = await supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Wait a moment for the trigger to create the profile
          await new Promise(resolve => setTimeout(resolve, 1000));

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          set({ user: profile || null, loading: false });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, loading: false });
        } else if (event === 'TOKEN_REFRESHED') {
          // Handle token refresh
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            set({ user: profile || null, loading: false });
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing auth:', error);
      // If there's a token error, sign out
      if (error instanceof Error && error.message.includes('refresh_token_not_found')) {
        await supabase.auth.signOut();
      }
      set({ user: null, loading: false });
    }
  },
  signIn: async (email, password) => {
    try {
      const { error, data: { session } } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      if (session?.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!profile) {
          throw new Error('Profile not found');
        }

        set({ user: profile, loading: false });
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },
  signUp: async (email, password, fullName) => {
    try {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (signUpError) {
        if (signUpError.message === 'User already registered') {
          throw new Error('An account with this email already exists');
        }
        throw signUpError;
      }

      const authUser = data?.user;
      if (!authUser?.id) {
        throw new Error('Error registering user');
      }

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get created profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profile) {
        throw new Error('Error creating user profile');
      }

      set({ user: profile, loading: false });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error creating account');
    }
  },
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, loading: false });
    } catch (error) {
      console.error('Error signing out:', error);
      // Force local state cleanup even if error
      set({ user: null, loading: false });
    }
  },
}));