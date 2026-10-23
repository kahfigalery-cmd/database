import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SupabaseConfigModal } from './components/common/SupabaseConfigModal';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SiswaPage } from './pages/Siswa';
import { GuruPage } from './pages/Guru';
import { KelasPage } from './pages/Kelas';
import { MataPelajaranPage } from './pages/MataPelajaran';
import { JadwalPelajaranPage } from './pages/JadwalPelajaran';
import { AbsensiPage } from './pages/Absensi';
import { NilaiPage } from './pages/Nilai';
import { ProfilPenggunaPage } from './pages/ProfilPengguna';
import { Sprout } from 'lucide-react';

const TAB_TITLES: Record<NavTab, string> = {
  dashboard: 'Dashboard Utama',
  siswa: 'Data Siswa & Santri',
  guru: 'Data Guru & Tenaga Pendidik',
  kelas: 'Kelas & Tahun Ajaran',
  mapel: 'Mata Pelajaran & Penugasan',
  jadwal: 'Jadwal Pelajaran Mingguan',
  absensi: 'Presensi & Absensi Siswa',
  nilai: 'Penilaian & Asesmen Siswa',
  pengaturan: 'Profil Pengguna & Keamanan',
};

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-stone-900 text-stone-100">
        <img
          src="/logo-sae.png"
          alt="Logo SMP Alam Excellentia"
          className="w-16 h-16 object-contain rounded-full bg-white p-1 mb-4 shadow-xl shadow-emerald-950/40 animate-pulse"
        />
        <h2 className="text-lg font-black tracking-tight text-white">SMP ALAM EXCELLENTIA</h2>
        <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mt-1">SIS SAE • Pamekasan</p>
        <div className="mt-6 flex items-center gap-2 text-xs text-stone-400">
          <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Menghubungkan ke database Supabase...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onOpenDbModal={() => setIsDbModalOpen(true)} />
        <SupabaseConfigModal isOpen={isDbModalOpen} onClose={() => setIsDbModalOpen(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex text-stone-900 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenDbModal={() => setIsDbModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Header
          pageTitle={TAB_TITLES[currentTab]}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenDbModal={() => setIsDbModalOpen(true)}
          onNavigateToProfile={() => setCurrentTab('pengaturan')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <Dashboard onNavigate={setCurrentTab} onOpenDbModal={() => setIsDbModalOpen(true)} />
          )}
          {currentTab === 'siswa' && <SiswaPage />}
          {currentTab === 'guru' && <GuruPage />}
          {currentTab === 'kelas' && <KelasPage />}
          {currentTab === 'mapel' && <MataPelajaranPage />}
          {currentTab === 'jadwal' && <JadwalPelajaranPage />}
          {currentTab === 'absensi' && <AbsensiPage />}
          {currentTab === 'nilai' && <NilaiPage />}
          {currentTab === 'pengaturan' && <ProfilPenggunaPage />}
        </main>
      </div>

      {/* Supabase Configuration & SQL Schema Modal */}
      <SupabaseConfigModal isOpen={isDbModalOpen} onClose={() => setIsDbModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ToastProvider>
  );
}
