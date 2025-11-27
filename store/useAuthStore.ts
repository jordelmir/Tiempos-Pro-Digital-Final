import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { AuditService } from '../lib/AuditService';
import { AppUser, UserRole, AuditSeverity, AuditEventType } from '../types';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  setUser: (u: AppUser | null) => void;
  fetchUser: (silent?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(persist((set, get) => ({
  user: null,
  loading: true,
  setUser: (u) => set({ user: u }),
  fetchUser: async (silent = false) => {
    try {
      if (!silent) set({ loading: true });

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        set({ user: null, loading: false });
        return;
      }

      // Fetch the app_user profile based on the auth_uid
      const { data: appUser, error: dbError } = await supabase
        .from('app_users')
        .select('*')
        .eq('auth_uid', authData.user.id)
        .single();

      if (dbError || !appUser) {
        console.error("Profile not found for auth user", dbError);
        set({ user: null, loading: false });
      } else {
        set({ user: appUser as AppUser, loading: false });
      }
    } catch (e) {
      console.error(e);
      set({ user: null, loading: false });
    }
  },
  signOut: async () => {
    const user = get().user;
    if (user) {
      await AuditService.logAction({
        action: 'USER_LOGOUT',
        type: AuditEventType.SESSION_LOGIN, // Using SESSION category
        severity: AuditSeverity.INFO,
        target: user.id,
        details: { email: user.email }
      });
    }
    await supabase.auth.signOut();
    set({ user: null });
  }
}), { name: 'tiempospro_auth_v3' }));