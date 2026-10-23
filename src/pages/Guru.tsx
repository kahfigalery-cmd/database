import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  School,
  Phone,
  Mail,
  AlertCircle,
  Download,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Guru } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { downloadCSV } from '../lib/formatters';
import { dataService } from '../lib/dataService';

export const GuruPage: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');

  // Related data: Wali kelas mappings & Mengajar assignments
  const [waliMap, setWaliMap] = useState<Record<string, string[]>>({});
  const [mengajarMap, setMengajarMap] = useState<Record<string, Array<{ mapel: string; kelas: string }>>>({});

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Guru | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Guru | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Guru | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const initialForm = {
    nip: '',
    nama: '',
    jenis_kelamin: 'L' as 'L' | 'P',
    kontak: '',
    alamat: '',
    jabatan: 'Guru Mata Pelajaran',
    status: 'Aktif' as 'Aktif' | 'Non-Aktif',
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const [gData, kData, mData] = await Promise.all([
        dataService.getGuruList(),
        dataService.getKelasList(),
        dataService.getMengajarList(),
      ]);
      setTeachers(gData);

      const wMap: Record<string, string[]> = {};
      kData.forEach((k) => {
        if (k.wali_kelas_id) {
          if (!wMap[k.wali_kelas_id]) wMap[k.wali_kelas_id] = [];
          wMap[k.wali_kelas_id].push(k.nama_kelas);
        }
      });
      setWaliMap(wMap);

      const mMap: Record<string, Array<{ mapel: string; kelas: string }>> = {};
      mData.forEach((m) => {
        if (m.guru_id) {
          if (!mMap[m.guru_id]) mMap[m.guru_id] = [];
          mMap[m.guru_id].push({
            mapel: m.mapel?.nama_mapel || 'Mapel',
            kelas: m.kelas?.nama_kelas || 'Kelas',
          });
        }
      });
      setMengajarMap(mMap);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memuat data guru', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((g) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        g.nama.toLowerCase().includes(q) ||
        g.nip.toLowerCase().includes(q) ||
        (g.jabatan && g.jabatan.toLowerCase().includes(q));

      const matchStatus = filterStatus === 'Semua' || g.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [teachers, searchQuery, filterStatus]);

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData(initialForm);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (teacher: Guru) => {
    setEditingTeacher(teacher);
    setFormData({
      nip: teacher.nip,
      nama: teacher.nama,
      jenis_kelamin: teacher.jenis_kelamin,
      kontak: teacher.kontak || '',
      alamat: teacher.alamat || '',
      jabatan: teacher.jabatan || 'Guru Mata Pelajaran',
      status: teacher.status,
    });
    setIsFormOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.nama) {
      showToast('error', 'NIP dan Nama Guru wajib diisi.', 'Validasi Form');
      return;
    }

    // Check duplicate NIP locally
    const isDup = teachers.some(
      (g) => g.nip.toLowerCase() === formData.nip.toLowerCase() && g.id !== editingTeacher?.id
    );
    if (isDup) {
      showToast('error', `NIP "${formData.nip}" sudah digunakan oleh guru lain. Mohon gunakan NIP yang unik.`, 'Duplikasi NIP');
      return;
    }

    setActionLoading(true);
    try {
      if (editingTeacher) {
        await dataService.updateGuru(editingTeacher.id, {
          nip: formData.nip.trim(),
          nama: formData.nama.trim(),
          jenis_kelamin: formData.jenis_kelamin,
          kontak: formData.kontak.trim(),
          alamat: formData.alamat.trim(),
          jabatan: formData.jabatan.trim(),
          status: formData.status,
        });

        showToast('success', `Data guru ${formData.nama} berhasil diperbarui.`, 'Sukses');
      } else {
        await dataService.addGuru({
          nip: formData.nip.trim(),
          nama: formData.nama.trim(),
          jenis_kelamin: formData.jenis_kelamin,
          kontak: formData.kontak.trim(),
          alamat: formData.alamat.trim(),
          jabatan: formData.jabatan.trim(),
          status: formData.status,
        });

        showToast('success', `Guru ${formData.nama} berhasil ditambahkan.`, 'Sukses');
      }
      setIsFormOpen(false);
      await fetchTeachers();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan guru', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    setActionLoading(true);
    try {
      await dataService.deleteGuru(teacherToDelete.id);
      showToast('success', `Guru ${teacherToDelete.nama} berhasil dihapus.`, 'Dihapus');
      setIsDeleteOpen(false);
      setTeacherToDelete(null);
      await fetchTeachers();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus guru', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredTeachers.length === 0) {
      showToast('warning', 'Tidak ada data guru untuk diekspor.', 'Ekspor CSV');
      return;
    }

    const headers = ['NIP', 'Nama Guru', 'Jenis Kelamin', 'Jabatan', 'Kontak', 'Alamat', 'Status'];
    const rows = filteredTeachers.map((g) => [
      g.nip,
      g.nama,
      g.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      g.jabatan,
      g.kontak,
      g.alamat,
      g.status,
    ]);

    downloadCSV('data_guru_smp_alam_excellentia', headers, rows);
    showToast('success', 'File CSV berhasil diunduh.', 'Ekspor Sukses');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Data Guru & Tenaga Pendidik</h2>
          <p className="text-xs text-stone-500">
            Total terdaftar: <strong className="text-emerald-700">{teachers.length}</strong> guru | Aktif: <strong>{teachers.filter(t => t.status === 'Aktif').length}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV
          </button>

          {(role === 'admin' || role === 'operator') && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/15 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Guru
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama guru, NIP, atau jabatan..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs"
          />
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs cursor-pointer"
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Status Aktif</option>
            <option value="Non-Aktif">Status Non-Aktif</option>
          </select>
        </div>
      </div>

      {/* Guru Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span>Memuat data guru dari Supabase...</span>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="py-16 text-center text-stone-500 space-y-2">
            <Users className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="text-sm font-bold text-stone-800">Tidak ada data guru ditemukan</p>
            <p className="text-xs text-stone-400">
              {searchQuery || filterStatus !== 'Semua'
                ? 'Coba sesuaikan kata kunci pencarian atau filter status.'
                : 'Belum ada guru yang terdaftar di database.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">NIP</th>
                  <th className="py-3 px-4">Nama Guru & Gelar</th>
                  <th className="py-3 px-4">L/P</th>
                  <th className="py-3 px-4">Jabatan</th>
                  <th className="py-3 px-4">Wali Kelas</th>
                  <th className="py-3 px-4">Kontak</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {filteredTeachers.map((g) => {
                  const waliClasses = waliMap[g.id] || [];
                  const assignments = mengajarMap[g.id] || [];

                  return (
                    <tr key={g.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-stone-700">
                        {g.nip}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 text-sm">{g.nama}</div>
                        {assignments.length > 0 && (
                          <div className="text-[11px] text-emerald-800 font-semibold truncate max-w-[200px]">
                            {assignments.map(a => a.mapel).slice(0, 2).join(', ')}
                            {assignments.length > 2 && ` (+${assignments.length - 2})`}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] ${
                          g.jenis_kelamin === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {g.jenis_kelamin === 'L' ? 'L' : 'P'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-800">
                        {g.jabatan}
                      </td>
                      <td className="py-3 px-4">
                        {waliClasses.length > 0 ? (
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Kelas {waliClasses.join(', ')}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-mono">
                        {g.kontak || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] ${
                          g.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedTeacher(g);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-700 hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Detail Profil & Penugasan Mengajar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(role === 'admin' || role === 'operator') && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(g)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-stone-100 transition-colors cursor-pointer"
                                title="Edit Data Guru"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setTeacherToDelete(g);
                                  setIsDeleteOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-rose-700 hover:bg-stone-100 transition-colors cursor-pointer"
                                title="Hapus Guru"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Guru Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTeacher ? `Edit Guru: ${editingTeacher.nama}` : 'Tambah Guru Baru'}
        subtitle="SMP Alam Excellentia Pamekasan"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTeacher} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Nomor Induk Pegawai (NIP) *</label>
              <input
                type="text"
                value={formData.nip}
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                placeholder="Misal: 198503122010011002"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Nama Lengkap & Gelar *</label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Ustaz Abdullah, S.Pd.I"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Jenis Kelamin</label>
              <select
                value={formData.jenis_kelamin}
                onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value as 'L' | 'P' })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="L">Laki-laki (Ikhwan)</option>
                <option value="P">Perempuan (Akhwat)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Nomor Kontak / WhatsApp</label>
              <input
                type="text"
                value={formData.kontak}
                onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                placeholder="081234567890"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Jabatan di Sekolah</label>
              <input
                type="text"
                value={formData.jabatan}
                onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                placeholder="Guru Mapel / Waka Kurikulum"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Status Kepegawaian</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Non-Aktif' })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="Aktif">Aktif</option>
                <option value="Non-Aktif">Non-Aktif</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Alamat Tempat Tinggal</label>
            <textarea
              rows={2}
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              placeholder="Alamat domisili guru"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {editingTeacher ? 'Simpan Perubahan' : 'Tambahkan Guru'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Guru Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detail Guru & Penugasan Mengajar"
        subtitle="SMP Alam Excellentia Pamekasan"
        maxWidth="md"
      >
        {selectedTeacher && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-black text-xl shadow-md">
                {selectedTeacher.nama.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900">{selectedTeacher.nama}</h3>
                <p className="text-xs text-stone-500 font-mono">NIP: {selectedTeacher.nip}</p>
                <p className="text-xs font-semibold text-emerald-800 mt-0.5">{selectedTeacher.jabatan}</p>
              </div>
            </div>

            {/* Wali Kelas */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 font-semibold block mb-1">Amanah Wali Kelas:</span>
              {waliMap[selectedTeacher.id]?.length ? (
                <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-md inline-block">
                  Wali Kelas {waliMap[selectedTeacher.id].join(', ')}
                </span>
              ) : (
                <span className="text-stone-400 italic">Bukan merupakan wali kelas</span>
              )}
            </div>

            {/* Penugasan Mengajar */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 font-semibold block mb-2">Penugasan Mengajar (Mengajar):</span>
              {mengajarMap[selectedTeacher.id]?.length ? (
                <div className="space-y-1.5">
                  {mengajarMap[selectedTeacher.id].map((a, i) => (
                    <div key={i} className="flex justify-between p-2 bg-white rounded-lg border border-stone-200">
                      <span className="font-bold text-stone-800">{a.mapel}</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 rounded">
                        Kelas {a.kelas}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-stone-400 italic">Belum ada penugasan mengajar yang diinput</span>
              )}
            </div>

            <div className="text-xs text-stone-600 space-y-1 px-1">
              <div>Kontak: <strong>{selectedTeacher.kontak || '-'}</strong></div>
              <div>Alamat: <strong>{selectedTeacher.alamat || '-'}</strong></div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteTeacher}
        title="Hapus Data Guru"
        message={`Apakah Anda yakin ingin menghapus data guru "${teacherToDelete?.nama}" (NIP: ${teacherToDelete?.nip})? Penugasan dan jadwal terkait akan terdampak.`}
        confirmText="Hapus Guru"
        isDestructive={true}
        isLoading={actionLoading}
      />
    </div>
  );
};
