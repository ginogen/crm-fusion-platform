import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  setSession: (session: Session | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),
  
  setSession: (session: Session | null) => {
    set({ 
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session
    });
  },

  login: async (token: string) => {
    localStorage.setItem('token', token);
    const { data: { session } } = await supabase.auth.getSession();
    set({ 
      session,
      user: session?.user ?? null,
      isAuthenticated: true 
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    set({ 
      session: null,
      user: null,
      isAuthenticated: false 
    });
  },
}));

// Suscribirse a cambios de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  useAuth.getState().setSession(session);
}); 