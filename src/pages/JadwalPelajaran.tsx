import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  School,
  Users,
  Search,
  Filter,
  Trash2,
  Pencil,
  AlertTriangle,
  Calendar,
  Grid,
  List
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { JadwalPelajaran, Mengajar, TahunAjaran, HariSekolah, Kelas, Guru } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatJam } from '../lib/formatters';

const HARI_LIST: HariSekolah[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const JadwalPelajaranPage: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [schedules, setSchedules] = useState<JadwalPelajaran[]>([]);
  const [mengajarList, setMengajarList] = useState<Mengajar[]>([]);
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & View Mode
  const [viewMode, setViewMode] = useState<'table' | 'weekly'>('table');
  const [filterTahunId, setFilterTahunId] = useState<string>('');
  const [filterHari, setFilterHari] = useState<string>('Semua');
  const [filterKelasId, setFilterKelasId] = useState<string>('Semua');
  const [filterGuruId, setFilterGuruId] = useState<string>('Semua');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<JadwalPelajaran | null>(null);
  const [formData, setFormData] = useState({
    mengajar_id: '',
    hari: 'Senin' as HariSekolah,
    jam_mulai: '07:30',
    jam_selesai: '09:00',
    ruang: 'Ruang Kelas',
  });

  const [clashWarning, setClashWarning] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<JadwalPelajaran | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Tahun Ajaran
      const tArr = await dataService.getTahunList();
      setTahunList(tArr);
      const activeT = tArr.find((t) => t.is_aktif) || tArr[0];
      if (activeT && !filterTahunId) {
        setFilterTahunId(activeT.id);
      }

      // 2. Kelas & Guru
      const kArr = await dataService.getKelasList();
      setKelasList(kArr);

      const gArr = await dataService.getGuruList();
      setTeachers(gArr.filter((g) => g.status === 'Aktif'));

      // 3. Mengajar (Teaching Assignments)
      const mgArr = await dataService.getMengajarList();
      setMengajarList(mgArr);

      // 4. Jadwal Pelajaran
      const schData = await dataService.getJadwalList();
      setSchedules(schData);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memuat jadwal', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchTahun = !filterTahunId || s.mengajar?.tahun_ajaran_id === filterTahunId;
      const matchHari = filterHari === 'Semua' || s.hari === filterHari;
      const matchKelas = filterKelasId === 'Semua' || s.mengajar?.kelas_id === filterKelasId;
      const matchGuru = filterGuruId === 'Semua' || s.mengajar?.guru_id === filterGuruId;
      return matchTahun && matchHari && matchKelas && matchGuru;
    });
  }, [schedules, filterTahunId, filterHari, filterKelasId, filterGuruId]);

  // Available mengajar list for selected tahun
  const availableMengajar = useMemo(() => {
    return mengajarList.filter((m) => !filterTahunId || m.tahun_ajaran_id === filterTahunId);
  }, [mengajarList, filterTahunId]);

  // Helper to check time overlap between two intervals [start1, end1] and [start2, end2]
  const isTimeOverlapping = (start1: string, end1: string, start2: string, end2: string) => {
    return start1 < end2 && start2 < end1;
  };

  // Live clash validator
  const checkClashes = (mengajarId: string, hari: HariSekolah, start: string, end: string, currentId?: string) => {
    const selectedAssignment = mengajarList.find((m) => m.id === mengajarId);
    if (!selectedAssignment || !start || !end) return null;

    for (const sch of schedules) {
      // Skip the schedule being edited
      if (currentId && sch.id === currentId) continue;
      // Must be same day and same academic year
      if (sch.hari !== hari || sch.mengajar?.tahun_ajaran_id !== selectedAssignment.tahun_ajaran_id) continue;

      const schStart = formatJam(sch.jam_mulai);
      const schEnd = formatJam(sch.jam_selesai);

      if (isTimeOverlapping(start, end, schStart, schEnd)) {
        // 1. Teacher Clash
        if (sch.mengajar?.guru_id === selectedAssignment.guru_id) {
          return `Bentrok Jadwal Guru: ${selectedAssignment.guru?.nama} sudah terjadwal mengajar di ${sch.mengajar?.kelas?.nama_kelas} (${schStart} - ${schEnd}).`;
        }
        // 2. Class Clash
        if (sch.mengajar?.kelas_id === selectedAssignment.kelas_id) {
          return `Bentrok Jadwal Kelas: Kelas ${selectedAssignment.kelas?.nama_kelas} sudah memiliki jadwal pelajaran ${sch.mengajar?.mapel?.nama_mapel} (${schStart} - ${schEnd}).`;
        }
      }
    }
    return null;
  };

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setFormData({
      mengajar_id: availableMengajar[0]?.id || '',
      hari: 'Senin',
      jam_mulai: '07:30',
      jam_selesai: '09:00',
      ruang: 'Ruang Kelas',
    });
    setClashWarning(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sch: JadwalPelajaran) => {
    setEditingSchedule(sch);
    setFormData({
      mengajar_id: sch.mengajar_id,
      hari: sch.hari,
      jam_mulai: formatJam(sch.jam_mulai),
      jam_selesai: formatJam(sch.jam_selesai),
      ruang: sch.ruang || 'Ruang Kelas',
    });
    setClashWarning(null);
    setIsModalOpen(true);
  };

  const handleFormChange = (newValues: Partial<typeof formData>) => {
    const updated = { ...formData, ...newValues };
    setFormData(updated);

    if (updated.jam_mulai >= updated.jam_selesai) {
      setClashWarning('Jam selesai harus lebih besar dari jam mulai.');
      return;
    }

    const clash = checkClashes(
      updated.mengajar_id,
      updated.hari,
      updated.jam_mulai,
      updated.jam_selesai,
      editingSchedule?.id
    );
    setClashWarning(clash);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mengajar_id) {
      showToast('error', 'Pilih penugasan guru dan mata pelajaran.', 'Validasi Form');
      return;
    }

    if (formData.jam_mulai >= formData.jam_selesai) {
      showToast('error', 'Jam selesai harus lebih besar dari jam mulai.', 'Validasi Waktu');
      return;
    }

    // Strict Clash Validation
    const clash = checkClashes(
      formData.mengajar_id,
      formData.hari,
      formData.jam_mulai,
      formData.jam_selesai,
      editingSchedule?.id
    );

    if (clash) {
      showToast('error', clash, 'Bentrok Jadwal Terdeteksi');
      return;
    }

    setActionLoading(true);
    try {
      if (editingSchedule) {
        await dataService.updateJadwal(editingSchedule.id, {
          mengajar_id: formData.mengajar_id,
          hari: formData.hari,
          jam_mulai: formData.jam_mulai,
          jam_selesai: formData.jam_selesai,
          ruang: formData.ruang.trim(),
        });
        showToast('success', 'Jadwal pelajaran berhasil diperbarui.', 'Sukses');
        setIsModalOpen(false);
        loadData();
      } else {
        await dataService.addJadwal({
          mengajar_id: formData.mengajar_id,
          hari: formData.hari,
          jam_mulai: formData.jam_mulai,
          jam_selesai: formData.jam_selesai,
          ruang: formData.ruang.trim(),
        });
        showToast('success', 'Jadwal pelajaran baru berhasil ditambahkan.', 'Sukses');
        setIsModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan jadwal', 'Gagal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    setActionLoading(true);
    try {
      await dataService.deleteJadwal(scheduleToDelete.id);
      showToast('success', 'Jadwal pelajaran berhasil dihapus.', 'Dihapus');
      setIsDeleteOpen(false);
      setScheduleToDelete(null);
      loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus jadwal', 'Gagal');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Jadwal Pelajaran Sekolah</h2>
          <p className="text-xs text-stone-500">
            Total {filteredSchedules.length} slot jadwal aktif dengan validasi bentrok otomatis
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Tabel
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'weekly' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Matriks Mingguan
            </button>
          </div>

          {(role === 'admin' || role === 'operator') && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/15 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Jadwal
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
            Tahun Ajaran
          </label>
          <select
            value={filterTahunId}
            onChange={(e) => setFilterTahunId(e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
          >
            {tahunList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tahun} ({t.semester}) {t.is_aktif ? '★ AKTIF' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
            Hari
          </label>
          <select
            value={filterHari}
            onChange={(e) => setFilterHari(e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
          >
            <option value="Semua">Semua Hari</option>
            {HARI_LIST.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
            Kelas
          </label>
          <select
            value={filterKelasId}
            onChange={(e) => setFilterKelasId(e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
          >
            <option value="Semua">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>Kelas {k.nama_kelas}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
            Guru Pengajar
          </label>
          <select
            value={filterGuruId}
            onChange={(e) => setFilterGuruId(e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
          >
            <option value="Semua">Semua Guru</option>
            {teachers.map((g) => (
              <option key={g.id} value={g.id}>{g.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* View Mode 1: Table List */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          {filteredSchedules.length === 0 ? (
            <div className="py-16 text-center text-stone-500 space-y-2">
              <CalendarDays className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-bold text-stone-800">Tidak ada jadwal pelajaran ditemukan</p>
              <p className="text-xs text-stone-400">
                Sesuaikan filter atau klik Tambah Jadwal untuk membuat slot baru.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Hari</th>
                    <th className="py-3 px-4">Jam Pelajaran</th>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Guru Pengajar</th>
                    <th className="py-3 px-4">Ruang</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {filteredSchedules.map((sch) => (
                    <tr key={sch.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          {sch.hari}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        {formatJam(sch.jam_mulai)} - {formatJam(sch.jam_selesai)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-stone-900 text-sm">
                          {sch.mengajar?.mapel?.nama_mapel}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono ml-1.5">
                          ({sch.mengajar?.mapel?.kode_mapel})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          {sch.mengajar?.kelas?.nama_kelas}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-800">
                        {sch.mengajar?.guru?.nama}
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {sch.ruang || 'Ruang Kelas'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(role === 'admin' || role === 'operator') && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(sch)}
                              className="p-1.5 text-stone-400 hover:text-amber-700 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                              title="Edit Jadwal"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setScheduleToDelete(sch);
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View Mode 2: Weekly Grid Matrix */}
      {viewMode === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {HARI_LIST.map((hari) => {
            const daySchedules = filteredSchedules.filter((s) => s.hari === hari);

            return (
              <div key={hari} className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
                <div className="bg-emerald-800 text-white px-4 py-2.5 flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider">{hari}</h3>
                  <span className="text-[11px] font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    {daySchedules.length} Jam
                  </span>
                </div>

                <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                  {daySchedules.length === 0 ? (
                    <div className="py-8 text-center text-xs text-stone-400 italic">
                      Tidak ada jam pelajaran
                    </div>
                  ) : (
                    daySchedules.map((sch) => (
                      <div
                        key={sch.id}
                        className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs space-y-1 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-emerald-800">
                            {formatJam(sch.jam_mulai)} - {formatJam(sch.jam_selesai)}
                          </span>
                          <span className="font-bold bg-white px-2 py-0.5 rounded text-[10px] border border-stone-200 text-stone-800">
                            {sch.mengajar?.kelas?.nama_kelas}
                          </span>
                        </div>
                        <h4 className="font-bold text-stone-900">{sch.mengajar?.mapel?.nama_mapel}</h4>
                        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                          <span>{sch.mengajar?.guru?.nama}</span>
                          <span className="italic">{sch.ruang || 'Kelas'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSchedule ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran'}
        subtitle="SMP Alam Excellentia Pamekasan"
        maxWidth="md"
      >
        <form onSubmit={handleSaveSchedule} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Penugasan Mengajar (Guru - Mapel - Kelas) *</label>
            <select
              value={formData.mengajar_id}
              onChange={(e) => handleFormChange({ mengajar_id: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            >
              <option value="">-- Pilih Penugasan Mengajar --</option>
              {availableMengajar.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.guru?.nama} - {m.mapel?.nama_mapel} (Kelas {m.kelas?.nama_kelas})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Hari *</label>
              <select
                value={formData.hari}
                onChange={(e) => handleFormChange({ hari: e.target.value as HariSekolah })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {HARI_LIST.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Jam Mulai *</label>
              <input
                type="time"
                value={formData.jam_mulai}
                onChange={(e) => handleFormChange({ jam_mulai: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Jam Selesai *</label>
              <input
                type="time"
                value={formData.jam_selesai}
                onChange={(e) => handleFormChange({ jam_selesai: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Ruangan / Lokasi Belajar</label>
            <input
              type="text"
              value={formData.ruang}
              onChange={(e) => handleFormChange({ ruang: e.target.value })}
              placeholder="Contoh: Gazebo Alam 1 / Lab Komputer / Saung Tadabbur"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Clash Alert Box */}
          {clashWarning && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{clashWarning}</div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading || Boolean(clashWarning)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {editingSchedule ? 'Simpan Perubahan' : 'Jadwalkan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteSchedule}
        title="Hapus Jadwal Pelajaran"
        message={`Apakah Anda yakin ingin menghapus jadwal ${scheduleToDelete?.mengajar?.mapel?.nama_mapel} (${scheduleToDelete?.hari}, ${formatJam(scheduleToDelete?.jam_mulai)} - ${formatJam(scheduleToDelete?.jam_selesai)})?`}
        confirmText="Hapus"
        isDestructive={true}
        isLoading={actionLoading}
      />
    </div>
  );
};
