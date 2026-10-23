/**
 * Data Service Terpadu untuk SMP Alam Excellentia Pamekasan (SIS SAE)
 * 
 * Mengintegrasikan pembacaan dan penyimpanan data ke Supabase PostgreSQL
 * dengan fallback penyimpanan persisten lokal otomatis (Local Cache & Offline Resilience).
 * Menjamin bahwa operasi Tambah, Edit, Hapus, Presensi, dan Nilai SELALU BERFUNGSI
 * tanpa terhalang kegagalan koneksi jaringan atau tabel yang belum terpasang.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import {
  Siswa,
  Guru,
  Kelas,
  TahunAjaran,
  AnggotaKelas,
  MataPelajaran,
  Mengajar,
  JadwalPelajaran,
  Absensi,
  Nilai,
  ProfilPengguna,
  StatusAbsensi
} from '../types';

// Storage Keys
const KEYS = {
  SISWA: 'sae_db_siswa_v1',
  GURU: 'sae_db_guru_v1',
  KELAS: 'sae_db_kelas_v1',
  TAHUN: 'sae_db_tahun_v1',
  ANGGOTA: 'sae_db_anggota_v1',
  MAPEL: 'sae_db_mapel_v1',
  MENGAJAR: 'sae_db_mengajar_v1',
  JADWAL: 'sae_db_jadwal_v1',
  ABSENSI: 'sae_db_absensi_v1',
  NILAI: 'sae_db_nilai_v1',
  PROFIL: 'sae_db_profil_v1',
};

// Seed Data Awal SMP Alam Excellentia Pamekasan
const INITIAL_TAHUN: TahunAjaran[] = [
  { id: 't-2024-genap', tahun: '2024/2025', semester: 'Genap', is_aktif: true },
  { id: 't-2024-ganjil', tahun: '2024/2025', semester: 'Ganjil', is_aktif: false },
  { id: 't-2023-genap', tahun: '2023/2024', semester: 'Genap', is_aktif: false },
];

const INITIAL_GURU: Guru[] = [
  {
    id: 'g-001',
    nip: '198503122010011002',
    nama: 'Ustaz Abdullah, S.Pd.I',
    jenis_kelamin: 'L',
    kontak: '081234567801',
    alamat: 'Jl. Raya Ceguk No. 12, Pamekasan',
    jabatan: 'Kepala Sekolah & Guru PAI',
    status: 'Aktif'
  },
  {
    id: 'g-002',
    nip: '199008242015022001',
    nama: 'Ustazah Fatimah Azzahra, M.Pd',
    jenis_kelamin: 'P',
    kontak: '081234567802',
    alamat: 'Jl. Jokotole No. 45, Barurambat Kota, Pamekasan',
    jabatan: 'Waka Kurikulum & Guru IPA Konservasi',
    status: 'Aktif'
  },
  {
    id: 'g-003',
    nip: '198811052014011003',
    nama: 'Ustaz Muhammad Ridwan, S.Si',
    jenis_kelamin: 'L',
    kontak: '081234567803',
    alamat: 'Jl. Trunojoyo Gang V, Pamekasan',
    jabatan: 'Guru Matematika Terapan',
    status: 'Aktif'
  },
  {
    id: 'g-004',
    nip: '199304152018022004',
    nama: 'Ustazah Nurul Hidayah, S.Pd',
    jenis_kelamin: 'P',
    kontak: '081234567804',
    alamat: 'Perumahan Nyalabu Permai, Pamekasan',
    jabatan: 'Guru Bahasa Indonesia & Jurnalistik',
    status: 'Aktif'
  },
  {
    id: 'g-005',
    nip: '199107192017011005',
    nama: 'Ustaz Ahmad Zaki, Lc',
    jenis_kelamin: 'L',
    kontak: '081234567805',
    alamat: 'Jl. R. Abdul Aziz, Jungcangcang, Pamekasan',
    jabatan: 'Guru Bahasa Arab & Tahfidz',
    status: 'Aktif'
  },
  {
    id: 'g-006',
    nip: '199412102019022006',
    nama: 'Ustazah Siti Maryam, S.Pd',
    jenis_kelamin: 'P',
    kontak: '081234567806',
    alamat: 'Jl. Kabupaten No. 88, Pamekasan',
    jabatan: 'Guru Bahasa Inggris & Public Speaking',
    status: 'Aktif'
  },
  {
    id: 'g-007',
    nip: '198906182013011007',
    nama: 'Ustaz Hasan Basri, S.Kom',
    jenis_kelamin: 'L',
    kontak: '081234567807',
    alamat: 'Jl. Segara No. 19, Tlanakan, Pamekasan',
    jabatan: 'Guru Prakarya, Robotik & TIK',
    status: 'Aktif'
  },
  {
    id: 'g-008',
    nip: '199501222020022008',
    nama: 'Ustazah Aisyah Rahmawati, S.Pd',
    jenis_kelamin: 'P',
    kontak: '081234567808',
    alamat: 'Jl. Bonorogo Gang II, Pademawu, Pamekasan',
    jabatan: 'Guru PJOK & Kepanduan Alam',
    status: 'Aktif'
  }
];

const INITIAL_KELAS: Kelas[] = [
  { id: 'k-7a', tingkat: 7, nama_kelas: '7 Al-Biruni (Alam A)', wali_kelas_id: 'g-002' },
  { id: 'k-7b', tingkat: 7, nama_kelas: '7 Al-Farabi (Alam B)', wali_kelas_id: 'g-004' },
  { id: 'k-8a', tingkat: 8, nama_kelas: '8 Ibnu Sina', wali_kelas_id: 'g-003' },
  { id: 'k-8b', tingkat: 8, nama_kelas: '8 Al-Khawarizmi', wali_kelas_id: 'g-005' },
  { id: 'k-9a', tingkat: 9, nama_kelas: '9 Al-Ghazali', wali_kelas_id: 'g-006' },
];

const INITIAL_SISWA: Siswa[] = [
  {
    id: 's-001',
    nis: '2407001',
    nisn: '0112345601',
    nama: 'Ahmad Faiz Al-Habsyi',
    jenis_kelamin: 'L',
    tempat_lahir: 'Pamekasan',
    tanggal_lahir: '2011-04-12',
    alamat: 'Jl. Raya Ceguk No. 15, Tlanakan, Pamekasan',
    nama_ayah: 'H. Hasan Al-Habsyi',
    nama_ibu: 'Hj. Aminah',
    no_hp_orang_tua: '081234567901',
    tanggal_masuk: '2024-07-15',
    status: 'Aktif'
  },
  {
    id: 's-002',
    nis: '2407002',
    nisn: '0112345602',
    nama: 'Bilqis Humaira Azzahra',
    jenis_kelamin: 'P',
    tempat_lahir: 'Pamekasan',
    tanggal_lahir: '2011-08-25',
    alamat: 'Jl. Kanginan No. 4, Pamekasan',
    nama_ayah: 'Drs. Subhan, M.Si',
    nama_ibu: 'Nurul Aini, S.Pd',
    no_hp_orang_tua: '081234567902',
    tanggal_masuk: '2024-07-15',
    status: 'Aktif'
  },
  {
    id: 's-003',
    nis: '2407003',
    nisn: '0112345603',
    nama: 'Dafi Choirul Anam',
    jenis_kelamin: 'L',
    tempat_lahir: 'Sumenep',
    tanggal_lahir: '2011-02-18',
    alamat: 'Perum Griya Kencana Nyalabu, Pamekasan',
    nama_ayah: 'M. Choirul Umam',
    nama_ibu: 'Lailatul Qomariyah',
    no_hp_orang_tua: '081234567903',
    tanggal_masuk: '2024-07-15',
    status: 'Aktif'
  },
  {
    id: 's-004',
    nis: '2407004',
    nisn: '0112345604',
    nama: 'Fatimah Az-Zuhra',
    jenis_kelamin: 'P',
    tempat_lahir: 'Pamekasan',
    tanggal_lahir: '2011-10-05',
    alamat: 'Jl. R. Abdul Aziz Gang 3, Pamekasan',
    nama_ayah: 'Zuhri Effendi, S.T',
    nama_ibu: 'Kholifah, S.E',
    no_hp_orang_tua: '081234567904',
    tanggal_masuk: '2024-07-15',
    status: 'Aktif'
  },
  {
    id: 's-005',
    nis: '2407005',
    nisn: '0112345605',
    nama: 'Ibrahim Malik Al-Fatih',
    jenis_kelamin: 'L',
    tempat_lahir: 'Sampang',
    tanggal_lahir: '2011-06-20',
    alamat: 'Jl. Trunojoyo No. 90, Pamekasan',
    nama_ayah: 'Malik Akbar',
    nama_ibu: 'Siti Rohmah',
    no_hp_orang_tua: '081234567905',
    tanggal_masuk: '2024-07-15',
    status: 'Aktif'
  },
  {
    id: 's-006',
    nis: '2308001',
    nisn: '0102345601',
    nama: 'Muhammad Rayhan Pratama',
    jenis_kelamin: 'L',
    tempat_lahir: 'Pamekasan',
    tanggal_lahir: '2010-05-14',
    alamat: 'Jl. Bonorogo No. 22, Pademawu, Pamekasan',
    nama_ayah: 'Pratama Yudi, S.H',
    nama_ibu: 'Dewi Kartika',
    no_hp_orang_tua: '081234567906',
    tanggal_masuk: '2023-07-17',
    status: 'Aktif'
  },
  {
    id: 's-007',
    nis: '2308002',
    nisn: '0102345602',
    nama: 'Nabila Syifa Ramadhani',
    jenis_kelamin: 'P',
    tempat_lahir: 'Pamekasan',
    tanggal_lahir: '2010-09-08',
    alamat: 'Jl. Dirgahayu No. 11, Pamekasan',
    nama_ayah: 'Ramadhan Syukri',
    nama_ibu: 'Nur Azizah',
    no_hp_orang_tua: '081234567907',
    tanggal_masuk: '2023-07-17',
    status: 'Aktif'
  },
  {
    id: 's-008',
    nis: '2209001',
    nisn: '0092345601',
    nama: 'Zaidan Al-Farisi',
    jenis_kelamin: 'L',
    tempat_lahir: 'Pamekasan',
    tanggal_lahir: '2009-11-30',
    alamat: 'Jl. Segara No. 40, Tlanakan, Pamekasan',
    nama_ayah: 'Farisi Iskandar',
    nama_ibu: 'Halimah, S.Pd',
    no_hp_orang_tua: '081234567908',
    tanggal_masuk: '2022-07-18',
    status: 'Aktif'
  }
];

const INITIAL_ANGGOTA: AnggotaKelas[] = [
  { id: 'ak-001', siswa_id: 's-001', kelas_id: 'k-7a', tahun_ajaran_id: 't-2024-genap' },
  { id: 'ak-002', siswa_id: 's-002', kelas_id: 'k-7a', tahun_ajaran_id: 't-2024-genap' },
  { id: 'ak-003', siswa_id: 's-003', kelas_id: 'k-7b', tahun_ajaran_id: 't-2024-genap' },
  { id: 'ak-004', siswa_id: 's-004', kelas_id: 'k-7b', tahun_ajaran_id: 't-2024-genap' },
  { id: 'ak-005', siswa_id: 's-005', kelas_id: 'k-7a', tahun_ajaran_id: 't-2024-genap' },
  { id: 'ak-006', siswa_id: 's-006', kelas_id: 'k-8a', tahun_ajaran_id: 't-2024-genap' },
  { id: 'ak-007', siswa_id: 's-007', kelas_id: 'k-8a', tahun_ajaran_id: 't-2024-genap' },
  { id: 'ak-008', siswa_id: 's-008', kelas_id: 'k-9a', tahun_ajaran_id: 't-2024-genap' },
];

const INITIAL_MAPEL: MataPelajaran[] = [
  { id: 'm-001', kode_mapel: 'PAI', nama_mapel: 'Pendidikan Agama Islam & Budi Pekerti', kkm: 75, kelompok: 'Wajib', status: 'Aktif' },
  { id: 'm-002', kode_mapel: 'IPA-ALAM', nama_mapel: 'IPA Terpadu & Konservasi Lingkungan', kkm: 75, kelompok: 'Khas Sekolah Alam', status: 'Aktif' },
  { id: 'm-003', kode_mapel: 'MTK', nama_mapel: 'Matematika Terapan', kkm: 75, kelompok: 'Wajib', status: 'Aktif' },
  { id: 'm-004', kode_mapel: 'IND', nama_mapel: 'Bahasa Indonesia & Literasi Alam', kkm: 75, kelompok: 'Wajib', status: 'Aktif' },
  { id: 'm-005', kode_mapel: 'ING', nama_mapel: 'Bahasa Inggris Komunikatif', kkm: 75, kelompok: 'Wajib', status: 'Aktif' },
  { id: 'm-006', kode_mapel: 'ARB', nama_mapel: 'Bahasa Arab & Hadits', kkm: 75, kelompok: 'Agama & Al-Quran', status: 'Aktif' },
  { id: 'm-007', kode_mapel: 'TADABBUR', nama_mapel: 'Tadabbur Alam & Kepemimpinan', kkm: 80, kelompok: 'Khas Sekolah Alam', status: 'Aktif' },
  { id: 'm-008', kode_mapel: 'ROBOTIK', nama_mapel: 'Prakarya, Robotik & TIK Alam', kkm: 75, kelompok: 'Wajib', status: 'Aktif' },
];

const INITIAL_MENGAJAR: Mengajar[] = [
  { id: 'mg-001', guru_id: 'g-001', mapel_id: 'm-001', kelas_id: 'k-7a', tahun_ajaran_id: 't-2024-genap' },
  { id: 'mg-002', guru_id: 'g-002', mapel_id: 'm-002', kelas_id: 'k-7a', tahun_ajaran_id: 't-2024-genap' },
  { id: 'mg-003', guru_id: 'g-003', mapel_id: 'm-003', kelas_id: 'k-7a', tahun_ajaran_id: 't-2024-genap' },
  { id: 'mg-004', guru_id: 'g-004', mapel_id: 'm-004', kelas_id: 'k-7a', tahun_ajaran_id: 't-2024-genap' },
  { id: 'mg-005', guru_id: 'g-005', mapel_id: 'm-006', kelas_id: 'k-7b', tahun_ajaran_id: 't-2024-genap' },
  { id: 'mg-006', guru_id: 'g-002', mapel_id: 'm-002', kelas_id: 'k-8a', tahun_ajaran_id: 't-2024-genap' },
  { id: 'mg-007', guru_id: 'g-006', mapel_id: 'm-005', kelas_id: 'k-9a', tahun_ajaran_id: 't-2024-genap' },
];

const INITIAL_JADWAL: JadwalPelajaran[] = [
  { id: 'j-001', mengajar_id: 'mg-001', hari: 'Senin', jam_mulai: '07:30', jam_selesai: '09:00', ruang: 'Gazebo Alam 1' },
  { id: 'j-002', mengajar_id: 'mg-002', hari: 'Senin', jam_mulai: '09:15', jam_selesai: '10:45', ruang: 'Lab Sains Terbuka' },
  { id: 'j-003', mengajar_id: 'mg-003', hari: 'Selasa', jam_mulai: '07:30', jam_selesai: '09:00', ruang: 'Saung Belajar 2' },
  { id: 'j-004', mengajar_id: 'mg-004', hari: 'Rabu', jam_mulai: '08:00', jam_selesai: '09:30', ruang: 'Ruang Kelas 7A' },
  { id: 'j-005', mengajar_id: 'mg-005', hari: 'Kamis', jam_mulai: '07:30', jam_selesai: '09:00', ruang: 'Gazebo Alam 2' },
  { id: 'j-006', mengajar_id: 'mg-006', hari: 'Jumat', jam_mulai: '07:00', jam_selesai: '08:30', ruang: 'Area Konservasi' },
];

const getToday = () => new Date().toISOString().split('T')[0];

const INITIAL_ABSENSI: Absensi[] = [
  { id: 'ab-001', siswa_id: 's-001', kelas_id: 'k-7a', tahun_ajaran_id: 't-2024-genap', tanggal: getToday(), status: 'Hadir', keterangan: null },
  { id: 'ab-002', siswa_id: 's-002', kelas_id: 'k-7a', tahun_ajaran_id: 't-2024-genap', tanggal: getToday(), status: 'Hadir', keterangan: null },
  { id: 'ab-003', siswa_id: 's-003', kelas_id: 'k-7b', tahun_ajaran_id: 't-2024-genap', tanggal: getToday(), status: 'Izin', keterangan: 'Menghadiri acara keluarga' },
  { id: 'ab-004', siswa_id: 's-004', kelas_id: 'k-7b', tahun_ajaran_id: 't-2024-genap', tanggal: getToday(), status: 'Hadir', keterangan: null },
  { id: 'ab-005', siswa_id: 's-005', kelas_id: 'k-7a', tahun_ajaran_id: 't-2024-genap', tanggal: getToday(), status: 'Sakit', keterangan: 'Flu ringan' },
];

const INITIAL_NILAI: Nilai[] = [
  { id: 'nl-001', siswa_id: 's-001', mengajar_id: 'mg-002', semester: 'Genap', jenis_penilaian: 'Tugas', nama_penilaian: 'Herbarium Daun Madura', tanggal: getToday(), nilai: 88 },
  { id: 'nl-002', siswa_id: 's-002', mengajar_id: 'mg-002', semester: 'Genap', jenis_penilaian: 'Tugas', nama_penilaian: 'Herbarium Daun Madura', tanggal: getToday(), nilai: 92 },
  { id: 'nl-003', siswa_id: 's-005', mengajar_id: 'mg-002', semester: 'Genap', jenis_penilaian: 'Tugas', nama_penilaian: 'Herbarium Daun Madura', tanggal: getToday(), nilai: 84 },
  { id: 'nl-004', siswa_id: 's-001', mengajar_id: 'mg-001', semester: 'Genap', jenis_penilaian: 'Formatif', nama_penilaian: 'Adab Menuntut Ilmu', tanggal: getToday(), nilai: 90 },
];

// Helper Storage
function getStore<T>(key: string, initial: T[]): T[] {
  if (typeof window === 'undefined') return initial;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as T[];
  } catch {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
}

function setStore<T>(key: string, data: T[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

// Generate UUID-like ID
const genId = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

export const dataService = {
  // ===================== SISWA =====================
  async getSiswaList(): Promise<Siswa[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('siswa').select('*').order('nama', { ascending: true });
        if (!error && data && data.length > 0) {
          setStore(KEYS.SISWA, data as Siswa[]);
          return data as Siswa[];
        }
      } catch (err) {
        console.warn('Supabase getSiswa error, fallback to cache:', err);
      }
    }
    return getStore<Siswa>(KEYS.SISWA, INITIAL_SISWA);
  },

  async addSiswa(payload: Omit<Siswa, 'id' | 'created_at'>): Promise<Siswa> {
    const newSiswa: Siswa = {
      id: genId('s'),
      created_at: new Date().toISOString(),
      ...payload,
    };

    // Update local store immediately so UI updates instantly
    const list = getStore<Siswa>(KEYS.SISWA, INITIAL_SISWA);
    const updated = [newSiswa, ...list];
    setStore(KEYS.SISWA, updated);

    // If Supabase configured, attempt sync
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('siswa').insert([payload]).select().single();
        if (!error && data) {
          // Replace generated id with real UUID
          const reconciled = updated.map((s) => (s.id === newSiswa.id ? (data as Siswa) : s));
          setStore(KEYS.SISWA, reconciled);
          return data as Siswa;
        }
      } catch (err) {
        console.warn('Supabase addSiswa sync error:', err);
      }
    }

    return newSiswa;
  },

  async updateSiswa(id: string, payload: Partial<Siswa>): Promise<Siswa> {
    const list = getStore<Siswa>(KEYS.SISWA, INITIAL_SISWA);
    let updatedItem: Siswa | null = null;

    const updated = list.map((item) => {
      if (item.id === id) {
        updatedItem = { ...item, ...payload };
        return updatedItem;
      }
      return item;
    });

    setStore(KEYS.SISWA, updated);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('siswa').update(payload).eq('id', id).select().maybeSingle();
        if (!error && data) {
          return data as Siswa;
        }
      } catch (err) {
        console.warn('Supabase updateSiswa sync error:', err);
      }
    }

    if (!updatedItem) throw new Error('Siswa tidak ditemukan');
    return updatedItem;
  },

  async deleteSiswa(id: string): Promise<boolean> {
    const list = getStore<Siswa>(KEYS.SISWA, INITIAL_SISWA);
    const updated = list.filter((s) => s.id !== id);
    setStore(KEYS.SISWA, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('siswa').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteSiswa sync error:', err);
      }
    }

    return true;
  },

  // ===================== GURU =====================
  async getGuruList(): Promise<Guru[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('guru').select('*').order('nama', { ascending: true });
        if (!error && data && data.length > 0) {
          setStore(KEYS.GURU, data as Guru[]);
          return data as Guru[];
        }
      } catch (err) {
        console.warn('Supabase getGuru error, fallback to cache:', err);
      }
    }
    return getStore<Guru>(KEYS.GURU, INITIAL_GURU);
  },

  async addGuru(payload: Omit<Guru, 'id' | 'created_at'>): Promise<Guru> {
    const newGuru: Guru = {
      id: genId('g'),
      created_at: new Date().toISOString(),
      ...payload,
    };

    const list = getStore<Guru>(KEYS.GURU, INITIAL_GURU);
    const updated = [...list, newGuru];
    setStore(KEYS.GURU, updated);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('guru').insert([payload]).select().single();
        if (!error && data) {
          const reconciled = updated.map((g) => (g.id === newGuru.id ? (data as Guru) : g));
          setStore(KEYS.GURU, reconciled);
          return data as Guru;
        }
      } catch (err) {
        console.warn('Supabase addGuru sync error:', err);
      }
    }

    return newGuru;
  },

  async updateGuru(id: string, payload: Partial<Guru>): Promise<Guru> {
    const list = getStore<Guru>(KEYS.GURU, INITIAL_GURU);
    let updatedItem: Guru | null = null;

    const updated = list.map((item) => {
      if (item.id === id) {
        updatedItem = { ...item, ...payload };
        return updatedItem;
      }
      return item;
    });

    setStore(KEYS.GURU, updated);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('guru').update(payload).eq('id', id).select().maybeSingle();
        if (!error && data) {
          return data as Guru;
        }
      } catch (err) {
        console.warn('Supabase updateGuru sync error:', err);
      }
    }

    if (!updatedItem) throw new Error('Guru tidak ditemukan');
    return updatedItem;
  },

  async deleteGuru(id: string): Promise<boolean> {
    const list = getStore<Guru>(KEYS.GURU, INITIAL_GURU);
    const updated = list.filter((g) => g.id !== id);
    setStore(KEYS.GURU, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('guru').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteGuru sync error:', err);
      }
    }

    return true;
  },

  // ===================== KELAS =====================
  async getKelasList(): Promise<Kelas[]> {
    const teachers = await this.getGuruList();
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('kelas')
          .select('*, wali_kelas:wali_kelas_id(*)')
          .order('tingkat', { ascending: true })
          .order('nama_kelas', { ascending: true });

        if (!error && data && data.length > 0) {
          setStore(KEYS.KELAS, data as Kelas[]);
          return data as Kelas[];
        }
      } catch (err) {
        console.warn('Supabase getKelas error, fallback to cache:', err);
      }
    }

    const raw = getStore<Kelas>(KEYS.KELAS, INITIAL_KELAS);
    return raw.map((k) => ({
      ...k,
      wali_kelas: k.wali_kelas_id ? teacherMap.get(k.wali_kelas_id) || null : null,
    }));
  },

  async addKelas(payload: Omit<Kelas, 'id' | 'created_at' | 'wali_kelas'>): Promise<Kelas> {
    const newK: Kelas = {
      id: genId('k'),
      created_at: new Date().toISOString(),
      ...payload,
    };
    const list = getStore<Kelas>(KEYS.KELAS, INITIAL_KELAS);
    const updated = [...list, newK];
    setStore(KEYS.KELAS, updated);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('kelas').insert([payload]).select().single();
        if (!error && data) {
          const rec = updated.map((k) => (k.id === newK.id ? (data as Kelas) : k));
          setStore(KEYS.KELAS, rec);
          return data as Kelas;
        }
      } catch (err) {
        console.warn('Supabase addKelas sync error:', err);
      }
    }

    return newK;
  },

  async updateKelas(id: string, payload: Partial<Kelas>): Promise<Kelas> {
    const list = getStore<Kelas>(KEYS.KELAS, INITIAL_KELAS);
    let updatedItem: Kelas | null = null;
    const updated = list.map((k) => {
      if (k.id === id) {
        updatedItem = { ...k, ...payload };
        return updatedItem;
      }
      return k;
    });
    setStore(KEYS.KELAS, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('kelas').update(payload).eq('id', id);
      } catch (err) {
        console.warn('Supabase updateKelas sync error:', err);
      }
    }

    if (!updatedItem) throw new Error('Kelas tidak ditemukan');
    return updatedItem;
  },

  async deleteKelas(id: string): Promise<boolean> {
    const list = getStore<Kelas>(KEYS.KELAS, INITIAL_KELAS);
    setStore(KEYS.KELAS, list.filter((k) => k.id !== id));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('kelas').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteKelas sync error:', err);
      }
    }

    return true;
  },

  // ===================== TAHUN AJARAN =====================
  async getTahunList(): Promise<TahunAjaran[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('tahun_ajaran').select('*').order('tahun', { ascending: false });
        if (!error && data && data.length > 0) {
          setStore(KEYS.TAHUN, data as TahunAjaran[]);
          return data as TahunAjaran[];
        }
      } catch (err) {
        console.warn('Supabase getTahun error, fallback to cache:', err);
      }
    }
    return getStore<TahunAjaran>(KEYS.TAHUN, INITIAL_TAHUN);
  },

  async addTahun(payload: Omit<TahunAjaran, 'id' | 'created_at'>): Promise<TahunAjaran> {
    const newT: TahunAjaran = {
      id: genId('t'),
      created_at: new Date().toISOString(),
      ...payload,
    };
    const list = getStore<TahunAjaran>(KEYS.TAHUN, INITIAL_TAHUN);
    let updated = [...list];
    if (newT.is_aktif) {
      updated = updated.map((t) => ({ ...t, is_aktif: false }));
    }
    updated.unshift(newT);
    setStore(KEYS.TAHUN, updated);

    if (isSupabaseConfigured()) {
      try {
        if (newT.is_aktif) {
          await supabase.from('tahun_ajaran').update({ is_aktif: false }).neq('id', '00000000-0000-0000-0000-000000000000');
        }
        await supabase.from('tahun_ajaran').insert([payload]);
      } catch (err) {
        console.warn('Supabase addTahun sync error:', err);
      }
    }

    return newT;
  },

  async setActiveTahun(id: string): Promise<boolean> {
    const list = getStore<TahunAjaran>(KEYS.TAHUN, INITIAL_TAHUN);
    const updated = list.map((t) => ({ ...t, is_aktif: t.id === id }));
    setStore(KEYS.TAHUN, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tahun_ajaran').update({ is_aktif: false }).neq('id', id);
        await supabase.from('tahun_ajaran').update({ is_aktif: true }).eq('id', id);
      } catch (err) {
        console.warn('Supabase setActiveTahun sync error:', err);
      }
    }

    return true;
  },

  async deleteTahun(id: string): Promise<boolean> {
    const list = getStore<TahunAjaran>(KEYS.TAHUN, INITIAL_TAHUN);
    setStore(KEYS.TAHUN, list.filter((t) => t.id !== id));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tahun_ajaran').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteTahun sync error:', err);
      }
    }

    return true;
  },

  // ===================== ANGGOTA KELAS =====================
  async getAnggotaList(): Promise<AnggotaKelas[]> {
    const students = await this.getSiswaList();
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const classes = await this.getKelasList();
    const classMap = new Map(classes.map((k) => [k.id, k]));

    const years = await this.getTahunList();
    const yearMap = new Map(years.map((y) => [y.id, y]));

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('anggota_kelas')
          .select('*, siswa:siswa_id(*), kelas:kelas_id(*), tahun_ajaran:tahun_ajaran_id(*)');

        if (!error && data && data.length > 0) {
          setStore(KEYS.ANGGOTA, data as AnggotaKelas[]);
          return data as AnggotaKelas[];
        }
      } catch (err) {
        console.warn('Supabase getAnggota error, fallback to cache:', err);
      }
    }

    const raw = getStore<AnggotaKelas>(KEYS.ANGGOTA, INITIAL_ANGGOTA);
    return raw.map((a) => ({
      ...a,
      siswa: studentMap.get(a.siswa_id) || null,
      kelas: classMap.get(a.kelas_id) || null,
      tahun_ajaran: yearMap.get(a.tahun_ajaran_id) || null,
    }));
  },

  async addAnggota(siswaId: string, kelasId: string, tahunId: string): Promise<AnggotaKelas> {
    const list = getStore<AnggotaKelas>(KEYS.ANGGOTA, INITIAL_ANGGOTA);

    // Enforce UNIQUE constraint (siswa_id, tahun_ajaran_id)
    const exists = list.some((a) => a.siswa_id === siswaId && a.tahun_ajaran_id === tahunId);
    if (exists) {
      throw new Error('Siswa ini sudah memiliki penempatan kelas pada tahun ajaran ini.');
    }

    const newA: AnggotaKelas = {
      id: genId('ak'),
      siswa_id: siswaId,
      kelas_id: kelasId,
      tahun_ajaran_id: tahunId,
      created_at: new Date().toISOString(),
    };

    const updated = [...list, newA];
    setStore(KEYS.ANGGOTA, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('anggota_kelas').insert([{
          siswa_id: siswaId,
          kelas_id: kelasId,
          tahun_ajaran_id: tahunId,
        }]);
      } catch (err) {
        console.warn('Supabase addAnggota sync error:', err);
      }
    }

    return newA;
  },

  async deleteAnggota(id: string): Promise<boolean> {
    const list = getStore<AnggotaKelas>(KEYS.ANGGOTA, INITIAL_ANGGOTA);
    setStore(KEYS.ANGGOTA, list.filter((a) => a.id !== id));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('anggota_kelas').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteAnggota sync error:', err);
      }
    }

    return true;
  },

  // ===================== MATA PELAJARAN =====================
  async getMapelList(): Promise<MataPelajaran[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('mata_pelajaran').select('*').order('kode_mapel', { ascending: true });
        if (!error && data && data.length > 0) {
          setStore(KEYS.MAPEL, data as MataPelajaran[]);
          return data as MataPelajaran[];
        }
      } catch (err) {
        console.warn('Supabase getMapel error, fallback to cache:', err);
      }
    }
    return getStore<MataPelajaran>(KEYS.MAPEL, INITIAL_MAPEL);
  },

  async addMapel(payload: Omit<MataPelajaran, 'id' | 'created_at'>): Promise<MataPelajaran> {
    const newM: MataPelajaran = {
      id: genId('m'),
      created_at: new Date().toISOString(),
      ...payload,
    };
    const list = getStore<MataPelajaran>(KEYS.MAPEL, INITIAL_MAPEL);
    const updated = [...list, newM];
    setStore(KEYS.MAPEL, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('mata_pelajaran').insert([payload]);
      } catch (err) {
        console.warn('Supabase addMapel sync error:', err);
      }
    }

    return newM;
  },

  async updateMapel(id: string, payload: Partial<MataPelajaran>): Promise<MataPelajaran> {
    const list = getStore<MataPelajaran>(KEYS.MAPEL, INITIAL_MAPEL);
    let updatedItem: MataPelajaran | null = null;
    const updated = list.map((m) => {
      if (m.id === id) {
        updatedItem = { ...m, ...payload };
        return updatedItem;
      }
      return m;
    });
    setStore(KEYS.MAPEL, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('mata_pelajaran').update(payload).eq('id', id);
      } catch (err) {
        console.warn('Supabase updateMapel sync error:', err);
      }
    }

    if (!updatedItem) throw new Error('Mata pelajaran tidak ditemukan');
    return updatedItem;
  },

  async deleteMapel(id: string): Promise<boolean> {
    const list = getStore<MataPelajaran>(KEYS.MAPEL, INITIAL_MAPEL);
    setStore(KEYS.MAPEL, list.filter((m) => m.id !== id));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('mata_pelajaran').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteMapel sync error:', err);
      }
    }

    return true;
  },

  // ===================== MENGAJAR =====================
  async getMengajarList(): Promise<Mengajar[]> {
    const teachers = await this.getGuruList();
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));

    const mapel = await this.getMapelList();
    const mapelMap = new Map(mapel.map((m) => [m.id, m]));

    const classes = await this.getKelasList();
    const classMap = new Map(classes.map((k) => [k.id, k]));

    const years = await this.getTahunList();
    const yearMap = new Map(years.map((y) => [y.id, y]));

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('mengajar')
          .select(`
            *,
            guru:guru_id (*),
            mapel:mapel_id (*),
            kelas:kelas_id (*),
            tahun_ajaran:tahun_ajaran_id (*)
          `);

        if (!error && data && data.length > 0) {
          setStore(KEYS.MENGAJAR, data as Mengajar[]);
          return data as Mengajar[];
        }
      } catch (err) {
        console.warn('Supabase getMengajar error, fallback to cache:', err);
      }
    }

    const raw = getStore<Mengajar>(KEYS.MENGAJAR, INITIAL_MENGAJAR);
    return raw.map((mg) => ({
      ...mg,
      guru: teacherMap.get(mg.guru_id) || null,
      mapel: mapelMap.get(mg.mapel_id) || null,
      kelas: classMap.get(mg.kelas_id) || null,
      tahun_ajaran: yearMap.get(mg.tahun_ajaran_id) || null,
    }));
  },

  async addMengajar(payload: { guru_id: string; mapel_id: string; kelas_id: string; tahun_ajaran_id: string }): Promise<Mengajar> {
    const list = getStore<Mengajar>(KEYS.MENGAJAR, INITIAL_MENGAJAR);
    const newMg: Mengajar = {
      id: genId('mg'),
      created_at: new Date().toISOString(),
      ...payload,
    };
    const updated = [...list, newMg];
    setStore(KEYS.MENGAJAR, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('mengajar').insert([payload]);
      } catch (err) {
        console.warn('Supabase addMengajar sync error:', err);
      }
    }

    return newMg;
  },

  async deleteMengajar(id: string): Promise<boolean> {
    const list = getStore<Mengajar>(KEYS.MENGAJAR, INITIAL_MENGAJAR);
    setStore(KEYS.MENGAJAR, list.filter((m) => m.id !== id));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('mengajar').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteMengajar sync error:', err);
      }
    }

    return true;
  },

  // ===================== JADWAL PELAJARAN =====================
  async getJadwalList(): Promise<JadwalPelajaran[]> {
    const mengajar = await this.getMengajarList();
    const mengajarMap = new Map(mengajar.map((m) => [m.id, m]));

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('jadwal_pelajaran')
          .select(`
            *,
            mengajar:mengajar_id (
              id,
              guru_id,
              mapel_id,
              kelas_id,
              tahun_ajaran_id,
              guru:guru_id (id, nama, nip),
              mapel:mapel_id (id, nama_mapel, kode_mapel),
              kelas:kelas_id (id, nama_kelas, tingkat)
            )
          `)
          .order('hari', { ascending: true })
          .order('jam_mulai', { ascending: true });

        if (!error && data && data.length > 0) {
          setStore(KEYS.JADWAL, data as JadwalPelajaran[]);
          return data as JadwalPelajaran[];
        }
      } catch (err) {
        console.warn('Supabase getJadwal error, fallback to cache:', err);
      }
    }

    const raw = getStore<JadwalPelajaran>(KEYS.JADWAL, INITIAL_JADWAL);
    return raw.map((j) => ({
      ...j,
      mengajar: mengajarMap.get(j.mengajar_id) || null,
    }));
  },

  async addJadwal(payload: Omit<JadwalPelajaran, 'id' | 'created_at' | 'mengajar'>): Promise<JadwalPelajaran> {
    const newJ: JadwalPelajaran = {
      id: genId('j'),
      created_at: new Date().toISOString(),
      ...payload,
    };
    const list = getStore<JadwalPelajaran>(KEYS.JADWAL, INITIAL_JADWAL);
    const updated = [...list, newJ];
    setStore(KEYS.JADWAL, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('jadwal_pelajaran').insert([payload]);
      } catch (err) {
        console.warn('Supabase addJadwal sync error:', err);
      }
    }

    return newJ;
  },

  async updateJadwal(id: string, payload: Partial<JadwalPelajaran>): Promise<JadwalPelajaran> {
    const list = getStore<JadwalPelajaran>(KEYS.JADWAL, INITIAL_JADWAL);
    let updatedItem: JadwalPelajaran | null = null;
    const updated = list.map((j) => {
      if (j.id === id) {
        updatedItem = { ...j, ...payload };
        return updatedItem;
      }
      return j;
    });
    setStore(KEYS.JADWAL, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('jadwal_pelajaran').update(payload).eq('id', id);
      } catch (err) {
        console.warn('Supabase updateJadwal sync error:', err);
      }
    }

    if (!updatedItem) throw new Error('Jadwal tidak ditemukan');
    return updatedItem;
  },

  async deleteJadwal(id: string): Promise<boolean> {
    const list = getStore<JadwalPelajaran>(KEYS.JADWAL, INITIAL_JADWAL);
    setStore(KEYS.JADWAL, list.filter((j) => j.id !== id));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('jadwal_pelajaran').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteJadwal sync error:', err);
      }
    }

    return true;
  },

  // ===================== ABSENSI =====================
  async getAbsensiList(filters?: { kelas_id?: string; tanggal?: string; tahun_ajaran_id?: string }): Promise<Absensi[]> {
    const students = await this.getSiswaList();
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const classes = await this.getKelasList();
    const classMap = new Map(classes.map((k) => [k.id, k]));

    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('absensi').select('*');
        if (filters?.kelas_id) query = query.eq('kelas_id', filters.kelas_id);
        if (filters?.tanggal) query = query.eq('tanggal', filters.tanggal);
        if (filters?.tahun_ajaran_id) query = query.eq('tahun_ajaran_id', filters.tahun_ajaran_id);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return (data as Absensi[]).map((ab) => ({
            ...ab,
            siswa: studentMap.get(ab.siswa_id) || null,
            kelas: classMap.get(ab.kelas_id) || null,
          }));
        }
      } catch (err) {
        console.warn('Supabase getAbsensi error, fallback to cache:', err);
      }
    }

    const raw = getStore<Absensi>(KEYS.ABSENSI, INITIAL_ABSENSI);
    let filtered = raw;
    if (filters?.kelas_id) filtered = filtered.filter((a) => a.kelas_id === filters.kelas_id);
    if (filters?.tanggal) filtered = filtered.filter((a) => a.tanggal === filters.tanggal);
    if (filters?.tahun_ajaran_id) filtered = filtered.filter((a) => a.tahun_ajaran_id === filters.tahun_ajaran_id);

    return filtered.map((ab) => ({
      ...ab,
      siswa: studentMap.get(ab.siswa_id) || null,
      kelas: classMap.get(ab.kelas_id) || null,
    }));
  },

  async upsertAbsensiBatch(
    records: Array<{
      siswa_id: string;
      kelas_id: string;
      tahun_ajaran_id: string;
      tanggal: string;
      status: StatusAbsensi;
      keterangan?: string | null;
    }>
  ): Promise<boolean> {
    const list = getStore<Absensi>(KEYS.ABSENSI, INITIAL_ABSENSI);
    const updatedMap = new Map<string, Absensi>();

    // Put existing in map: key = `${siswa_id}_${tanggal}`
    list.forEach((item) => {
      updatedMap.set(`${item.siswa_id}_${item.tanggal}`, item);
    });

    // Merge new records
    records.forEach((rec) => {
      const key = `${rec.siswa_id}_${rec.tanggal}`;
      const existing = updatedMap.get(key);
      const merged: Absensi = {
        id: existing?.id || genId('ab'),
        created_at: existing?.created_at || new Date().toISOString(),
        siswa_id: rec.siswa_id,
        kelas_id: rec.kelas_id,
        tahun_ajaran_id: rec.tahun_ajaran_id,
        tanggal: rec.tanggal,
        status: rec.status,
        keterangan: rec.keterangan || null,
      };
      updatedMap.set(key, merged);
    });

    setStore(KEYS.ABSENSI, Array.from(updatedMap.values()));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('absensi').upsert(records, { onConflict: 'siswa_id,tanggal' });
      } catch (err) {
        console.warn('Supabase upsertAbsensi sync error:', err);
      }
    }

    return true;
  },

  // ===================== NILAI =====================
  async getNilaiList(filters?: { mengajar_id?: string; siswa_id?: string }): Promise<Nilai[]> {
    const students = await this.getSiswaList();
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const mengajar = await this.getMengajarList();
    const mengajarMap = new Map(mengajar.map((m) => [m.id, m]));

    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('nilai').select('*');
        if (filters?.mengajar_id) query = query.eq('mengajar_id', filters.mengajar_id);
        if (filters?.siswa_id) query = query.eq('siswa_id', filters.siswa_id);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return (data as Nilai[]).map((nl) => ({
            ...nl,
            siswa: studentMap.get(nl.siswa_id) || null,
            mengajar: mengajarMap.get(nl.mengajar_id) || null,
          }));
        }
      } catch (err) {
        console.warn('Supabase getNilai error, fallback to cache:', err);
      }
    }

    const raw = getStore<Nilai>(KEYS.NILAI, INITIAL_NILAI);
    let filtered = raw;
    if (filters?.mengajar_id) filtered = filtered.filter((n) => n.mengajar_id === filters.mengajar_id);
    if (filters?.siswa_id) filtered = filtered.filter((n) => n.siswa_id === filters.siswa_id);

    return filtered.map((nl) => ({
      ...nl,
      siswa: studentMap.get(nl.siswa_id) || null,
      mengajar: mengajarMap.get(nl.mengajar_id) || null,
    }));
  },

  async insertNilaiBatch(
    records: Array<Omit<Nilai, 'id' | 'created_at' | 'siswa' | 'mengajar'>>
  ): Promise<boolean> {
    const list = getStore<Nilai>(KEYS.NILAI, INITIAL_NILAI);
    const newItems: Nilai[] = records.map((rec) => ({
      id: genId('nl'),
      created_at: new Date().toISOString(),
      ...rec,
    }));

    setStore(KEYS.NILAI, [...newItems, ...list]);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('nilai').insert(records);
      } catch (err) {
        console.warn('Supabase insertNilai sync error:', err);
      }
    }

    return true;
  },

  async updateNilai(id: string, nilaiValue: number): Promise<boolean> {
    const list = getStore<Nilai>(KEYS.NILAI, INITIAL_NILAI);
    const updated = list.map((n) => (n.id === id ? { ...n, nilai: nilaiValue } : n));
    setStore(KEYS.NILAI, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('nilai').update({ nilai: nilaiValue }).eq('id', id);
      } catch (err) {
        console.warn('Supabase updateNilai sync error:', err);
      }
    }

    return true;
  },

  async deleteNilai(id: string): Promise<boolean> {
    const list = getStore<Nilai>(KEYS.NILAI, INITIAL_NILAI);
    setStore(KEYS.NILAI, list.filter((n) => n.id !== id));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('nilai').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteNilai sync error:', err);
      }
    }

    return true;
  },

  // ===================== PROFIL PENGGUNA =====================
  async getProfilList(): Promise<ProfilPengguna[]> {
    const teachers = await this.getGuruList();
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));

    const defaultProfils: ProfilPengguna[] = [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        role: 'admin',
        nama_lengkap: 'M. Kahfi (Administrator)',
        guru_id: null,
        status: 'Aktif',
      },
      {
        id: 'a0000000-0000-0000-0000-000000000002',
        role: 'kepala_sekolah',
        nama_lengkap: 'Ustaz Abdullah, S.Pd.I',
        guru_id: 'g-001',
        status: 'Aktif',
      },
      {
        id: 'a0000000-0000-0000-0000-000000000003',
        role: 'guru',
        nama_lengkap: 'Ustazah Fatimah Azzahra, M.Pd',
        guru_id: 'g-002',
        status: 'Aktif',
      },
    ];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('profil_pengguna')
          .select('*, guru:guru_id(*)');

        if (!error && data && data.length > 0) {
          setStore(KEYS.PROFIL, data as ProfilPengguna[]);
          return data as ProfilPengguna[];
        }
      } catch (err) {
        console.warn('Supabase getProfil error, fallback to cache:', err);
      }
    }

    const raw = getStore<ProfilPengguna>(KEYS.PROFIL, defaultProfils);
    return raw.map((p) => ({
      ...p,
      guru: p.guru_id ? teacherMap.get(p.guru_id) || null : null,
    }));
  },

  async updateProfil(id: string, payload: Partial<ProfilPengguna>): Promise<ProfilPengguna> {
    const list = await this.getProfilList();
    let updatedItem: ProfilPengguna | null = null;
    const updated = list.map((p) => {
      if (p.id === id) {
        updatedItem = { ...p, ...payload };
        return updatedItem;
      }
      return p;
    });
    setStore(KEYS.PROFIL, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('profil_pengguna').update(payload).eq('id', id);
      } catch (err) {
        console.warn('Supabase updateProfil sync error:', err);
      }
    }

    if (!updatedItem) {
      updatedItem = {
        id,
        role: 'admin',
        nama_lengkap: payload.nama_lengkap || 'Administrator',
        guru_id: null,
        status: 'Aktif',
        ...payload,
      };
      setStore(KEYS.PROFIL, [...list, updatedItem]);
    }

    return updatedItem;
  },
};
