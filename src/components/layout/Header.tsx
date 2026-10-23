import React, { useEffect, useState } from 'react';
import { Menu, Database, Calendar, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { TahunAjaran } from '../../types';
import { RoleBadge } from '../ui/Badge';

interface HeaderProps {
  pageTitle: string;
  onOpenMobileSidebar: () => void;
  onOpenDbModal: () => void;
  onNavigateToProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  onOpenMobileSidebar,
  onOpenDbModal,
  onNavigateToProfile,
}) => {
  const { profile, user, role } = useAuth();
  const [activeTahun, setActiveTahun] = useState<TahunAjaran | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let isMounted = true;
    const loadActiveYear = async () => {
      try {
        const { data, error } = await supabase
          .from('tahun_ajaran')
          .select('*')
          .eq('is_aktif', true)
          .maybeSingle();

        if (!error && data && isMounted) {
          setActiveTahun(data as TahunAjaran);
        }
      } catch (err) {
        // Safe catch
      }
    };

    loadActiveYear();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="h-18 bg-white border-b border-stone-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
          aria-label="Buka navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <img
          src="/logo-sae.png"
          alt="Logo SMP Alam Excellentia"
          className="w-8 h-8 object-contain rounded-full lg:hidden shrink-0"
        />

        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-xs text-stone-500 hidden sm:block">
            Sistem Informasi Sekolah SMP Alam Excellentia Pamekasan
          </p>
        </div>
      </div>

      {/* Right: Active Year, Database Status, and User Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Academic Year Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            {activeTahun
              ? `T.A. ${activeTahun.tahun} (${activeTahun.semester})`
              : 'T.A. Belum Diaktifkan'}
          </span>
        </div>

        {/* Database Status Button */}
        <button
          onClick={onOpenDbModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700 transition-colors cursor-pointer"
          title="Status Database & Panduan SQL"
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Supabase</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        {/* User Profile Pill */}
        <button
          onClick={onNavigateToProfile}
          className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
          title="Lihat Profil Saya"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {profile?.nama_lengkap
              ? profile.nama_lengkap.charAt(0).toUpperCase()
              : user?.email
              ? user.email.charAt(0).toUpperCase()
              : 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-stone-800 leading-tight truncate max-w-[120px]">
              {profile?.nama_lengkap || user?.email?.split('@')[0] || 'Pengguna'}
            </p>
            <p className="text-[10px] text-stone-500 uppercase tracking-wide leading-tight">
              {role || 'Admin'}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
};
