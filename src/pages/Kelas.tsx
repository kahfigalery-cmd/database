import React, { useState, useEffect, useMemo } from 'react';
import {
  School,
  Calendar,
  Users,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  CheckCircle2,
  Search,
  UserPlus,
  AlertTriangle,
  History,
  ArrowRight
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Kelas, Guru, TahunAjaran, Siswa, AnggotaKelas } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusSiswaBadge } from '../components/ui/Badge';

export const KelasPage: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'kelas' | 'tahun_ajaran' | 'anggota'>('kelas');
  const [loading, setLoading] = useState(true);

  // Core Data
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [allStudents, setAllStudents] = useState<Siswa[]>([]);
  const [anggotaList, setAnggotaList] = useState<AnggotaKelas[]>([]);

  // Selected filters for tab 'anggota'
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');

  // Modals
  const [isKelasModalOpen, setIsKelasModalOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [kelasForm, setKelasForm] = useState({ tingkat: 7, nama_kelas: '', wali_kelas_id: '' });

  const [isTahunModalOpen, setIsTahunModalOpen] = useState(false);
  const [tahunForm, setTahunForm] = useState({ tahun: '2024/2025', semester: 'Genap' as 'Ganjil' | 'Genap', is_aktif: false });

  const [isAnggotaModalOpen, setIsAnggotaModalOpen] = useState(false);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>('');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'kelas' | 'tahun' | 'anggota'; id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Tahun Ajaran
      const tahunArr = await dataService.getTahunList();
      setTahunList(tahunArr);

      const activeT = tahunArr.find((t) => t.is_aktif) || tahunArr[0];
      if (activeT && !selectedTahunId) {
        setSelectedTahunId(activeT.id);
      }

      // 2. Teachers
      const guruArr = await dataService.getGuruList();
      setTeachers(guruArr.filter((g) => g.status === 'Aktif'));

      // 3. Classes
      const kArr = await dataService.getKelasList();
      setKelasList(kArr);
      if (kArr.length > 0 && !selectedKelasId) {
        setSelectedKelasId(kArr[0].id);
      }

      // 4. Students
      const sArr = await dataService.getSiswaList();
      setAllStudents(sArr.filter((s) => s.status === 'Aktif'));

      // 5. Anggota Kelas
      const aArr = await dataService.getAnggotaList();
      setAnggotaList(aArr);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memuat data kelas', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Calculate REAL student counts per class for the selected or active school year
  const activeYearId = selectedTahunId || tahunList.find((t) => t.is_aktif)?.id || '';
  const studentCountPerClass = useMemo(() => {
    const counts: Record<string, number> = {};
    anggotaList.forEach((a) => {
      if (a.tahun_ajaran_id === activeYearId) {
        counts[a.kelas_id] = (counts[a.kelas_id] || 0) + 1;
      }
    });
    return counts;
  }, [anggotaList, activeYearId]);

  // Students placed in the selected class and selected academic year
  const enrolledStudentsInSelectedClass = useMemo(() => {
    return anggotaList.filter(
      (a) => a.tahun_ajaran_id === selectedTahunId && a.kelas_id === selectedKelasId
    );
  }, [anggotaList, selectedTahunId, selectedKelasId]);

  // Unassigned students for the selected academic year (protects UNIQUE constraint)
  const availableStudentsForYear = useMemo(() => {
    const assignedIds = new Set(
      anggotaList
        .filter((a) => a.tahun_ajaran_id === selectedTahunId)
        .map((a) => a.siswa_id)
    );
    return allStudents.filter((s) => !assignedIds.has(s.id));
  }, [allStudents, anggotaList, selectedTahunId]);

  // --- Handlers: Kelas ---
  const handleOpenAddKelas = () => {
    setEditingKelas(null);
    setKelasForm({ tingkat: 7, nama_kelas: '', wali_kelas_id: '' });
    setIsKelasModalOpen(true);
  };

  const handleOpenEditKelas = (k: Kelas) => {
    setEditingKelas(k);
    setKelasForm({
      tingkat: k.tingkat,
      nama_kelas: k.nama_kelas,
      wali_kelas_id: k.wali_kelas_id || '',
    });
    setIsKelasModalOpen(true);
  };

  const handleSaveKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelasForm.nama_kelas) {
      showToast('error', 'Nama kelas wajib diisi.', 'Validasi Form');
      return;
    }

    setActionLoading(true);
    try {
      if (editingKelas) {
        await dataService.updateKelas(editingKelas.id, {
          tingkat: Number(kelasForm.tingkat),
          nama_kelas: kelasForm.nama_kelas.trim(),
          wali_kelas_id: kelasForm.wali_kelas_id || null,
        });
        showToast('success', `Kelas ${kelasForm.nama_kelas} berhasil diperbarui.`, 'Sukses');
        setIsKelasModalOpen(false);
        loadAllData();
      } else {
        await dataService.addKelas({
          tingkat: Number(kelasForm.tingkat),
          nama_kelas: kelasForm.nama_kelas.trim(),
          wali_kelas_id: kelasForm.wali_kelas_id || null,
        });
        showToast('success', `Kelas ${kelasForm.nama_kelas} berhasil ditambahkan.`, 'Sukses');
        setIsKelasModalOpen(false);
        loadAllData();
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan data kelas', 'Gagal');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Handlers: Tahun Ajaran ---
  const handleSaveTahun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tahunForm.tahun) {
      showToast('error', 'Format tahun ajaran wajib diisi (misal: 2024/2025).', 'Validasi');
      return;
    }

    setActionLoading(true);
    try {
      await dataService.addTahun({
        tahun: tahunForm.tahun.trim(),
        semester: tahunForm.semester,
        is_aktif: tahunForm.is_aktif,
      });

      showToast('success', `Tahun ajaran ${tahunForm.tahun} (${tahunForm.semester}) berhasil ditambahkan.`, 'Sukses');
      setIsTahunModalOpen(false);
      loadAllData();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menambah tahun ajaran', 'Gagal Menambah Tahun Ajaran');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetActiveTahun = async (id: string, name: string) => {
    setActionLoading(true);
    try {
      await dataService.setActiveTahun(id);
      showToast('success', `Tahun ajaran ${name} sekarang berstatus AKTIF.`, 'Tahun Ajaran Aktif');
      setSelectedTahunId(id);
      loadAllData();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal mengaktifkan tahun ajaran', 'Gagal');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Handlers: Anggota Kelas (Penempatan Siswa) ---
  const handleAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTahunId || !selectedKelasId || !selectedStudentToAdd) {
      showToast('error', 'Pilih tahun ajaran, kelas, dan siswa yang akan ditempatkan.', 'Validasi Form');
      return;
    }

    setActionLoading(true);
    try {
      await dataService.addAnggota(selectedStudentToAdd, selectedKelasId, selectedTahunId);
      showToast('success', 'Siswa berhasil ditempatkan ke kelas.', 'Berhasil');
      setIsAnggotaModalOpen(false);
      setSelectedStudentToAdd('');
      loadAllData();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menempatkan siswa ke kelas', 'Penempatan Gagal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      if (deleteTarget.type === 'kelas') {
        await dataService.deleteKelas(deleteTarget.id);
        showToast('success', 'Kelas berhasil dihapus.', 'Dihapus');
      } else if (deleteTarget.type === 'tahun') {
        await dataService.deleteTahun(deleteTarget.id);
        showToast('success', 'Tahun ajaran berhasil dihapus.', 'Dihapus');
      } else if (deleteTarget.type === 'anggota') {
        await dataService.deleteAnggota(deleteTarget.id);
        showToast('success', 'Siswa berhasil dikeluarkan dari kelas ini.', 'Berhasil');
      }
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      loadAllData();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus data', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('kelas')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'kelas'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <School className="w-4 h-4" />
          Daftar Rombel / Kelas
        </button>

        <button
          onClick={() => setActiveTab('tahun_ajaran')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'tahun_ajaran'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Tahun Ajaran
        </button>

        <button
          onClick={() => setActiveTab('anggota')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'anggota'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Penempatan Siswa (Anggota Kelas)
        </button>
      </div>

      {/* ================= TAB 1: KELAS ================= */}
      {activeTab === 'kelas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Rombongan Belajar (Rombel)</h2>
              <p className="text-xs text-stone-500">
                Jumlah siswa dihitung secara akurat dari riwayat penempatan tabel <code>anggota_kelas</code>
              </p>
            </div>

            {(role === 'admin' || role === 'operator') && (
              <button
                onClick={handleOpenAddKelas}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/15 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Kelas Baru
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kelasList.map((k) => {
              const count = studentCountPerClass[k.id] || 0;
              return (
                <div
                  key={k.id}
                  className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs hover:border-emerald-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Tingkat {k.tingkat}
                      </span>
                      <h3 className="text-base font-extrabold text-stone-900 mt-1">{k.nama_kelas}</h3>
                    </div>

                    {(role === 'admin' || role === 'operator') && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditKelas(k)}
                          className="p-1.5 text-stone-400 hover:text-amber-700 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                          title="Edit Kelas"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget({ type: 'kelas', id: k.id, name: k.nama_kelas });
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 text-xs space-y-1">
                    <span className="text-stone-400 font-semibold block text-[11px]">Wali Kelas:</span>
                    <span className="font-bold text-stone-800">
                      {k.wali_kelas?.nama || <span className="text-amber-600 font-normal italic">Belum ditentukan</span>}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Siswa Terdaftar:</span>
                    <button
                      onClick={() => {
                        setSelectedKelasId(k.id);
                        setActiveTab('anggota');
                      }}
                      className="font-extrabold text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {count} Siswa <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: TAHUN AJARAN ================= */}
      {activeTab === 'tahun_ajaran' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Daftar Tahun Ajaran & Semester</h2>
              <p className="text-xs text-stone-500">
                Pilih satu tahun ajaran yang sedang aktif untuk operasional absensi dan jadwal berjalan.
              </p>
            </div>

            {(role === 'admin' || role === 'operator') && (
              <button
                onClick={() => setIsTahunModalOpen(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/15 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Tahun Ajaran
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Tahun Ajaran</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Status Operasional</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {tahunList.map((t) => (
                    <tr key={t.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900 text-sm">
                        {t.tahun}
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-800">
                        Semester {t.semester}
                      </td>
                      <td className="py-3 px-4">
                        {t.is_aktif ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Aktif (Sedang Berjalan)
                          </span>
                        ) : (
                          <span className="text-stone-400">Tidak Aktif</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!t.is_aktif && (role === 'admin' || role === 'operator') && (
                            <button
                              onClick={() => handleSetActiveTahun(t.id, `${t.tahun} (${t.semester})`)}
                              disabled={actionLoading}
                              className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Jadikan Aktif
                            </button>
                          )}
                          {(role === 'admin' || role === 'operator') && (
                            <button
                              onClick={() => {
                                setDeleteTarget({ type: 'tahun', id: t.id, name: `${t.tahun} - ${t.semester}` });
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                              title="Hapus Tahun Ajaran"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ANGGOTA KELAS ================= */}
      {activeTab === 'anggota' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Pilih Tahun Ajaran
                </label>
                <select
                  value={selectedTahunId}
                  onChange={(e) => setSelectedTahunId(e.target.value)}
                  className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
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
                  Pilih Kelas
                </label>
                <select
                  value={selectedKelasId}
                  onChange={(e) => setSelectedKelasId(e.target.value)}
                  className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
                >
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      Tingkat {k.tingkat} - {k.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(role === 'admin' || role === 'operator') && (
              <button
                onClick={() => setIsAnggotaModalOpen(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/15 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Tempatkan Siswa ke Kelas Ini
              </button>
            )}
          </div>

          {/* Enrolled Students Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm">
                Daftar Siswa di Kelas Ini ({enrolledStudentsInSelectedClass.length} Santri)
              </h3>
              <span className="text-xs text-stone-400">
                Riwayat kelas tersimpan permanen per tahun ajaran
              </span>
            </div>

            {enrolledStudentsInSelectedClass.length === 0 ? (
              <div className="py-14 text-center text-stone-500 space-y-2">
                <Users className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-sm font-bold text-stone-800">Belum ada siswa ditempatkan di kelas ini</p>
                <p className="text-xs text-stone-400">
                  Gunakan tombol "Tempatkan Siswa" untuk memasukkan siswa ke kelas pada tahun ajaran ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">NIS / NISN</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Jenis Kelamin</th>
                      <th className="py-3 px-4">Status Siswa</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                    {enrolledStudentsInSelectedClass.map((a, idx) => (
                      <tr key={a.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4 text-stone-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-stone-800">
                          {a.siswa?.nis}
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-900">
                          {a.siswa?.nama}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] ${
                            a.siswa?.jenis_kelamin === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {a.siswa?.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {a.siswa?.status && <StatusSiswaBadge status={a.siswa.status} />}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(role === 'admin' || role === 'operator') && (
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'anggota',
                                  id: a.id,
                                  name: `${a.siswa?.nama} dari kelas ini`,
                                });
                                setIsDeleteOpen(true);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                            >
                              Keluarkan
                            </button>
                          )}
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

      {/* Modal: Tambah/Edit Kelas */}
      <Modal
        isOpen={isKelasModalOpen}
        onClose={() => setIsKelasModalOpen(false)}
        title={editingKelas ? `Edit Kelas: ${editingKelas.nama_kelas}` : 'Tambah Rombongan Belajar'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveKelas} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Tingkat Kelas *</label>
            <select
              value={kelasForm.tingkat}
              onChange={(e) => setKelasForm({ ...kelasForm, tingkat: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value={7}>Tingkat 7 (Kelas VII)</option>
              <option value={8}>Tingkat 8 (Kelas VIII)</option>
              <option value={9}>Tingkat 9 (Kelas IX)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Nama Kelas *</label>
            <input
              type="text"
              value={kelasForm.nama_kelas}
              onChange={(e) => setKelasForm({ ...kelasForm, nama_kelas: e.target.value })}
              placeholder="Contoh: 7 Al-Biruni / 8 Alam A"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Wali Kelas</label>
            <select
              value={kelasForm.wali_kelas_id}
              onChange={(e) => setKelasForm({ ...kelasForm, wali_kelas_id: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">-- Pilih Guru Wali Kelas --</option>
              {teachers.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama} ({g.nip})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsKelasModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {editingKelas ? 'Simpan Perubahan' : 'Buat Kelas'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Tambah Tahun Ajaran */}
      <Modal
        isOpen={isTahunModalOpen}
        onClose={() => setIsTahunModalOpen(false)}
        title="Tambah Tahun Ajaran Baru"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveTahun} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Format Tahun Ajaran *</label>
            <input
              type="text"
              value={tahunForm.tahun}
              onChange={(e) => setTahunForm({ ...tahunForm, tahun: e.target.value })}
              placeholder="2025/2026"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Semester</label>
            <select
              value={tahunForm.semester}
              onChange={(e) => setTahunForm({ ...tahunForm, semester: e.target.value as 'Ganjil' | 'Genap' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isAktifCheck"
              checked={tahunForm.is_aktif}
              onChange={(e) => setTahunForm({ ...tahunForm, is_aktif: e.target.checked })}
              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="isAktifCheck" className="text-xs text-stone-700 font-semibold cursor-pointer">
              Langsung jadikan Tahun Ajaran Aktif
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsTahunModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer disabled:opacity-50"
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Tempatkan Siswa ke Kelas */}
      <Modal
        isOpen={isAnggotaModalOpen}
        onClose={() => setIsAnggotaModalOpen(false)}
        title="Penempatan Siswa ke Kelas"
        subtitle="Hanya menampilkan siswa yang belum memiliki kelas di tahun ajaran ini"
        maxWidth="md"
      >
        <form onSubmit={handleAssignStudent} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Pilih Siswa yang Belum Ditempatkan *</label>
            {availableStudentsForYear.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                Semua siswa aktif sudah terdaftar dalam kelas pada tahun ajaran ini. Tidak ada siswa yang tersisa.
              </div>
            ) : (
              <select
                value={selectedStudentToAdd}
                onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              >
                <option value="">-- Pilih Siswa ({availableStudentsForYear.length} Tersedia) --</option>
                {availableStudentsForYear.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} (NIS: {s.nis}) - {s.jenis_kelamin === 'L' ? 'L' : 'P'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsAnggotaModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading || availableStudentsForYear.length === 0 || !selectedStudentToAdd}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer disabled:opacity-50"
            >
              Tempatkan
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleExecuteDelete}
        title="Konfirmasi Penghapusan"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Sekarang"
        isDestructive={true}
        isLoading={actionLoading}
      />
    </div>
  );
};
