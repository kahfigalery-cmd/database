import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Shield,
  Key,
  User,
  Mail,
  Calendar,
  Lock,
  Save,
  ShieldCheck,
  Users,
  Copy,
  Check,
  Info,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ProfilPengguna, Guru, UserRole } from '../types';
import { RoleBadge } from '../components/ui/Badge';
import { formatTanggalIndo } from '../lib/formatters';
import { Modal } from '../components/ui/Modal';
import { dataService } from '../lib/dataService';

export const ProfilPenggunaPage: React.FC = () => {
  const { user, profile, role, updateProfileName } = useAuth();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [namaLengkap, setNamaLengkap] = useState(profile?.nama_lengkap || '');

  // Admin section: List of all users in profil_pengguna
  const [allUsers, setAllUsers] = useState<ProfilPengguna[]>([]);
  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Edit user modal (Admin only)
  const [editingUser, setEditingUser] = useState<ProfilPengguna | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('guru');
  const [editStatus, setEditStatus] = useState<'Aktif' | 'Non-Aktif'>('Aktif');
  const [editGuruId, setEditGuruId] = useState<string>('');
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);

  useEffect(() => {
    if (profile?.nama_lengkap) {
      setNamaLengkap(profile.nama_lengkap);
    }
  }, [profile?.nama_lengkap]);

  const loadAllUsers = async () => {
    if (role !== 'admin') return;
    setUsersLoading(true);
    try {
      const [uList, gList] = await Promise.all([
        dataService.getProfilList(),
        dataService.getGuruList(),
      ]);
      setAllUsers(uList);
      setTeachers(gList.filter((g) => g.status === 'Aktif'));
    } catch (err: any) {
      console.warn('Error loading users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadAllUsers();
  }, [role]);

  // Update own full name
  const handleUpdateSelfName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !namaLengkap.trim()) return;

    setSaving(true);
    try {
      const ok = await updateProfileName(namaLengkap.trim());
      if (ok) {
        showToast('success', `Nama profil berhasil diperbarui menjadi "${namaLengkap.trim()}".`, 'Profil Tersimpan');
        loadAllUsers();
      } else {
        showToast('error', 'Gagal memperbarui nama profil.', 'Gagal');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan', 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Admin: Open Edit User Modal
  const handleOpenEditUser = (u: ProfilPengguna) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditGuruId(u.guru_id || '');
    setIsEditUserModalOpen(true);
  };

  // Admin: Save User Role & Link Teacher
  const handleSaveUserByAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      await dataService.updateProfil(editingUser.id, {
        role: editRole,
        status: editStatus,
        guru_id: editGuruId || null,
      });

      showToast('success', `Hak akses untuk ${editingUser.nama_lengkap} berhasil diperbarui.`, 'Sukses');
      setIsEditUserModalOpen(false);
      loadAllUsers();
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal mengubah pengguna', 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Self Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-950/15">
              {profile?.nama_lengkap
                ? profile.nama_lengkap.charAt(0).toUpperCase()
                : user?.email
                ? user.email.charAt(0).toUpperCase()
                : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-stone-900">
                  {profile?.nama_lengkap || 'Pengguna Terdaftar'}
                </h2>
                <RoleBadge role={role} />
              </div>
              <p className="text-xs text-stone-500 font-mono mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Sesi Autentikasi Aktif
            </span>
          </div>
        </div>

        {/* Self Edit Form */}
        <form onSubmit={handleUpdateSelfName} className="space-y-4 max-w-xl">
          <h3 className="text-sm font-bold text-stone-900">Pengaturan Identitas Akun</h3>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Nama Lengkap Tampilan</label>
            <input
              type="text"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              placeholder="Nama lengkap Anda beserta gelar"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
              <span className="text-stone-400 font-semibold block">Email Autentikasi Supabase</span>
              <span className="font-mono font-bold text-stone-800 break-all">{user?.email || '-'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
              <span className="text-stone-400 font-semibold block">Guru Terhubung</span>
              <span className="font-bold text-emerald-800">
                {profile?.guru?.nama ? `${profile.guru.nama} (${profile.guru.nip})` : 'Tidak Terhubung'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/15 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Simpan Perubahan Nama
            </button>
          </div>
        </form>
      </div>

      {/* Admin Only: Manajemen Akun Pengguna */}
      {role === 'admin' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                Manajemen Pengguna & Hak Akses (Administrator Only)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Pemberian peran dan penautan akun pengguna dengan data guru di database
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {allUsers.length} Akun Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">User ID (UUID)</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">Guru Terkait</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {u.nama_lengkap}
                      {u.id === user?.id && (
                        <span className="ml-2 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          (Anda)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-stone-400">
                      {u.id.substring(0, 13)}...
                    </td>
                    <td className="py-3 px-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3 px-4">
                      {u.guru?.nama ? (
                        <span className="font-semibold text-emerald-800">
                          {u.guru.nama}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] ${
                        u.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="px-3 py-1 bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 rounded-lg text-xs font-bold border border-stone-200 transition-colors cursor-pointer"
                      >
                        Atur Akses
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security & RLS Matrix Guide */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
        <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-700" />
          Matriks Hak Akses & Kebijakan Row Level Security (RLS)
        </h3>
        <p className="text-xs text-stone-500 leading-relaxed">
          Sesuai standar keamanan SMP Alam Excellentia Pamekasan, kontrol akses ditegakkan di database PostgreSQL Supabase via RLS.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/60 space-y-2">
            <h4 className="font-bold text-purple-900 text-sm">Administrator</h4>
            <p className="text-stone-600 leading-relaxed">
              Akses penuh untuk mengelola master siswa, guru, kelas, tahun ajaran, mapel, jadwal, absensi, nilai, serta profil pengguna.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/60 space-y-2">
            <h4 className="font-bold text-blue-900 text-sm">Kepala Sekolah</h4>
            <p className="text-stone-600 leading-relaxed">
              Akses baca untuk memantau ringkasan statistik sekolah, laporan rekap absensi, dan perkembangan nilai akademik siswa.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-2">
            <h4 className="font-bold text-emerald-900 text-sm">Guru / Pendidik</h4>
            <p className="text-stone-600 leading-relaxed">
              Melihat jadwal mengajar, mencatat absensi dan memasukkan nilai pada mata pelajaran dan kelas yang diampunya.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 space-y-2">
            <h4 className="font-bold text-amber-900 text-sm">Operator</h4>
            <p className="text-stone-600 leading-relaxed">
              Mengelola data operasional administratif harian seperti pendaftaran siswa, jadwal, dan pencatatan absensi.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Edit User (Admin Only) */}
      <Modal
        isOpen={isEditUserModalOpen}
        onClose={() => setIsEditUserModalOpen(false)}
        title={`Atur Hak Akses: ${editingUser?.nama_lengkap}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveUserByAdmin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Peran Pengguna (Role) *</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-bold cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            >
              <option value="admin">Administrator (Akses Penuh)</option>
              <option value="kepala_sekolah">Kepala Sekolah (Executive Read & Report)</option>
              <option value="guru">Guru (Pengajar & Penilai)</option>
              <option value="operator">Operator (Administrasi Harian)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Tautkan ke Data Guru (Jika Peran Guru)</label>
            <select
              value={editGuruId}
              onChange={(e) => setEditGuruId(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">-- Tidak Ditautkan ke Guru --</option>
              {teachers.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama} ({g.nip})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Status Akun</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="Aktif">Aktif</option>
              <option value="Non-Aktif">Non-Aktif</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsEditUserModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer disabled:opacity-50"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
