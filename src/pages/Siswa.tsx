import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Upload,
  Filter,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  GraduationCap,
  Calendar,
  Phone,
  Home,
  UserCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Siswa, StatusSiswa } from '../types';
import { formatTanggalIndo, formatTanggalSingkat, downloadCSV, parseCSVText } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import { StatusSiswaBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const SiswaPage: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [students, setStudents] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterTingkat, setFilterTingkat] = useState<string>('Semua');
  const [studentClassesMap, setStudentClassesMap] = useState<Record<string, { nama_kelas: string; tingkat: number }>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Siswa | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Siswa | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Siswa | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const initialFormData = {
    nis: '',
    nisn: '',
    nama: '',
    jenis_kelamin: 'L' as 'L' | 'P',
    tempat_lahir: 'Pamekasan',
    tanggal_lahir: '2011-01-01',
    alamat: '',
    nama_ayah: '',
    nama_ibu: '',
    no_hp_orang_tua: '',
    tanggal_masuk: new Date().toISOString().split('T')[0],
    status: 'Aktif' as StatusSiswa,
  };
  const [formData, setFormData] = useState(initialFormData);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const [sData, aData] = await Promise.all([
        dataService.getSiswaList(),
        dataService.getAnggotaList(),
      ]);

      setStudents(sData);

      const map: Record<string, { nama_kelas: string; tingkat: number }> = {};
      aData.forEach((a) => {
        if (a.siswa_id && a.kelas) {
          map[a.siswa_id] = {
            nama_kelas: a.kelas.nama_kelas,
            tingkat: a.kelas.tingkat,
          };
        }
      });
      setStudentClassesMap(map);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memuat data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter & Search Logic
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q);

      const matchStatus = filterStatus === 'Semua' || s.status === filterStatus;

      const studentClass = studentClassesMap[s.id];
      const matchTingkat =
        filterTingkat === 'Semua' ||
        (studentClass && String(studentClass.tingkat) === filterTingkat);

      return matchSearch && matchStatus && matchTingkat;
    });
  }, [students, searchQuery, filterStatus, filterTingkat, studentClassesMap]);

  // Paginated students
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student: Siswa) => {
    setEditingStudent(student);
    setFormData({
      nis: student.nis,
      nisn: student.nisn,
      nama: student.nama,
      jenis_kelamin: student.jenis_kelamin,
      tempat_lahir: student.tempat_lahir || '',
      tanggal_lahir: student.tanggal_lahir || '',
      alamat: student.alamat || '',
      nama_ayah: student.nama_ayah || '',
      nama_ibu: student.nama_ibu || '',
      no_hp_orang_tua: student.no_hp_orang_tua || '',
      tanggal_masuk: student.tanggal_masuk || '',
      status: student.status,
    });
    setIsFormOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nis || !formData.nisn || !formData.nama) {
      showToast('error', 'NIS, NISN, dan Nama Siswa wajib diisi.', 'Validasi Form');
      return;
    }

    setActionLoading(true);
    try {
      if (editingStudent) {
        await dataService.updateSiswa(editingStudent.id, {
          nis: formData.nis.trim(),
          nisn: formData.nisn.trim(),
          nama: formData.nama.trim(),
          jenis_kelamin: formData.jenis_kelamin,
          tempat_lahir: formData.tempat_lahir.trim(),
          tanggal_lahir: formData.tanggal_lahir,
          alamat: formData.alamat.trim(),
          nama_ayah: formData.nama_ayah.trim(),
          nama_ibu: formData.nama_ibu.trim(),
          no_hp_orang_tua: formData.no_hp_orang_tua.trim(),
          tanggal_masuk: formData.tanggal_masuk,
          status: formData.status,
        });

        showToast('success', `Data siswa ${formData.nama} berhasil diperbarui.`, 'Sukses');
      } else {
        await dataService.addSiswa({
          nis: formData.nis.trim(),
          nisn: formData.nisn.trim(),
          nama: formData.nama.trim(),
          jenis_kelamin: formData.jenis_kelamin,
          tempat_lahir: formData.tempat_lahir.trim(),
          tanggal_lahir: formData.tanggal_lahir,
          alamat: formData.alamat.trim(),
          nama_ayah: formData.nama_ayah.trim(),
          nama_ibu: formData.nama_ibu.trim(),
          no_hp_orang_tua: formData.no_hp_orang_tua.trim(),
          tanggal_masuk: formData.tanggal_masuk,
          status: formData.status,
        });

        showToast('success', `Siswa baru ${formData.nama} berhasil ditambahkan.`, 'Sukses');
      }
      setIsFormOpen(false);
      await fetchStudents();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan siswa', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setActionLoading(true);
    try {
      await dataService.deleteSiswa(studentToDelete.id);
      showToast('success', `Siswa ${studentToDelete.nama} berhasil dihapus.`, 'Dihapus');
      setIsDeleteOpen(false);
      setStudentToDelete(null);
      await fetchStudents();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus siswa', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      showToast('warning', 'Tidak ada data siswa untuk diekspor.', 'Ekspor CSV');
      return;
    }

    const headers = [
      'NIS',
      'NISN',
      'Nama Siswa',
      'Jenis Kelamin',
      'Tempat Lahir',
      'Tanggal Lahir',
      'Alamat',
      'Nama Ayah',
      'Nama Ibu',
      'No HP Orang Tua',
      'Tanggal Masuk',
      'Status',
    ];

    const rows = filteredStudents.map((s) => [
      s.nis,
      s.nisn,
      s.nama,
      s.jenis_kelamin,
      s.tempat_lahir,
      s.tanggal_lahir,
      s.alamat,
      s.nama_ayah,
      s.nama_ibu,
      s.no_hp_orang_tua,
      s.tanggal_masuk,
      s.status,
    ]);

    downloadCSV('data_siswa_smp_alam_excellentia', headers, rows);
    showToast('success', 'File CSV berhasil diunduh.', 'Ekspor Berhasil');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportCsvText(text || '');
    };
    reader.readAsText(file);
  };

  const handleProcessImport = async () => {
    if (!importCsvText.trim()) {
      showToast('error', 'Silakan pilih file CSV atau tempel teks data CSV terlebih dahulu.', 'Validasi');
      return;
    }

    setImportLoading(true);
    try {
      const { headers, rows } = parseCSVText(importCsvText);
      if (rows.length === 0) {
        showToast('error', 'Format CSV kosong atau tidak memiliki baris data.', 'Gagal');
        setImportLoading(false);
        return;
      }

      for (const row of rows) {
        await dataService.addSiswa({
          nis: row[0] || `NIS-${Math.floor(1000 + Math.random() * 9000)}`,
          nisn: row[1] || `NISN-${Math.floor(100000 + Math.random() * 900000)}`,
          nama: row[2] || 'Nama Belum Diisi',
          jenis_kelamin: row[3] === 'P' ? 'P' : 'L',
          tempat_lahir: row[4] || 'Pamekasan',
          tanggal_lahir: row[5] || '2011-01-01',
          alamat: row[6] || 'Pamekasan',
          nama_ayah: row[7] || '-',
          nama_ibu: row[8] || '-',
          no_hp_orang_tua: row[9] || '-',
          tanggal_masuk: row[10] || new Date().toISOString().split('T')[0],
          status: (row[11] || 'Aktif') as StatusSiswa,
        });
      }

      showToast('success', `Berhasil mengimpor ${rows.length} data siswa.`, 'Impor Sukses');
      setIsImportOpen(false);
      setImportCsvText('');
      await fetchStudents();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memproses data CSV', 'Error');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Pengelolaan Data Siswa</h2>
          <p className="text-xs text-stone-500">
            Total terdaftar: <strong className="text-emerald-700">{students.length}</strong> siswa | Menampilkan: <strong>{filteredStudents.length}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Ekspor data siswa ke file CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV
          </button>

          {(role === 'admin' || role === 'operator') && (
            <>
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Impor siswa massal dari CSV"
              >
                <Upload className="w-3.5 h-3.5" />
                Impor CSV
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/15 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Siswa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama, NIS, atau NISN..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs"
          />
        </div>

        {/* Filter Tingkat */}
        <div className="relative">
          <select
            value={filterTingkat}
            onChange={(e) => {
              setFilterTingkat(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs cursor-pointer"
          >
            <option value="Semua">Semua Tingkat Kelas</option>
            <option value="7">Tingkat 7</option>
            <option value="8">Tingkat 8</option>
            <option value="9">Tingkat 9</option>
          </select>
        </div>

        {/* Filter Status */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs cursor-pointer"
          >
            <option value="Semua">Semua Status Siswa</option>
            <option value="Aktif">Status Aktif</option>
            <option value="Lulus">Status Lulus</option>
            <option value="Pindah">Status Pindah</option>
            <option value="Keluar">Status Keluar</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span>Memuat data siswa dari Supabase...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-stone-500 space-y-2">
            <GraduationCap className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="text-sm font-bold text-stone-800">Tidak ada data siswa ditemukan</p>
            <p className="text-xs text-stone-400">
              {searchQuery || filterStatus !== 'Semua' || filterTingkat !== 'Semua'
                ? 'Coba sesuaikan kata kunci pencarian atau filter Anda.'
                : 'Belum ada siswa yang tersimpan di database. Silakan klik Tambah Siswa.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">NIS / NISN</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">L/P</th>
                  <th className="py-3 px-4">Kelas Terdaftar</th>
                  <th className="py-3 px-4">No. HP Orang Tua</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {paginatedStudents.map((s, idx) => {
                  const studentClass = studentClassesMap[s.id];
                  return (
                    <tr key={s.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-3 px-4 text-stone-400 font-mono">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-stone-900">{s.nis}</div>
                        <div className="text-[10px] text-stone-400">{s.nisn}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 text-sm">{s.nama}</div>
                        <div className="text-[11px] text-stone-400 truncate max-w-[180px]">
                          {s.tempat_lahir ? `${s.tempat_lahir}, ` : ''}{formatTanggalSingkat(s.tanggal_lahir)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] ${
                          s.jenis_kelamin === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {studentClass ? (
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {studentClass.nama_kelas}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">Belum ditempatkan</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-mono">
                        {s.no_hp_orang_tua || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusSiswaBadge status={s.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedStudent(s);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-700 hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Lihat Detail Siswa"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(role === 'admin' || role === 'operator') && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(s)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-stone-100 transition-colors cursor-pointer"
                                title="Edit Data Siswa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setStudentToDelete(s);
                                  setIsDeleteOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-rose-700 hover:bg-stone-100 transition-colors cursor-pointer"
                                title="Hapus Siswa"
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>
            Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingStudent ? `Edit Siswa: ${editingStudent.nama}` : 'Tambah Siswa Baru'}
        subtitle="SMP Alam Excellentia Pamekasan"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Nomor Induk Siswa (NIS) *</label>
              <input
                type="text"
                value={formData.nis}
                onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                placeholder="Misal: 20240701"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">NISN *</label>
              <input
                type="text"
                value={formData.nisn}
                onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                placeholder="Misal: 0112345678"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-stone-700">Nama Lengkap Siswa *</label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Nama lengkap santri"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Tempat Lahir</label>
              <input
                type="text"
                value={formData.tempat_lahir}
                onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                placeholder="Pamekasan"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Tanggal Lahir</label>
              <input
                type="date"
                value={formData.tanggal_lahir}
                onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Alamat Tempat Tinggal</label>
            <textarea
              rows={2}
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              placeholder="Alamat lengkap siswa / asrama"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Nama Ayah</label>
              <input
                type="text"
                value={formData.nama_ayah}
                onChange={(e) => setFormData({ ...formData, nama_ayah: e.target.value })}
                placeholder="Nama ayah"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Nama Ibu</label>
              <input
                type="text"
                value={formData.nama_ibu}
                onChange={(e) => setFormData({ ...formData, nama_ibu: e.target.value })}
                placeholder="Nama ibu"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">No. HP Orang Tua / Wali</label>
              <input
                type="text"
                value={formData.no_hp_orang_tua}
                onChange={(e) => setFormData({ ...formData, no_hp_orang_tua: e.target.value })}
                placeholder="081234567890"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Tanggal Masuk Sekolah</label>
              <input
                type="date"
                value={formData.tanggal_masuk}
                onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Status Keaktifan</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusSiswa })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="Aktif">Aktif</option>
                <option value="Lulus">Lulus</option>
                <option value="Pindah">Pindah</option>
                <option value="Keluar">Keluar</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {editingStudent ? 'Simpan Perubahan' : 'Tambahkan Siswa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Student Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Biodata Lengkap Siswa"
        subtitle="SMP Alam Excellentia Pamekasan"
        maxWidth="lg"
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-black text-xl shadow-md">
                {selectedStudent.nama.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-stone-900">{selectedStudent.nama}</h3>
                <p className="text-xs text-stone-500 font-mono">
                  NIS: {selectedStudent.nis} | NISN: {selectedStudent.nisn}
                </p>
                <div className="mt-1 flex gap-2">
                  <StatusSiswaBadge status={selectedStudent.status} />
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-700 border border-stone-200">
                    {selectedStudent.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="text-stone-400 font-semibold block">Tempat, Tanggal Lahir</span>
                <span className="font-bold text-stone-800">
                  {selectedStudent.tempat_lahir || '-'}, {formatTanggalIndo(selectedStudent.tanggal_lahir)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="text-stone-400 font-semibold block">Tanggal Masuk</span>
                <span className="font-bold text-stone-800">
                  {formatTanggalIndo(selectedStudent.tanggal_masuk)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
              <span className="text-stone-400 font-semibold block">Alamat Tinggal</span>
              <p className="font-medium text-stone-800">{selectedStudent.alamat || 'Belum diisi'}</p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-2">
              <span className="text-stone-500 font-bold uppercase tracking-wider block">
                Data Orang Tua / Wali
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-stone-400 block text-[11px]">Nama Ayah:</span>
                  <span className="font-bold text-stone-800">{selectedStudent.nama_ayah || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Nama Ibu:</span>
                  <span className="font-bold text-stone-800">{selectedStudent.nama_ibu || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">No. Kontak:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {selectedStudent.no_hp_orang_tua || '-'}
                  </span>
                </div>
              </div>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteStudent}
        title="Hapus Data Siswa"
        message={`Apakah Anda yakin ingin menghapus data siswa "${studentToDelete?.nama}" (NIS: ${studentToDelete?.nis})? Tindakan ini akan menghapus catatan terkait dari basis data.`}
        confirmText="Hapus Siswa"
        isDestructive={true}
        isLoading={actionLoading}
      />

      {/* Import CSV Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Impor Data Siswa (CSV)"
        subtitle="Unggah file CSV dengan kolom sesuai standar"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="text-xs text-stone-600 space-y-1 bg-stone-50 p-3 rounded-xl border border-stone-200">
            <p className="font-bold text-stone-800">Format Kolom CSV (Urutan):</p>
            <p className="font-mono text-[11px] text-stone-600">
              nis, nisn, nama, jenis_kelamin (L/P), tempat_lahir, tanggal_lahir (YYYY-MM-DD), alamat, nama_ayah, nama_ibu, no_hp, tanggal_masuk, status
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              Pilih Berkas CSV
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              onChange={handleFileImport}
              className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">
              Atau Tempel Teks CSV di Bawah Ini:
            </label>
            <textarea
              rows={5}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="nis,nisn,nama,jenis_kelamin,tempat_lahir,tanggal_lahir,alamat,nama_ayah,nama_ibu,no_hp,tanggal_masuk,status&#10;20240701,001234567,Ahmad Fauzi,L,Pamekasan,2011-05-12,Jl. Raya Ceguk,Bapak Fauzi,Ibu Fauzi,08123456789,2024-07-15,Aktif"
              className="w-full p-2.5 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              onClick={() => setIsImportOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleProcessImport}
              disabled={importLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {importLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Proses Impor
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
