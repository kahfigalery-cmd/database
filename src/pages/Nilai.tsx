import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Layers,
  Save,
  Download,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  Filter
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Nilai, Mengajar, Siswa, JenisPenilaian, Kelas, MataPelajaran, Guru } from '../types';
import { formatTanggalIndo, downloadCSV } from '../lib/formatters';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const JENIS_PENILAIAN_LIST: JenisPenilaian[] = ['Tugas', 'Formatif', 'Sumatif', 'Praktik', 'Proyek'];

export const NilaiPage: React.FC = () => {
  const { role, profile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'input' | 'rekap'>('input');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Core Data
  const [mengajarList, setMengajarList] = useState<Mengajar[]>([]);
  const [selectedMengajarId, setSelectedMengajarId] = useState<string>('');

  // Assessment Info for Input
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Genap');
  const [jenisPenilaian, setJenisPenilaian] = useState<JenisPenilaian>('Tugas');
  const [namaPenilaian, setNamaPenilaian] = useState<string>('Tugas 1: Observasi Alam');
  const [tanggalPenilaian, setTanggalPenilaian] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Students in selected class and score state map: { [siswa_id]: number }
  const [classStudents, setClassStudents] = useState<Siswa[]>([]);
  const [scoresState, setScoresState] = useState<Record<string, number | ''>>({});

  // Rekap Data
  const [rekapScores, setRekapScores] = useState<Nilai[]>([]);
  const [rekapSearch, setRekapSearch] = useState('');
  const [rekapJenisFilter, setRekapJenisFilter] = useState<string>('Semua');

  // Edit Single Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<Nilai | null>(null);
  const [editScoreValue, setEditScoreValue] = useState<number>(0);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [scoreToDelete, setScoreToDelete] = useState<Nilai | null>(null);

  // Load Mengajar Options
  const loadMengajarList = async () => {
    setLoading(true);
    try {
      const arr = await dataService.getMengajarList();
      setMengajarList(arr);
      if (arr.length > 0 && !selectedMengajarId) {
        setSelectedMengajarId(arr[0].id);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal Memuat Penugasan', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMengajarList();
  }, []);

  const activeMengajar = useMemo(() => {
    return mengajarList.find((m) => m.id === selectedMengajarId);
  }, [mengajarList, selectedMengajarId]);

  // When active assignment changes, load students of that class
  const loadClassStudents = async () => {
    if (!activeMengajar?.kelas_id || !activeMengajar?.tahun_ajaran_id) return;

    try {
      const anggotaList = await dataService.getAnggotaList();
      const students = anggotaList
        .filter((a) => a.kelas_id === activeMengajar.kelas_id && a.tahun_ajaran_id === activeMengajar.tahun_ajaran_id)
        .map((a) => a.siswa)
        .filter(Boolean) as Siswa[];

      students.sort((a, b) => a.nama.localeCompare(b.nama));
      setClassStudents(students);

      // Initialize default scores to KKM or 80
      const defaultScore = activeMengajar.mapel?.kkm ? Math.round(activeMengajar.mapel.kkm) : 75;
      const initialMap: Record<string, number | ''> = {};
      students.forEach((s) => {
        initialMap[s.id] = defaultScore;
      });
      setScoresState(initialMap);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memuat siswa', 'Error');
    }
  };

  useEffect(() => {
    loadClassStudents();
  }, [activeMengajar]);

  // Load Rekap Scores
  const loadRekapScores = async () => {
    if (!selectedMengajarId) return;
    try {
      const data = await dataService.getNilaiList({ mengajar_id: selectedMengajarId });
      setRekapScores(data);
    } catch (err: any) {
      // Safe catch
    }
  };

  useEffect(() => {
    if (activeTab === 'rekap') {
      loadRekapScores();
    }
  }, [activeTab, selectedMengajarId]);

  // Filtered Rekap
  const filteredRekap = useMemo(() => {
    return rekapScores.filter((n) => {
      const matchSearch =
        !rekapSearch ||
        n.siswa?.nama.toLowerCase().includes(rekapSearch.toLowerCase()) ||
        n.nama_penilaian.toLowerCase().includes(rekapSearch.toLowerCase()) ||
        (n.siswa?.nis && n.siswa.nis.includes(rekapSearch));

      const matchJenis = rekapJenisFilter === 'Semua' || n.jenis_penilaian === rekapJenisFilter;
      return matchSearch && matchJenis;
    });
  }, [rekapScores, rekapSearch, rekapJenisFilter]);

  // Handle Score Input Change
  const handleScoreChange = (siswaId: string, val: string) => {
    if (val === '') {
      setScoresState((prev) => ({ ...prev, [siswaId]: '' }));
      return;
    }
    const num = Math.min(100, Math.max(0, Number(val)));
    setScoresState((prev) => ({ ...prev, [siswaId]: num }));
  };

  // Save Batch Grades
  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMengajarId || !namaPenilaian.trim()) {
      showToast('error', 'Pilih penugasan dan masukkan nama penilaian.', 'Validasi Form');
      return;
    }

    if (classStudents.length === 0) {
      showToast('warning', 'Tidak ada siswa di kelas ini.', 'Peringatan');
      return;
    }

    setSaving(true);
    try {
      const records = classStudents.map((s) => ({
        siswa_id: s.id,
        mengajar_id: selectedMengajarId,
        semester,
        jenis_penilaian: jenisPenilaian,
        nama_penilaian: namaPenilaian.trim(),
        tanggal: tanggalPenilaian,
        nilai: typeof scoresState[s.id] === 'number' ? (scoresState[s.id] as number) : 0,
      }));

      await dataService.insertNilaiBatch(records);

      showToast(
        'success',
        `Berhasil menyimpan nilai "${namaPenilaian}" untuk ${classStudents.length} siswa.`,
        'Nilai Tersimpan'
      );
      setActiveTab('rekap');
      loadRekapScores();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan nilai', 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Edit Single Grade
  const handleOpenEditSingle = (n: Nilai) => {
    setEditingScore(n);
    setEditScoreValue(n.nilai);
    setIsEditModalOpen(true);
  };

  const handleUpdateSingleGrade = async () => {
    if (!editingScore) return;
    setSaving(true);
    try {
      await dataService.updateNilai(editingScore.id, editScoreValue);
      showToast('success', 'Nilai berhasil diperbarui.', 'Sukses');
      setIsEditModalOpen(false);
      loadRekapScores();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memperbarui nilai', 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Delete Single Grade
  const handleDeleteGrade = async () => {
    if (!scoreToDelete) return;
    setSaving(true);
    try {
      await dataService.deleteNilai(scoreToDelete.id);
      showToast('success', 'Catatan nilai berhasil dihapus.', 'Dihapus');
      setIsDeleteOpen(false);
      setScoreToDelete(null);
      loadRekapScores();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus nilai', 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Export Rekap CSV
  const handleExportCSV = () => {
    if (filteredRekap.length === 0) {
      showToast('warning', 'Tidak ada data nilai untuk diekspor.', 'Ekspor CSV');
      return;
    }

    const headers = [
      'Tanggal',
      'NIS',
      'Nama Siswa',
      'Mata Pelajaran',
      'Kelas',
      'Semester',
      'Jenis Penilaian',
      'Nama Penilaian',
      'Nilai (0-100)',
      'KKM',
      'Status Tuntas',
    ];

    const rows = filteredRekap.map((n) => {
      const kkm = n.mengajar?.mapel?.kkm || 75;
      const isTuntas = n.nilai >= kkm ? 'Tuntas' : 'Belum Tuntas';
      return [
        n.tanggal,
        n.siswa?.nis,
        n.siswa?.nama,
        n.mengajar?.mapel?.nama_mapel,
        n.mengajar?.kelas?.nama_kelas,
        n.semester,
        n.jenis_penilaian,
        n.nama_penilaian,
        n.nilai,
        kkm,
        isTuntas,
      ];
    });

    downloadCSV(`rekap_nilai_${activeMengajar?.mapel?.nama_mapel || 'mapel'}`, headers, rows);
    showToast('success', 'File nilai CSV berhasil diunduh.', 'Ekspor Berhasil');
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('input')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'input'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Input Asesmen & Nilai Kelas
        </button>

        <button
          onClick={() => setActiveTab('rekap')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'rekap'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Rekap Nilai Siswa
        </button>
      </div>

      {/* Select Assignment Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
          Pilih Mata Pelajaran, Kelas & Guru (Penugasan Mengajar)
        </label>
        <select
          value={selectedMengajarId}
          onChange={(e) => setSelectedMengajarId(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
        >
          {mengajarList.map((m) => (
            <option key={m.id} value={m.id}>
              [{m.mapel?.kode_mapel}] {m.mapel?.nama_mapel} — Kelas {m.kelas?.nama_kelas} (Guru: {m.guru?.nama}) — T.A. {m.tahun_ajaran?.tahun}
            </option>
          ))}
        </select>
      </div>

      {/* ================= TAB 1: INPUT NILAI ================= */}
      {activeTab === 'input' && (
        <form onSubmit={handleSaveGrades} className="space-y-6">
          {/* Assessment Parameters Box */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-sm">Parameter Penilaian</h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Jenis Penilaian
                </label>
                <select
                  value={jenisPenilaian}
                  onChange={(e) => setJenisPenilaian(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
                >
                  {JENIS_PENILAIAN_LIST.map((jp) => (
                    <option key={jp} value={jp}>{jp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Nama Penilaian *
                </label>
                <input
                  type="text"
                  value={namaPenilaian}
                  onChange={(e) => setNamaPenilaian(e.target.value)}
                  placeholder="Misal: Tugas 1: Herbarium"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Tanggal Penilaian
                </label>
                <input
                  type="date"
                  value={tanggalPenilaian}
                  onChange={(e) => setTanggalPenilaian(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                />
              </div>
            </div>
          </div>

          {/* Student Scores Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Daftar Nilai Siswa ({classStudents.length} Siswa)
                </h3>
                <p className="text-xs text-stone-400">
                  KKM Mapel: <strong className="text-emerald-800">{activeMengajar?.mapel?.kkm || 75}</strong>
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || classStudents.length === 0}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/15 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Simpan Penilaian
              </button>
            </div>

            {classStudents.length === 0 ? (
              <div className="py-14 text-center text-stone-500 space-y-2">
                <p className="text-sm font-bold text-stone-800">Tidak ada siswa di kelas ini</p>
                <p className="text-xs text-stone-400">
                  Pastikan siswa sudah ditempatkan di kelas ini melalui menu <strong>Kelas & Anggota</strong>.
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
                      <th className="py-3 px-4 w-40">Nilai (0 - 100)</th>
                      <th className="py-3 px-4">Keterangan Ketuntasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                    {classStudents.map((s, idx) => {
                      const val = scoresState[s.id] ?? 0;
                      const kkm = activeMengajar?.mapel?.kkm || 75;
                      const isPass = typeof val === 'number' && val >= kkm;

                      return (
                        <tr key={s.id} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="py-3 px-4 text-stone-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-stone-900 text-sm">{s.nama}</td>
                          <td className="py-3 px-4 font-mono text-stone-500">{s.nis}</td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="1"
                              value={val}
                              onChange={(e) => handleScoreChange(s.id, e.target.value)}
                              className="w-28 px-3 py-1.5 font-mono font-bold text-center bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                              required
                            />
                          </td>
                          <td className="py-3 px-4">
                            {isPass ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Tuntas (Di atas KKM)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 text-[11px]">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Perlu Remedial
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </form>
      )}

      {/* ================= TAB 2: REKAP NILAI ================= */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Rekap Asesmen Pembelajaran</h2>
              <p className="text-xs text-stone-500">
                Riwayat seluruh nilai formatif, sumatif, tugas, dan proyek
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor Nilai CSV
            </button>
          </div>

          {/* Filter & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={rekapSearch}
                onChange={(e) => setRekapSearch(e.target.value)}
                placeholder="Cari nama santri atau nama penilaian..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs"
              />
            </div>

            <div>
              <select
                value={rekapJenisFilter}
                onChange={(e) => setRekapJenisFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs cursor-pointer"
              >
                <option value="Semua">Semua Jenis Penilaian</option>
                {JENIS_PENILAIAN_LIST.map((jp) => (
                  <option key={jp} value={jp}>{jp}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            {filteredRekap.length === 0 ? (
              <div className="py-16 text-center text-stone-500 space-y-2">
                <Award className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-sm font-bold text-stone-800">Belum ada riwayat nilai untuk penugasan ini</p>
                <p className="text-xs text-stone-400">
                  Gunakan tab <strong>Input Asesmen</strong> untuk mencatat nilai baru.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Jenis</th>
                      <th className="py-3 px-4">Nama Penilaian</th>
                      <th className="py-3 px-4 font-mono">Nilai</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                    {filteredRekap.map((n) => {
                      const kkm = n.mengajar?.mapel?.kkm || 75;
                      const isPass = n.nilai >= kkm;

                      return (
                        <tr key={n.id} className="hover:bg-stone-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-stone-600">
                            {formatTanggalIndo(n.tanggal)}
                          </td>
                          <td className="py-3 px-4 font-bold text-stone-900">
                            {n.siswa?.nama}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-stone-100 text-stone-800">
                              {n.jenis_penilaian}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-800">
                            {n.nama_penilaian}
                          </td>
                          <td className="py-3 px-4 font-mono font-black text-sm text-stone-900">
                            {n.nilai}
                          </td>
                          <td className="py-3 px-4">
                            {isPass ? (
                              <span className="text-emerald-700 font-bold text-[11px]">Tuntas</span>
                            ) : (
                              <span className="text-rose-700 font-bold text-[11px]">Remedial</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {(role === 'admin' || role === 'operator' || role === 'guru') && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenEditSingle(n)}
                                  className="p-1.5 text-stone-400 hover:text-amber-700 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                                  title="Edit Nilai"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setScoreToDelete(n);
                                    setIsDeleteOpen(true);
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                                  title="Hapus Nilai"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
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

      {/* Edit Single Grade Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Ubah Nilai Siswa"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-stone-50 rounded-xl text-xs space-y-1">
            <p className="font-bold text-stone-900">{editingScore?.siswa?.nama}</p>
            <p className="text-stone-500">{editingScore?.nama_penilaian} ({editingScore?.jenis_penilaian})</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Nilai Baru (0 - 100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={editScoreValue}
              onChange={(e) => setEditScoreValue(Number(e.target.value))}
              className="w-full px-3 py-2 font-mono font-bold text-lg text-center border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleUpdateSingleGrade}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer disabled:opacity-50"
            >
              Simpan
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteGrade}
        title="Hapus Nilai"
        message={`Apakah Anda yakin ingin menghapus catatan nilai ${scoreToDelete?.nama_penilaian} untuk ${scoreToDelete?.siswa?.nama}?`}
        confirmText="Hapus Nilai"
        isDestructive={true}
        isLoading={saving}
      />
    </div>
  );
};
