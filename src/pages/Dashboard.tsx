import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  GraduationCap,
  School,
  BookOpen,
  CalendarCheck,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserPlus,
  Calendar,
  Layers
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';
import { Siswa, Guru, Kelas, MataPelajaran, TahunAjaran, JadwalPelajaran, HariSekolah } from '../types';
import { formatTanggalIndo, formatJam } from '../lib/formatters';
import { StatusSiswaBadge } from '../components/ui/Badge';
import { NavTab } from '../components/layout/Sidebar';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenDbModal: () => void;
}

interface StatsData {
  totalSiswaAktif: number;
  totalSiswaL: number;
  totalSiswaP: number;
  totalGuruAktif: number;
  totalKelas: number;
  totalMapelAktif: number;
  activeTahun: TahunAjaran | null;
  attendanceToday: {
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    total: number;
  };
  levelDistribution: {
    level7: number;
    level8: number;
    level9: number;
  };
  todaySchedules: any[];
  recentSiswa: Siswa[];
  missingDataWarnings: string[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenDbModal }) => {
  const { profile, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData>({
    totalSiswaAktif: 0,
    totalSiswaL: 0,
    totalSiswaP: 0,
    totalGuruAktif: 0,
    totalKelas: 0,
    totalMapelAktif: 0,
    activeTahun: null,
    attendanceToday: { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 },
    levelDistribution: { level7: 0, level8: 0, level9: 0 },
    todaySchedules: [],
    recentSiswa: [],
    missingDataWarnings: [],
  });

  const getDayNameIndo = (): HariSekolah => {
    const days: HariSekolah[] = ['Minggu' as any, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const d = new Date().getDay();
    const day = days[d];
    return (day === ('Minggu' as any) ? 'Senin' : day) as HariSekolah;
  };

  const getTodayDateString = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    const warnings: string[] = [];

    try {
      // 1. Tahun Ajaran Aktif
      const tahunList = await dataService.getTahunList();
      const activeTahun = tahunList.find((t) => t.is_aktif) || null;

      if (!activeTahun) {
        warnings.push('Belum ada Tahun Ajaran yang diatur sebagai "Aktif". Atur di menu Kelas & Tahun Ajaran.');
      }

      // 2. Total Siswa Aktif & Gender Breakdown
      const siswaData = await dataService.getSiswaList();
      let countSiswaAktif = 0;
      let countL = 0;
      let countP = 0;

      siswaData.forEach((s) => {
        if (s.status === 'Aktif') {
          countSiswaAktif++;
          if (s.jenis_kelamin === 'L') countL++;
          else if (s.jenis_kelamin === 'P') countP++;
        }
      });

      const recentStudents = [...siswaData]
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
        .slice(0, 5);

      // 3. Total Guru Aktif
      const guruData = await dataService.getGuruList();
      const countGuruAktif = guruData.filter((g) => g.status === 'Aktif').length;

      // 4. Total Kelas & Tingkat
      const kelasData = await dataService.getKelasList();
      const countKelas = kelasData.length;
      if (kelasData.some((k) => !k.wali_kelas_id)) {
        warnings.push('Beberapa kelas belum memiliki Wali Kelas yang ditetapkan.');
      }

      // 5. Total Mapel Aktif
      const mapelData = await dataService.getMapelList();
      const countMapelAktif = mapelData.filter((m) => m.status === 'Aktif').length;

      // 6. Level Distribution via anggota_kelas
      let l7 = 0;
      let l8 = 0;
      let l9 = 0;

      if (activeTahun?.id) {
        const anggotaData = await dataService.getAnggotaList();
        anggotaData
          .filter((a) => a.tahun_ajaran_id === activeTahun.id)
          .forEach((item) => {
            const tk = item.kelas?.tingkat;
            if (tk === 7) l7++;
            else if (tk === 8) l8++;
            else if (tk === 9) l9++;
          });
      }

      // 7. Today's Attendance
      const todayStr = getTodayDateString();
      const absensiData = await dataService.getAbsensiList({ tanggal: todayStr });

      const attRecap = { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
      absensiData.forEach((ab) => {
        attRecap.total++;
        if (ab.status === 'Hadir') attRecap.hadir++;
        else if (ab.status === 'Sakit') attRecap.sakit++;
        else if (ab.status === 'Izin') attRecap.izin++;
        else if (ab.status === 'Alpa') attRecap.alpa++;
      });

      // 8. Today's Schedule
      const todayDay = getDayNameIndo();
      const allSchedules = await dataService.getJadwalList();
      const todaySchedules = allSchedules
        .filter((s) => s.hari === todayDay)
        .sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai))
        .slice(0, 8);

      setStats({
        totalSiswaAktif: countSiswaAktif,
        totalSiswaL: countL,
        totalSiswaP: countP,
        totalGuruAktif: countGuruAktif,
        totalKelas: countKelas,
        totalMapelAktif: countMapelAktif,
        activeTahun: activeTahun,
        attendanceToday: attRecap,
        levelDistribution: { level7: l7, level8: l8, level9: l9 },
        todaySchedules,
        recentSiswa: recentStudents,
        missingDataWarnings: warnings,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalAssignedStudents = stats.levelDistribution.level7 + stats.levelDistribution.level8 + stats.levelDistribution.level9;
  const attendanceRate = stats.attendanceToday.total > 0
    ? Math.round((stats.attendanceToday.hadir / stats.attendanceToday.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/15">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src="/logo-sae.png"
              alt="Logo Resmi SMP Alam Excellentia"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full bg-white p-1 shadow-lg shrink-0 border border-emerald-400/40"
            />
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SMP Alam Excellentia Pamekasan (SAE)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Ahlan Wa Sahlan, {profile?.nama_lengkap || 'Pengguna'}!
              </h2>
              <p className="text-emerald-100/80 text-xs sm:text-sm max-w-xl leading-relaxed">
                Portal akademik dan administrasi sekolah terintegrasi. Pantau perkembangan santri, presensi, dan kegiatan belajar real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold flex items-center gap-2 backdrop-blur-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan Data
            </button>
            <button
              onClick={() => onNavigate('absensi')}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Input Absensi
            </button>
          </div>
        </div>
      </div>

      {/* Warnings & Alerts */}
      {stats.missingDataWarnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Pemberitahuan Kelengkapan Data:</span>
          </div>
          <ul className="list-disc pl-6 space-y-0.5 text-amber-700">
            {stats.missingDataWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">{errorMsg}</p>
            <button
              onClick={onOpenDbModal}
              className="mt-2 text-rose-700 underline font-semibold cursor-pointer"
            >
              Buka Konfigurasi Database & Skrip SQL
            </button>
          </div>
        </div>
      )}

      {/* Core Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Siswa Aktif */}
        <div
          onClick={() => onNavigate('siswa')}
          className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Siswa Aktif
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900 tracking-tight">
              {loading ? '-' : stats.totalSiswaAktif}
            </span>
            <span className="text-xs text-stone-400 font-medium">Santri / Murid</span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>L: <strong className="text-stone-800">{stats.totalSiswaL}</strong></span>
            <span>•</span>
            <span>P: <strong className="text-stone-800">{stats.totalSiswaP}</strong></span>
            <span className="text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              Lihat <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Guru Aktif */}
        <div
          onClick={() => onNavigate('guru')}
          className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Guru & Pendidik
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900 tracking-tight">
              {loading ? '-' : stats.totalGuruAktif}
            </span>
            <span className="text-xs text-stone-400 font-medium">Ustaz & Ustazah</span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Status: <strong className="text-emerald-700">Aktif</strong></span>
            <span className="text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              Kelola <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Total Kelas */}
        <div
          onClick={() => onNavigate('kelas')}
          className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Rombongan Belajar
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <School className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900 tracking-tight">
              {loading ? '-' : stats.totalKelas}
            </span>
            <span className="text-xs text-stone-400 font-medium">Kelas 7, 8, 9</span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Terkelompok: <strong className="text-stone-800">{totalAssignedStudents}</strong> siswa</span>
            <span className="text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              Buka <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Mata Pelajaran */}
        <div
          onClick={() => onNavigate('mapel')}
          className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Mata Pelajaran
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900 tracking-tight">
              {loading ? '-' : stats.totalMapelAktif}
            </span>
            <span className="text-xs text-stone-400 font-medium">Kurikulum & Alam</span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Kurikulum Merdeka + SAE</span>
            <span className="text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              Lihat <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Distribution & Today Attendance Recap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Level Distribution Chart */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">Distribusi Jenjang Kelas</h3>
              <p className="text-xs text-stone-500">Tahun Ajaran {stats.activeTahun?.tahun || 'Berjalan'}</p>
            </div>
            <Layers className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="space-y-4 pt-2">
            {/* Level 7 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-stone-700">Tingkat 7</span>
                <span className="text-emerald-700 font-bold">{stats.levelDistribution.level7} Siswa</span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{
                    width: totalAssignedStudents > 0
                      ? `${(stats.levelDistribution.level7 / totalAssignedStudents) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>

            {/* Level 8 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-stone-700">Tingkat 8</span>
                <span className="text-teal-700 font-bold">{stats.levelDistribution.level8} Siswa</span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-500"
                  style={{
                    width: totalAssignedStudents > 0
                      ? `${(stats.levelDistribution.level8 / totalAssignedStudents) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>

            {/* Level 9 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-stone-700">Tingkat 9</span>
                <span className="text-emerald-800 font-bold">{stats.levelDistribution.level9} Siswa</span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-800 rounded-full transition-all duration-500"
                  style={{
                    width: totalAssignedStudents > 0
                      ? `${(stats.levelDistribution.level9 / totalAssignedStudents) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-stone-100 text-xs text-stone-500 flex justify-between items-center">
            <span>Total Siswa Terdaftar di Kelas:</span>
            <span className="font-extrabold text-stone-900">{totalAssignedStudents} Santri</span>
          </div>
        </div>

        {/* Today's Attendance Recap */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">Kehadiran Hari Ini</h3>
              <p className="text-xs text-stone-500">{formatTanggalIndo(getTodayDateString())}</p>
            </div>
            <CalendarCheck className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-2xl font-black text-emerald-700 block">
                {stats.attendanceToday.hadir}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                Hadir
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-center">
              <span className="text-2xl font-black text-amber-700 block">
                {stats.attendanceToday.sakit}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                Sakit
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 text-center">
              <span className="text-2xl font-black text-sky-700 block">
                {stats.attendanceToday.izin}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900">
                Izin
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-center">
              <span className="text-2xl font-black text-rose-700 block">
                {stats.attendanceToday.alpa}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900">
                Alpa
              </span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-stone-600 font-medium">Tingkat Kehadiran:</span>
            <span className="font-extrabold text-emerald-700 text-sm">
              {stats.attendanceToday.total > 0 ? `${attendanceRate}%` : 'Belum diisi'}
            </span>
          </div>
        </div>

        {/* Quick Actions & School Info */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-stone-900 text-sm mb-1">Aksi Cepat Staf</h3>
            <p className="text-xs text-stone-500 mb-4">Pintasan administrasi harian</p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('siswa')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 text-xs font-semibold text-stone-700 transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  Tambah & Kelola Data Siswa
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              </button>

              <button
                onClick={() => onNavigate('jadwal')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 text-xs font-semibold text-stone-700 transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Cek Jadwal Pelajaran Mingguan
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              </button>

              <button
                onClick={() => onNavigate('nilai')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 text-xs font-semibold text-stone-700 transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  Rekap Nilai & Asesmen
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
            <span>SMP Alam Excellentia</span>
            <span className="text-emerald-700 font-bold">Pamekasan</span>
          </div>
        </div>
      </div>

      {/* Row 3: Today's Schedule & Recent Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule Table */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">
                Jadwal Pelajaran Hari {getDayNameIndo()}
              </h3>
              <p className="text-xs text-stone-500">Mata pelajaran yang aktif hari ini</p>
            </div>
            <button
              onClick={() => onNavigate('jadwal')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              Semua Jadwal <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.todaySchedules.length === 0 ? (
            <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <Clock className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-600">
                Tidak ada jadwal pelajaran untuk hari ini ({getDayNameIndo()}).
              </p>
              <p className="text-[11px] text-stone-400 mt-1">
                Atur jadwal mingguan di menu Jadwal Pelajaran.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Waktu</th>
                    <th className="pb-2">Mata Pelajaran</th>
                    <th className="pb-2">Kelas</th>
                    <th className="pb-2">Guru Pengajar</th>
                    <th className="pb-2">Ruang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {stats.todaySchedules.map((sch) => (
                    <tr key={sch.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-2.5 font-mono text-emerald-700 font-semibold whitespace-nowrap">
                        {formatJam(sch.jam_mulai)} - {formatJam(sch.jam_selesai)}
                      </td>
                      <td className="py-2.5 font-bold text-stone-900 whitespace-nowrap">
                        {sch.mengajar?.mapel?.nama_mapel || '-'}
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 font-semibold text-stone-800">
                          {sch.mengajar?.kelas?.nama_kelas || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 whitespace-nowrap truncate max-w-[140px]">
                        {sch.mengajar?.guru?.nama || '-'}
                      </td>
                      <td className="py-2.5 text-stone-500 whitespace-nowrap">
                        {sch.ruang || 'Kelas'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Students Table */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">Data Siswa Terbaru</h3>
              <p className="text-xs text-stone-500">Siswa yang baru terdaftar di sistem</p>
            </div>
            <button
              onClick={() => onNavigate('siswa')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.recentSiswa.length === 0 ? (
            <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <GraduationCap className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-600">
                Belum ada data siswa di database.
              </p>
              <button
                onClick={() => onNavigate('siswa')}
                className="mt-3 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tambah Siswa Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">NIS / NISN</th>
                    <th className="pb-2">Nama Siswa</th>
                    <th className="pb-2">L/P</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {stats.recentSiswa.map((sis) => (
                    <tr key={sis.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-2.5 font-mono text-stone-500">
                        {sis.nis || sis.nisn}
                      </td>
                      <td className="py-2.5 font-bold text-stone-900">
                        {sis.nama}
                      </td>
                      <td className="py-2.5 font-semibold text-stone-600">
                        {sis.jenis_kelamin}
                      </td>
                      <td className="py-2.5">
                        <StatusSiswaBadge status={sis.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
