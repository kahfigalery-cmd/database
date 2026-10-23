export type UserRole = 'admin' | 'kepala_sekolah' | 'guru' | 'operator';

export interface ProfilPengguna {
  id: string;
  role: UserRole;
  nama_lengkap: string;
  guru_id: string | null;
  status: 'Aktif' | 'Non-Aktif';
  created_at?: string;
  guru?: Guru | null;
}

export interface TahunAjaran {
  id: string;
  tahun: string; // e.g. "2024/2025"
  semester: 'Ganjil' | 'Genap';
  is_aktif: boolean;
  created_at?: string;
}

export interface Guru {
  id: string;
  nip: string;
  nama: string;
  jenis_kelamin: 'L' | 'P';
  kontak: string;
  alamat: string;
  jabatan: string;
  status: 'Aktif' | 'Non-Aktif';
  created_at?: string;
}

export type StatusSiswa = 'Aktif' | 'Lulus' | 'Pindah' | 'Keluar';

export interface Siswa {
  id: string;
  nis: string;
  nisn: string;
  nama: string;
  jenis_kelamin: 'L' | 'P';
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat: string;
  nama_ayah: string;
  nama_ibu: string;
  no_hp_orang_tua: string;
  tanggal_masuk: string;
  status: StatusSiswa;
  created_at?: string;
}

export interface Kelas {
  id: string;
  tingkat: number; // 7, 8, 9
  nama_kelas: string;
  wali_kelas_id: string | null;
  created_at?: string;
  wali_kelas?: Guru | null;
}

export interface AnggotaKelas {
  id: string;
  siswa_id: string;
  kelas_id: string;
  tahun_ajaran_id: string;
  created_at?: string;
  siswa?: Siswa | null;
  kelas?: Kelas | null;
  tahun_ajaran?: TahunAjaran | null;
}

export interface MataPelajaran {
  id: string;
  kode_mapel: string;
  nama_mapel: string;
  kkm: number;
  kelompok: string; // e.g. "Kelompok A (Wajib)", "Kelompok B (Muatan Lokal)", "Khas Sekolah Alam"
  status: 'Aktif' | 'Non-Aktif';
  created_at?: string;
}

export interface Mengajar {
  id: string;
  guru_id: string;
  mapel_id: string;
  kelas_id: string;
  tahun_ajaran_id: string;
  created_at?: string;
  guru?: Guru | null;
  mapel?: MataPelajaran | null;
  kelas?: Kelas | null;
  tahun_ajaran?: TahunAjaran | null;
}

export type HariSekolah = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

export interface JadwalPelajaran {
  id: string;
  mengajar_id: string;
  hari: HariSekolah;
  jam_mulai: string; // e.g. "07:30"
  jam_selesai: string; // e.g. "09:00"
  ruang: string;
  created_at?: string;
  mengajar?: Mengajar | null;
}

export type StatusAbsensi = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';

export interface Absensi {
  id: string;
  siswa_id: string;
  kelas_id: string;
  tahun_ajaran_id: string;
  tanggal: string; // YYYY-MM-DD
  status: StatusAbsensi;
  keterangan: string | null;
  created_at?: string;
  siswa?: Siswa | null;
  kelas?: Kelas | null;
}

export type JenisPenilaian = 'Tugas' | 'Formatif' | 'Sumatif' | 'Praktik' | 'Proyek';

export interface Nilai {
  id: string;
  siswa_id: string;
  mengajar_id: string;
  semester: 'Ganjil' | 'Genap';
  jenis_penilaian: JenisPenilaian;
  nama_penilaian: string;
  tanggal: string; // YYYY-MM-DD
  nilai: number; // 0 - 100
  created_at?: string;
  siswa?: Siswa | null;
  mengajar?: Mengajar | null;
}
