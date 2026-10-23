import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  School,
  CheckCircle2,
  Save,
  Download,
  AlertCircle,
  Clock,
  Filter,
  Check,
  FileSpreadsheet,
  PieChart
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TahunAjaran, Kelas, Siswa, StatusAbsensi, Absensi } from '../types';
import { formatTanggalIndo, downloadCSV } from '../lib/formatters';
import { StatusAbsensiBadge } from '../components/ui/Badge';

export const AbsensiPage: React.FC = () => {
  const { role, profile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'input' | 'rekap'>('input');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Core Data
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);

  // Step Selections for Input
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedTanggal, setSelectedTanggal] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Enrolled students for selected class & year
  const [classStudents, setClassStudents] = useState<Siswa[]>([]);
  // Attendance state map: { [siswa_id]: { status: StatusAbsensi, keterangan: string, existingId?: string } }
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: StatusAbsensi; keterangan: string; existingId?: string }>
  >({});

  // Rekap Data
  const [rekapStartDate, setRekapStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [rekapEndDate, setRekapEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [rekapList, setRekapList] = useState<Absensi[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);

  // Load Years & Classes
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const tArr = await dataService.getTahunList();
      setTahunList(tArr);
      const activeT = tArr.find((t) => t.is_aktif) || tArr[0];
      if (activeT && !selectedTahunId) {
        setSelectedTahunId(activeT.id);
      }

      const kArr = await dataService.getKelasList();
      setKelasList(kArr);
      if (kArr.length > 0 && !selectedKelasId) {
        setSelectedKelasId(kArr[0].id);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memuat data awal', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When tahun, kelas, or tanggal changes, fetch class students and existing attendance
  const loadClassAttendance = async () => {
    if (!selectedTahunId || !selectedKelasId || !selectedTanggal) return;

    setLoading(true);
    try {
      // 1. Fetch students enrolled in this class for this school year
      const anggotaList = await dataService.getAnggotaList();
      const enrolled = anggotaList
        .filter((a) => a.tahun_ajaran_id === selectedTahunId && a.kelas_id === selectedKelasId)
        .map((a) => a.siswa)
        .filter(Boolean) as Siswa[];

      enrolled.sort((a, b) => a.nama.localeCompare(b.nama));
      setClassStudents(enrolled);

      // 2. Fetch existing attendance for this class and date
      const existingData = await dataService.getAbsensiList({
        kelas_id: selectedKelasId,
        tanggal: selectedTanggal,
        tahun_ajaran_id: selectedTahunId,
      });

      const stateMap: Record<string, { status: StatusAbsensi; keterangan: string; existingId?: string }> = {};

      // Map existing records
      existingData.forEach((ab: Absensi) => {
        stateMap[ab.siswa_id] = {
          status: ab.status,
          keterangan: ab.keterangan || '',
          existingId: ab.id,
        };
      });

      // Default remaining students to 'Hadir'
      enrolled.forEach((s) => {
        if (!stateMap[s.id]) {
          stateMap[s.id] = {
            status: 'Hadir',
            keterangan: '',
          };
        }
      });

      setAttendanceState(stateMap);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memuat presensi', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassAttendance();
  }, [selectedTahunId, selectedKelasId, selectedTanggal]);

  // Mark all students as Hadir
  const handleMarkAllHadir = () => {
    const updated = { ...attendanceState };
    classStudents.forEach((s) => {
      updated[s.id] = {
        ...updated[s.id],
        status: 'Hadir',
      };
    });
    setAttendanceState(updated);
    showToast('info', 'Semua siswa ditandai Hadir.', 'Presensi Diperbarui');
  };

  // Change individual attendance status
  const handleStatusChange = (siswaId: string, status: StatusAbsensi) => {
    setAttendanceState((prev) => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        status,
      },
    }));
  };

  // Change individual keterangan
  const handleKeteranganChange = (siswaId: string, keterangan: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        keterangan,
      },
    }));
  };

  // Save Attendance to Supabase using UPSERT on conflict (siswa_id, tanggal)
  const handleSaveAttendance = async () => {
    if (classStudents.length === 0) {
      showToast('warning', 'Tidak ada siswa di kelas ini untuk dicatat absensinya.', 'Peringatan');
      return;
    }

    setSaving(true);
    try {
      const recordsToUpsert = classStudents.map((s) => {
        const item = attendanceState[s.id];
        return {
          siswa_id: s.id,
          kelas_id: selectedKelasId,
          tahun_ajaran_id: selectedTahunId,
          tanggal: selectedTanggal,
          status: item?.status || 'Hadir',
          keterangan: item?.keterangan?.trim() || null,
        };
      });

      await dataService.upsertAbsensiBatch(recordsToUpsert);

      showToast(
        'success',
        `Presensi ${classStudents.length} siswa untuk tanggal ${formatTanggalIndo(selectedTanggal)} berhasil disimpan!`,
        'Absensi Tersimpan'
      );
      loadClassAttendance();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan absensi', 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Load Rekap Data
  const loadRekap = async () => {
    if (!selectedTahunId || !selectedKelasId) return;
    setRekapLoading(true);
    try {
      const list = await dataService.getAbsensiList({
        kelas_id: selectedKelasId,
        tahun_ajaran_id: selectedTahunId,
      });

      const filtered = list.filter((a) => a.tanggal >= rekapStartDate && a.tanggal <= rekapEndDate);
      setRekapList(filtered);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal Memuat Rekap', 'Error');
    } finally {
      setRekapLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rekap') {
      loadRekap();
    }
  }, [activeTab, selectedTahunId, selectedKelasId, rekapStartDate, rekapEndDate]);

  // Aggregate stats from Rekap
  const rekapStats = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    rekapList.forEach((r) => {
      if (r.status === 'Hadir') hadir++;
      else if (r.status === 'Sakit') sakit++;
      else if (r.status === 'Izin') izin++;
      else if (r.status === 'Alpa') alpa++;
    });
    const total = hadir + sakit + izin + alpa;
    const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
    return { hadir, sakit, izin, alpa, total, rate };
  }, [rekapList]);

  // Export CSV
  const handleExportRekapCSV = () => {
    if (rekapList.length === 0) {
      showToast('warning', 'Tidak ada data rekap untuk diekspor.', 'Ekspor CSV');
      return;
    }

    const headers = ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Status Absensi', 'Keterangan'];
    const rows = rekapList.map((r) => [
      r.tanggal,
      r.siswa?.nis,
      r.siswa?.nama,
      r.kelas?.nama_kelas,
      r.status,
      r.keterangan || '-',
    ]);

    downloadCSV(`rekap_absensi_${selectedKelasId}_${rekapStartDate}_${rekapEndDate}`, headers, rows);
    showToast('success', 'File rekap presensi CSV berhasil diunduh.', 'Ekspor Berhasil');
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('input')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'input'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Input Presensi Harian
        </button>

        <button
          onClick={() => setActiveTab('rekap')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'rekap'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Rekap & Laporan Kehadiran
        </button>
      </div>

      {/* ================= TAB 1: INPUT PRESENSI ================= */}
      {activeTab === 'input' && (
        <div className="space-y-6">
          {/* Step Selector Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Pencatatan Kehadiran Siswa</h2>
                <p className="text-xs text-stone-500">
                  Langkah: Pilih Tahun Ajaran ➔ Rombel Kelas ➔ Tanggal Presensi ➔ Simpan
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllHadir}
                  disabled={classStudents.length === 0}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  Semua Hadir
                </button>

                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={saving || classStudents.length === 0}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/15 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Simpan Presensi Kelas
                </button>
              </div>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-100">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  1. Tahun Ajaran
                </label>
                <select
                  value={selectedTahunId}
                  onChange={(e) => setSelectedTahunId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
                >
                  {tahunList.map((t) => (
                    <option key={t.id} value={t.id}>
                      T.A. {t.tahun} ({t.semester}) {t.is_aktif ? '★ AKTIF' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  2. Kelas / Rombel
                </label>
                <select
                  value={selectedKelasId}
                  onChange={(e) => setSelectedKelasId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
                >
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kelas {k.nama_kelas} (Tingkat {k.tingkat})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  3. Tanggal Absensi
                </label>
                <input
                  type="date"
                  value={selectedTanggal}
                  onChange={(e) => setSelectedTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                />
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm">
                Daftar Santri ({classStudents.length} Siswa Terdaftar)
              </h3>
              <span className="text-xs font-medium text-emerald-800">
                {formatTanggalIndo(selectedTanggal)}
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Memuat data absensi kelas...</span>
              </div>
            ) : classStudents.length === 0 ? (
              <div className="py-14 text-center text-stone-500 space-y-2">
                <School className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-sm font-bold text-stone-800">
                  Tidak ada siswa yang terdaftar di kelas ini pada tahun ajaran yang dipilih
                </p>
                <p className="text-xs text-stone-400">
                  Silakan lakukan penempatan siswa terlebih dahulu di menu <strong>Kelas & Anggota</strong>.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 w-12">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">NIS</th>
                      <th className="py-3 px-4 text-center">Status Kehadiran</th>
                      <th className="py-3 px-4">Keterangan Tambahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                    {classStudents.map((s, idx) => {
                      const cur = attendanceState[s.id] || { status: 'Hadir', keterangan: '' };

                      return (
                        <tr key={s.id} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="py-3 px-4 text-stone-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-stone-900 text-sm">
                            {s.nama}
                          </td>
                          <td className="py-3 px-4 font-mono text-stone-500">{s.nis}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as StatusAbsensi[]).map((st) => {
                                const isSelected = cur.status === st;

                                const colors = {
                                  Hadir: isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-stone-50 text-stone-600 hover:bg-emerald-50',
                                  Sakit: isSelected
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-stone-50 text-stone-600 hover:bg-amber-50',
                                  Izin: isSelected
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                    : 'bg-stone-50 text-stone-600 hover:bg-sky-50',
                                  Alpa: isSelected
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-stone-50 text-stone-600 hover:bg-rose-50',
                                };

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(s.id, st)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold border border-stone-200 transition-all cursor-pointer ${colors[st]}`}
                                  >
                                    {st}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={cur.keterangan}
                              onChange={(e) => handleKeteranganChange(s.id, e.target.value)}
                              placeholder="Keterangan sakit/izin..."
                              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: REKAP KEHADIRAN ================= */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Rekapitulasi Kehadiran</h2>
                <p className="text-xs text-stone-500">
                  Laporan rekap harian, mingguan, dan bulanan per kelas
                </p>
              </div>

              <button
                onClick={handleExportRekapCSV}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor Laporan CSV
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Tahun Ajaran
                </label>
                <select
                  value={selectedTahunId}
                  onChange={(e) => setSelectedTahunId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
                >
                  {tahunList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tahun} ({t.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Kelas
                </label>
                <select
                  value={selectedKelasId}
                  onChange={(e) => setSelectedKelasId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
                >
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kelas {k.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={rekapStartDate}
                  onChange={(e) => setRekapStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={rekapEndDate}
                  onChange={(e) => setRekapEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                />
              </div>
            </div>
          </div>

          {/* Quick Statistic Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-2xl font-black text-emerald-700 block">{rekapStats.hadir}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Total Hadir</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
              <span className="text-2xl font-black text-amber-700 block">{rekapStats.sakit}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Sakit</span>
            </div>
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-center">
              <span className="text-2xl font-black text-sky-700 block">{rekapStats.izin}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-900">Izin</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-center">
              <span className="text-2xl font-black text-rose-700 block">{rekapStats.alpa}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-900">Alpa</span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-stone-900 text-white text-center">
              <span className="text-2xl font-black text-emerald-400 block">{rekapStats.rate}%</span>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">Tingkat Kehadiran</span>
            </div>
          </div>

          {/* Rekap Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            {rekapLoading ? (
              <div className="py-16 text-center text-xs text-stone-500">Memuat rekap kehadiran...</div>
            ) : rekapList.length === 0 ? (
              <div className="py-14 text-center text-stone-500">
                Tidak ada data absensi untuk rentang tanggal yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">NIS</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                    {rekapList.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-stone-800">
                          {formatTanggalIndo(r.tanggal)}
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-900">
                          {r.siswa?.nama}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-500">
                          {r.siswa?.nis}
                        </td>
                        <td className="py-3 px-4">
                          <StatusAbsensiBadge status={r.status} />
                        </td>
                        <td className="py-3 px-4 text-stone-600">
                          {r.keterangan || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
