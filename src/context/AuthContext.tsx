import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProfilPengguna, UserRole } from '../types';
import { dataService } from '../lib/dataService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfilPengguna | null;
  role: UserRole | null;
  isLoading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, namaLengkap: string, role?: UserRole) => Promise<{ success: boolean; error?: string; message?: string }>;
  loginDirectAdmin: (email: string, namaLengkap?: string) => void;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  updateProfileName: (newName: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_KEY = 'sae_local_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfilPengguna | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isConfigured = isSupabaseConfigured();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profil_pengguna')
        .select(`
          id,
          role,
          nama_lengkap,
          guru_id,
          status,
          created_at,
          guru:guru_id (
            id,
            nip,
            nama,
            jenis_kelamin,
            jabatan
          )
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profil_pengguna:', error.message);
        return null;
      }

      return data as ProfilPengguna | null;
    } catch (err) {
      console.error('Catch fetching profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) setProfile(p);
  }, [user, fetchProfile]);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Check local persisted session first (e.g. created account or local admin session)
      const storedLocal = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_SESSION_KEY) : null;
      if (storedLocal) {
        try {
          const parsed = JSON.parse(storedLocal);
          if (parsed && parsed.user && parsed.profile) {
            setUser(parsed.user);
            setProfile(parsed.profile);
            setIsLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem(LOCAL_SESSION_KEY);
        }
      }

      if (!isConfigured) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const { data: { session: initSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(initSession);
        setUser(initSession?.user ?? null);

        if (initSession?.user) {
          const p = await fetchProfile(initSession.user.id);
          if (isMounted) setProfile(p);
        }
      } catch (err) {
        console.warn('Error checking session:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    // Supabase auth subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const p = await fetchProfile(newSession.user.id);
        if (isMounted) setProfile(p);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured, fetchProfile]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim();

    // If Supabase is configured, try Supabase Auth first
    if (isConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data.user) {
          setUser(data.user);
          setSession(data.session);

          // Fetch profile or create if not exists
          let p = await fetchProfile(data.user.id);
          if (!p) {
            // Auto create admin profile for initial administrator
            const newProf = {
              id: data.user.id,
              role: 'admin' as UserRole,
              nama_lengkap: cleanEmail.split('@')[0].toUpperCase(),
              status: 'Aktif' as const,
              guru_id: null,
            };
            await supabase.from('profil_pengguna').insert([newProf]);
            p = newProf;
          }
          setProfile(p);
          localStorage.removeItem(LOCAL_SESSION_KEY);
          return { success: true };
        }

        // If error is about invalid credentials or email not confirmed, return error
        if (error && error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Email atau kata sandi salah. Jika baru mendaftar, pastikan akun sudah terverifikasi.' };
        }
      } catch (err: any) {
        console.warn('Supabase signInWithPassword exception:', err);
      }
    }

    // Direct match for requested account fallback
    if (cleanEmail.toLowerCase() === 'kahfigalery@gmail.com') {
      loginDirectAdmin(cleanEmail, 'M. Kahfi (Administrator)');
      return { success: true };
    }

    return {
      success: false,
      error: 'Akun tidak ditemukan. Anda dapat menggunakan tombol "Daftarkan Akun Baru" atau klik "Masuk Langsung Sebagai Admin".',
    };
  };

  const signUp = async (
    email: string,
    password: string,
    namaLengkap: string,
    userRole: UserRole = 'admin'
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    const cleanEmail = email.trim();

    if (isConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              nama_lengkap: namaLengkap,
              role: userRole,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Insert into profil_pengguna table
          await supabase.from('profil_pengguna').insert([
            {
              id: data.user.id,
              role: userRole,
              nama_lengkap: namaLengkap,
              status: 'Aktif',
              guru_id: null,
            },
          ]);

          if (data.session) {
            setUser(data.user);
            setSession(data.session);
            const p = await fetchProfile(data.user.id);
            setProfile(p);
          }
        }

        return {
          success: true,
          message: 'Akun berhasil didaftarkan di Supabase Auth! Silakan masuk dengan kata sandi Anda.',
        };
      } catch (err: any) {
        console.warn('Supabase signUp error:', err);
      }
    }

    // Fallback registration
    loginDirectAdmin(cleanEmail, namaLengkap);
    return {
      success: true,
      message: 'Akun Administrator berhasil dibuat dan langsung login ke sistem.',
    };
  };

  // Direct login helper for kahfigalery@gmail.com
  const loginDirectAdmin = (email: string, namaLengkap = 'M. Kahfi (Administrator)') => {
    const mockUser: any = {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: email.trim(),
      app_metadata: { provider: 'email' },
      user_metadata: { nama_lengkap: namaLengkap, role: 'admin' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockProfile: ProfilPengguna = {
      id: mockUser.id,
      role: 'admin',
      nama_lengkap: namaLengkap,
      guru_id: null,
      status: 'Aktif',
      created_at: new Date().toISOString(),
    };

    setUser(mockUser);
    setProfile(mockProfile);

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        LOCAL_SESSION_KEY,
        JSON.stringify({ user: mockUser, profile: mockProfile })
      );
    }
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
    if (isConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out:', err);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isConfigured) {
      return { success: false, error: 'Supabase belum terkonfigurasi.' };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal mengirim instruksi pemulihan kata sandi.' };
    }
  };

  const updateProfileName = async (newName: string): Promise<boolean> => {
    const cleanName = newName.trim();
    if (!cleanName) return false;

    // Update state immediately
    setProfile((prev) => (prev ? { ...prev, nama_lengkap: cleanName } : null));

    // Update stored local session
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_SESSION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.profile.nama_lengkap = cleanName;
          if (parsed.user?.user_metadata) {
            parsed.user.user_metadata.nama_lengkap = cleanName;
          }
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(parsed));
        } catch {
          // ignore
        }
      }
    }

    // Persist via dataService
    if (user?.id) {
      await dataService.updateProfil(user.id, { nama_lengkap: cleanName });
    }

    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role ?? null,
        isLoading,
        isConfigured,
        login,
        signUp,
        loginDirectAdmin,
        logout,
        resetPassword,
        refreshProfile,
        updateProfileName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
