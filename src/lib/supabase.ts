import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables or browser storage fallback
const getStoredCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey && !envUrl.includes('your-project-id')) {
    return { url: envUrl, key: envKey, source: 'env' as const };
  }

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('sae_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('sae_supabase_anon_key') : null;

  if (localUrl && localKey) {
    return { url: localUrl, key: localKey, source: 'local' as const };
  }

  return {
    url: envUrl || '',
    key: envKey || '',
    source: 'none' as const
  };
};

const creds = getStoredCredentials();

// Dummy fallback to avoid crashing instantiation if empty
const activeUrl = creds.url || 'https://placeholder-instance.supabase.co';
const activeKey = creds.key || 'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  const current = getStoredCredentials();
  return (
    Boolean(current.url) &&
    Boolean(current.key) &&
    !current.url.includes('placeholder-instance') &&
    !current.url.includes('your-project-id')
  );
};

export const getSupabaseConfig = () => {
  return getStoredCredentials();
};

export const saveSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sae_supabase_url', url.trim());
    localStorage.setItem('sae_supabase_anon_key', key.trim());
    window.location.reload();
  }
};

export const clearSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sae_supabase_url');
    localStorage.removeItem('sae_supabase_anon_key');
    window.location.reload();
  }
};

export const supabase: SupabaseClient = createClient(activeUrl, activeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'URL atau Anon Key Supabase belum dikonfigurasi di file .env atau pengaturan aplikasi.'
    };
  }

  try {
    const { data, error } = await supabase.from('tahun_ajaran').select('id, tahun').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Terhubung ke Supabase, namun tabel tahun_ajaran belum dibuat. Silakan jalankan Skrip SQL di SQL Editor Supabase.'
        };
      }
      return {
        success: false,
        message: `Koneksi Supabase error: ${error.message} (${error.code || 'code unknown'})`
      };
    }
    return {
      success: true,
      message: 'Koneksi ke database Supabase berhasil dan tabel siap digunakan!',
      details: data
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal menghubungi server Supabase'
    };
  }
};
