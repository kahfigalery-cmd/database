import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Users,
  School,
  Calendar,
  Search,
  CheckCircle2,
  Award,
  Layers
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MataPelajaran, Mengajar, Guru, Kelas, TahunAjaran } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const MataPelajaranPage: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'mapel' | 'mengajar'>('mapel');
  const [loading, setLoading] = useState(true);

  // Data
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
  const [mengajarList, setMengajarList] = useState<Mengajar[]>([]);
  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);

  // Filters
  const [searchMapel, setSearchMapel] = useState('');
  const [filterTahunId, setFilterTahunId] = useState<string>('');
  const [filterKelasId, setFilterKelasId] = useState<string>('Semua');

  // Modals
  const [isMapelModalOpen, setIsMapelModalOpen] = useState(false);
  const [editingMapel, setEditingMapel] = useState<MataPelajaran | null>(null);
  const [mapelForm, setMapelForm] = useState({
    kode_mapel: '',
    nama_mapel: '',
    kkm: 75,
    kelompok: 'Wajib',
    status: 'Aktif' as 'Aktif' | 'Non-Aktif',
  });

  const [isMengajarModalOpen, setIsMengajarModalOpen] = useState(false);
  const [mengajarForm, setMengajarForm] = useState({
    guru_id: '',
    mapel_id: '',
    kelas_id: '',
    tahun_ajaran_id: '',
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'mapel' | 'mengajar'; id: string; name: string } | null>(null);
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
        setMengajarForm((prev) => ({ ...prev, tahun_ajaran_id: activeT.id }));
      }

      // 2. Mapel
      const mArr = await dataService.getMapelList();
      setMapelList(mArr);

      // 3. Teachers & Classes
      const gArr = await dataService.getGuruList();
      setTeachers(gArr.filter((g) => g.status === 'Aktif'));

      const kArr = await dataService.getKelasList();
      setKelasList(kArr);

      // 4. Mengajar
      const mgArr = await dataService.getMengajarList();
      setMengajarList(mgArr);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memuat data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMapel = useMemo(() => {
    return mapelList.filter((m) => {
      const q = searchMapel.toLowerCase().trim();
      return (
        !q ||
        m.nama_mapel.toLowerCase().includes(q) ||
        m.kode_mapel.toLowerCase().includes(q) ||
        m.kelompok.toLowerCase().includes(q)
      );
    });
  }, [mapelList, searchMapel]);

  const filteredMengajar = useMemo(() => {
    return mengajarList.filter((mg) => {
      const matchTahun = !filterTahunId || mg.tahun_ajaran_id === filterTahunId;
      const matchKelas = filterKelasId === 'Semua' || mg.kelas_id === filterKelasId;
      return matchTahun && matchKelas;
    });
  }, [mengajarList, filterTahunId, filterKelasId]);

  // Handlers Mapel
  const handleOpenAddMapel = () => {
    setEditingMapel(null);
    setMapelForm({
      kode_mapel: '',
      nama_mapel: '',
      kkm: 75,
      kelompok: 'Wajib',
      status: 'Aktif',
    });
    setIsMapelModalOpen(true);
  };

  const handleOpenEditMapel = (m: MataPelajaran) => {
    setEditingMapel(m);
    setMapelForm({
      kode_mapel: m.kode_mapel,
      nama_mapel: m.nama_mapel,
      kkm: m.kkm,
      kelompok: m.kelompok,
      status: m.status,
    });
    setIsMapelModalOpen(true);
  };

  const handleSaveMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapelForm.kode_mapel || !mapelForm.nama_mapel) {
      showToast('error', 'Kode dan Nama Mata Pelajaran wajib diisi.', 'Validasi Form');
      return;
    }

    setActionLoading(true);
    try {
      if (editingMapel) {
        await dataService.updateMapel(editingMapel.id, {
          kode_mapel: mapelForm.kode_mapel.trim().toUpperCase(),
          nama_mapel: mapelForm.nama_mapel.trim(),
          kkm: Number(mapelForm.kkm),
          kelompok: mapelForm.kelompok,
          status: mapelForm.status,
        });
        showToast('success', `Mata pelajaran ${mapelForm.nama_mapel} berhasil diperbarui.`, 'Sukses');
        setIsMapelModalOpen(false);
        loadData();
      } else {
        await dataService.addMapel({
          kode_mapel: mapelForm.kode_mapel.trim().toUpperCase(),
          nama_mapel: mapelForm.nama_mapel.trim(),
          kkm: Number(mapelForm.kkm),
          kelompok: mapelForm.kelompok,
          status: mapelForm.status,
        });
        showToast('success', `Mata pelajaran ${mapelForm.nama_mapel} berhasil ditambahkan.`, 'Sukses');
        setIsMapelModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan mata pelajaran', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers Penugasan Mengajar
  const handleOpenAddMengajar = () => {
    setMengajarForm({
      guru_id: teachers[0]?.id || '',
      mapel_id: mapelList[0]?.id || '',
      kelas_id: kelasList[0]?.id || '',
      tahun_ajaran_id: filterTahunId || tahunList[0]?.id || '',
    });
    setIsMengajarModalOpen(true);
  };

  const handleSaveMengajar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mengajarForm.guru_id || !mengajarForm.mapel_id || !mengajarForm.kelas_id || !mengajarForm.tahun_ajaran_id) {
      showToast('error', 'Semua kolom penugasan wajib dipilih.', 'Validasi Form');
      return;
    }

    setActionLoading(true);
    try {
      await dataService.addMengajar({
        guru_id: mengajarForm.guru_id,
        mapel_id: mengajarForm.mapel_id,
        kelas_id: mengajarForm.kelas_id,
        tahun_ajaran_id: mengajarForm.tahun_ajaran_id,
      });

      showToast('success', 'Penugasan mengajar berhasil ditambahkan.', 'Sukses');
      setIsMengajarModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan penugasan', 'Gagal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      if (deleteTarget.type === 'mapel') {
        await dataService.deleteMapel(deleteTarget.id);
        showToast('success', 'Mata pelajaran berhasil dihapus.', 'Dihapus');
      } else if (deleteTarget.type === 'mengajar') {
        await dataService.deleteMengajar(deleteTarget.id);
        showToast('success', 'Penugasan mengajar berhasil dihapus.', 'Dihapus');
      }
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      loadData();
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
          onClick={() => setActiveTab('mapel')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'mapel'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Mata Pelajaran & KKM
        </button>

        <button
          onClick={() => setActiveTab('mengajar')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'mengajar'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Penugasan Mengajar Guru (Mengajar)
        </button>
      </div>

      {/* ================= TAB 1: MATA PELAJARAN ================= */}
      {activeTab === 'mapel' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Kurikulum & Mata Pelajaran</h2>
              <p className="text-xs text-stone-500">
                Mencakup kurikulum nasional, muatan lokal Pamekasan, dan materi khas sekolah alam
              </p>
            </div>

            {(role === 'admin' || role === 'operator') && (
              <button
                onClick={handleOpenAddMapel}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/15 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Mata Pelajaran
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchMapel}
              onChange={(e) => setSearchMapel(e.target.value)}
              placeholder="Cari kode mapel, nama, atau kelompok..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs"
            />
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Kode</th>
                    <th className="py-3 px-4">Nama Mata Pelajaran</th>
                    <th className="py-3 px-4">Kelompok Kurikulum</th>
                    <th className="py-3 px-4">KKM</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {filteredMapel.map((m) => (
                    <tr key={m.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-900">
                          {m.kode_mapel}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-stone-900 text-sm">{m.nama_mapel}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {m.kelompok}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-800 font-mono">
                        {m.kkm}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] ${
                          m.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(role === 'admin' || role === 'operator') && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditMapel(m)}
                              className="p-1.5 text-stone-400 hover:text-amber-700 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                              title="Edit Mapel"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({ type: 'mapel', id: m.id, name: m.nama_mapel });
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                              title="Hapus Mapel"
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
          </div>
        </div>
      )}

      {/* ================= TAB 2: PENUGASAN MENGAJAR ================= */}
      {activeTab === 'mengajar' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Penugasan Guru Mengajar</h2>
              <p className="text-xs text-stone-500">
                Menghubungkan Guru, Mata Pelajaran, Kelas, dan Tahun Ajaran secara relasional via foreign key
              </p>
            </div>

            {(role === 'admin' || role === 'operator') && (
              <button
                onClick={handleOpenAddMengajar}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/15 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Penugasan Mengajar
              </button>
            )}
          </div>

          {/* Filters for Mengajar */}
          <div className="flex items-center gap-3 flex-wrap bg-white p-4 rounded-xl border border-stone-200">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                Filter Tahun Ajaran
              </label>
              <select
                value={filterTahunId}
                onChange={(e) => setFilterTahunId(e.target.value)}
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
                Filter Kelas
              </label>
              <select
                value={filterKelasId}
                onChange={(e) => setFilterKelasId(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
              >
                <option value="Semua">Semua Kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            {filteredMengajar.length === 0 ? (
              <div className="py-14 text-center text-stone-500 space-y-2">
                <Layers className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-sm font-bold text-stone-800">Belum ada data penugasan mengajar</p>
                <p className="text-xs text-stone-400">
                  Tambahkan penugasan guru untuk mata pelajaran dan rombel kelas pada tahun ajaran ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Guru Pengajar</th>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-4">Rombel / Kelas</th>
                      <th className="py-3 px-4">Tahun Ajaran</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                    {filteredMengajar.map((mg) => (
                      <tr key={mg.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900 text-sm">{mg.guru?.nama}</div>
                          <div className="text-[10px] text-stone-400 font-mono">NIP: {mg.guru?.nip}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-emerald-900">{mg.mapel?.nama_mapel}</div>
                          <div className="text-[10px] text-stone-500 font-mono">Kode: {mg.mapel?.kode_mapel}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
                            {mg.kelas?.nama_kelas}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600">
                          {mg.tahun_ajaran?.tahun} ({mg.tahun_ajaran?.semester})
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(role === 'admin' || role === 'operator') && (
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'mengajar',
                                  id: mg.id,
                                  name: `${mg.guru?.nama} - ${mg.mapel?.nama_mapel} (${mg.kelas?.nama_kelas})`,
                                });
                                setIsDeleteOpen(true);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                            >
                              Hapus
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

      {/* Modal: Tambah/Edit Mapel */}
      <Modal
        isOpen={isMapelModalOpen}
        onClose={() => setIsMapelModalOpen(false)}
        title={editingMapel ? `Edit Mapel: ${editingMapel.nama_mapel}` : 'Tambah Mata Pelajaran'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveMapel} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Kode Mapel *</label>
              <input
                type="text"
                value={mapelForm.kode_mapel}
                onChange={(e) => setMapelForm({ ...mapelForm, kode_mapel: e.target.value })}
                placeholder="Misal: PAI, MTK, IPA-ALAM"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">KKM (Kriteria Ketuntasan Minimal)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={mapelForm.kkm}
                onChange={(e) => setMapelForm({ ...mapelForm, kkm: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Nama Mata Pelajaran *</label>
            <input
              type="text"
              value={mapelForm.nama_mapel}
              onChange={(e) => setMapelForm({ ...mapelForm, nama_mapel: e.target.value })}
              placeholder="Contoh: Tadabbur Alam & Konservasi"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Kelompok Kurikulum</label>
              <select
                value={mapelForm.kelompok}
                onChange={(e) => setMapelForm({ ...mapelForm, kelompok: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="Wajib">Kelompok Wajib (Nasional)</option>
                <option value="Muatan Lokal">Muatan Lokal (Bahasa Madura / Daerah)</option>
                <option value="Karakter Alam">Khas Sekolah Alam & Konservasi</option>
                <option value="Agama & Al-Quran">Pendidikan Agama & Tahfidz</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Status</label>
              <select
                value={mapelForm.status}
                onChange={(e) => setMapelForm({ ...mapelForm, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="Aktif">Aktif</option>
                <option value="Non-Aktif">Non-Aktif</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsMapelModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {editingMapel ? 'Simpan Perubahan' : 'Buat Mapel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Tambah Penugasan Mengajar */}
      <Modal
        isOpen={isMengajarModalOpen}
        onClose={() => setIsMengajarModalOpen(false)}
        title="Tambah Penugasan Guru Mengajar"
        subtitle="SMP Alam Excellentia Pamekasan"
        maxWidth="md"
      >
        <form onSubmit={handleSaveMengajar} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Guru Pengajar *</label>
            <select
              value={mengajarForm.guru_id}
              onChange={(e) => setMengajarForm({ ...mengajarForm, guru_id: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            >
              <option value="">-- Pilih Guru --</option>
              {teachers.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama} ({g.nip})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Mata Pelajaran *</label>
            <select
              value={mengajarForm.mapel_id}
              onChange={(e) => setMengajarForm({ ...mengajarForm, mapel_id: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            >
              <option value="">-- Pilih Mapel --</option>
              {mapelList.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.kode_mapel}] {m.nama_mapel}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Rombel / Kelas *</label>
              <select
                value={mengajarForm.kelas_id}
                onChange={(e) => setMengajarForm({ ...mengajarForm, kelas_id: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              >
                <option value="">-- Pilih Kelas --</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Tahun Ajaran *</label>
              <select
                value={mengajarForm.tahun_ajaran_id}
                onChange={(e) => setMengajarForm({ ...mengajarForm, tahun_ajaran_id: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              >
                {tahunList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tahun} ({t.semester})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsMengajarModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer disabled:opacity-50"
            >
              Simpan Penugasan
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
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"?`}
        confirmText="Hapus"
        isDestructive={true}
        isLoading={actionLoading}
      />
    </div>
  );
};
