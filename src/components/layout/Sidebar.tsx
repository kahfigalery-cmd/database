import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  Award,
  UserCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  Sprout,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../ui/Badge';
import { isSupabaseConfigured } from '../../lib/supabase';

export type NavTab =
  | 'dashboard'
  | 'siswa'
  | 'guru'
  | 'kelas'
  | 'mapel'
  | 'jadwal'
  | 'absensi'
  | 'nilai'
  | 'pengaturan';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenDbModal: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onOpenDbModal,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { profile, user, role, logout } = useAuth();
  const configured = isSupabaseConfigured();

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'kepala_sekolah', 'guru', 'operator'] },
    { id: 'siswa' as NavTab, label: 'Data Siswa', icon: GraduationCap, roles: ['admin', 'kepala_sekolah', 'guru', 'operator'] },
    { id: 'guru' as NavTab, label: 'Data Guru', icon: Users, roles: ['admin', 'kepala_sekolah', 'guru', 'operator'] },
    { id: 'kelas' as NavTab, label: 'Kelas & Anggota', icon: School, roles: ['admin', 'kepala_sekolah', 'guru', 'operator'] },
    { id: 'mapel' as NavTab, label: 'Mapel & Penugasan', icon: BookOpen, roles: ['admin', 'kepala_sekolah', 'guru', 'operator'] },
    { id: 'jadwal' as NavTab, label: 'Jadwal Pelajaran', icon: CalendarDays, roles: ['admin', 'kepala_sekolah', 'guru', 'operator'] },
    { id: 'absensi' as NavTab, label: 'Absensi Siswa', icon: CalendarCheck, roles: ['admin', 'kepala_sekolah', 'guru', 'operator'] },
    { id: 'nilai' as NavTab, label: 'Nilai Siswa', icon: Award, roles: ['admin', 'kepala_sekolah', 'guru', 'operator'] },
    { id: 'pengaturan' as NavTab, label: 'Profil & Pengguna', icon: UserCheck, roles: ['admin', 'kepala_sekolah', 'guru', 'operator'] },
  ];

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-stone-900/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-stone-950 text-stone-200 border-r border-stone-800/80 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-18 px-4 flex items-center justify-between border-b border-stone-800/60 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="/logo-sae.png"
              alt="Logo SMP Alam Excellentia"
              className="w-10 h-10 object-contain rounded-full bg-white p-0.5 shadow-md shadow-emerald-950/40 shrink-0"
            />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase leading-none">
                  SIS SAE
                </span>
                <span className="text-sm font-extrabold text-stone-100 tracking-tight truncate">
                  SMP Alam Excellentia
                </span>
                <span className="text-[10px] text-stone-400 truncate">Pamekasan, Madura</span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 transition-colors cursor-pointer"
            aria-label={isCollapsed ? 'Perlebar Sidebar' : 'Persempit Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-semibold'
                    : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-stone-400 group-hover:text-emerald-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Database Status Button */}
        <div className="px-3 py-2 border-t border-stone-800/60 shrink-0">
          <button
            onClick={onOpenDbModal}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              configured
                ? 'bg-stone-900/80 border-emerald-900/60 text-emerald-300 hover:bg-stone-800'
                : 'bg-rose-950/40 border-rose-900/60 text-rose-300 hover:bg-rose-900/40'
            } ${isCollapsed ? 'justify-center px-2' : ''}`}
            title="Pengaturan & Skema Database Supabase"
          >
            <Database className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="truncate font-semibold">{configured ? 'Supabase Aktif' : 'Atur Supabase'}</p>
                <p className="text-[10px] text-stone-400 truncate">Skema & RLS</p>
              </div>
            )}
          </button>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-stone-800/60 shrink-0 bg-stone-900/30">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-emerald-400 text-sm shrink-0">
              {profile?.nama_lengkap
                ? profile.nama_lengkap.charAt(0).toUpperCase()
                : user?.email
                ? user.email.charAt(0).toUpperCase()
                : 'U'}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-stone-200 truncate leading-tight">
                  {profile?.nama_lengkap || user?.email || 'Pengguna'}
                </p>
                <div className="mt-0.5">
                  <RoleBadge role={role} />
                </div>
              </div>
            )}

            {!isCollapsed && (
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors cursor-pointer"
                title="Keluar dari Sistem"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
