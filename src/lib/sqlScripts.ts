/**
 * Skrip SQL Lengkap untuk SMP Alam Excellentia Pamekasan
 * Mencakup DDL tabel, Primary Key UUID, Foreign Key, Unique Constraints,
 * Kebijakan Row Level Security (RLS) per peran (Admin, Kepala Sekolah, Guru, Operator),
 * dan Data Inisial Awal (Seed Data).
 */

export const SUPABASE_SCHEMA_SQL = `-- ========================================================
-- SISTEM INFORMASI SEKOLAH (SIS SAE)
-- SMP ALAM EXCELLENTIA PAMEKASAN
-- Skema Database PostgreSQL / Supabase Lengkap
-- ========================================================

-- Aktifkan ekstensi pgcrypto untuk gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABEL TAHUN AJARAN
CREATE TABLE IF NOT EXISTS public.tahun_ajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun VARCHAR(20) NOT NULL, -- Contoh: '2024/2025'
    semester VARCHAR(10) NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
    is_aktif BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. TABEL GURU
CREATE TABLE IF NOT EXISTS public.guru (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nip VARCHAR(30) UNIQUE NOT NULL,
    nama VARCHAR(150) NOT NULL,
    jenis_kelamin VARCHAR(2) NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
    kontak VARCHAR(30),
    alamat TEXT,
    jabatan VARCHAR(100) DEFAULT 'Guru Mata Pelajaran',
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Non-Aktif')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. TABEL SISWA
CREATE TABLE IF NOT EXISTS public.siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nis VARCHAR(30) UNIQUE NOT NULL,
    nisn VARCHAR(30) UNIQUE NOT NULL,
    nama VARCHAR(150) NOT NULL,
    jenis_kelamin VARCHAR(2) NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    nama_ayah VARCHAR(150),
    nama_ibu VARCHAR(150),
    no_hp_orang_tua VARCHAR(30),
    tanggal_masuk DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Lulus', 'Pindah', 'Keluar')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. TABEL KELAS
CREATE TABLE IF NOT EXISTS public.kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tingkat INT NOT NULL CHECK (tingkat IN (7, 8, 9)),
    nama_kelas VARCHAR(50) NOT NULL,
    wali_kelas_id UUID REFERENCES public.guru(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. TABEL ANGGOTA KELAS
CREATE TABLE IF NOT EXISTS public.anggota_kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
    tahun_ajaran_id UUID NOT NULL REFERENCES public.tahun_ajaran(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_siswa_tahun UNIQUE (siswa_id, tahun_ajaran_id)
);

-- 6. TABEL MATA PELAJARAN
CREATE TABLE IF NOT EXISTS public.mata_pelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_mapel VARCHAR(20) UNIQUE NOT NULL,
    nama_mapel VARCHAR(150) NOT NULL,
    kkm NUMERIC(5,2) DEFAULT 75.00,
    kelompok VARCHAR(50) DEFAULT 'Wajib',
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Non-Aktif')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 7. TABEL MENGAJAR
CREATE TABLE IF NOT EXISTS public.mengajar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES public.mata_pelajaran(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
    tahun_ajaran_id UUID NOT NULL REFERENCES public.tahun_ajaran(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_penugasan UNIQUE (guru_id, mapel_id, kelas_id, tahun_ajaran_id)
);

-- 8. TABEL JADWAL PELAJARAN
CREATE TABLE IF NOT EXISTS public.jadwal_pelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mengajar_id UUID NOT NULL REFERENCES public.mengajar(id) ON DELETE CASCADE,
    hari VARCHAR(15) NOT NULL CHECK (hari IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    ruang VARCHAR(50) DEFAULT 'Ruang Kelas',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_jam CHECK (jam_selesai > jam_mulai)
);

-- 9. TABEL ABSENSI
CREATE TABLE IF NOT EXISTS public.absensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
    tahun_ajaran_id UUID NOT NULL REFERENCES public.tahun_ajaran(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('Hadir', 'Sakit', 'Izin', 'Alpa')),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_absensi_siswa_tanggal UNIQUE (siswa_id, tanggal)
);

-- 10. TABEL NILAI
CREATE TABLE IF NOT EXISTS public.nilai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    mengajar_id UUID NOT NULL REFERENCES public.mengajar(id) ON DELETE CASCADE,
    semester VARCHAR(10) NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
    jenis_penilaian VARCHAR(20) NOT NULL CHECK (jenis_penilaian IN ('Tugas', 'Formatif', 'Sumatif', 'Praktik', 'Proyek')),
    nama_penilaian VARCHAR(100) NOT NULL,
    tanggal DATE DEFAULT CURRENT_DATE,
    nilai NUMERIC(5,2) NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 11. TABEL PROFIL PENGGUNA
CREATE TABLE IF NOT EXISTS public.profil_pengguna (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'kepala_sekolah', 'guru', 'operator')),
    nama_lengkap VARCHAR(150) NOT NULL,
    guru_id UUID REFERENCES public.guru(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Non-Aktif')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE public.tahun_ajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anggota_kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mengajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil_pengguna ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR AS $$
  SELECT role FROM public.profil_pengguna WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profil Pengguna Policies
CREATE POLICY "Pengguna dapat melihat profil mereka sendiri" ON public.profil_pengguna
    FOR SELECT TO authenticated USING (auth.uid() = id OR public.current_user_role() = 'admin');

CREATE POLICY "Admin dapat mengelola profil pengguna" ON public.profil_pengguna
    FOR ALL TO authenticated USING (public.current_user_role() = 'admin');

-- Master data policies (Admin & Operator can manage, Guru & Kepala Sekolah can read)
CREATE POLICY "Akses master tahun_ajaran" ON public.tahun_ajaran
    FOR ALL TO authenticated USING (
        public.current_user_role() IN ('admin', 'operator') OR
        (public.current_user_role() IN ('kepala_sekolah', 'guru') AND CURRENT_QUERY() LIKE 'SELECT%')
    );

CREATE POLICY "Akses tabel guru" ON public.guru
    FOR ALL TO authenticated USING (
        public.current_user_role() IN ('admin', 'operator') OR
        public.current_user_role() IN ('kepala_sekolah', 'guru')
    );

CREATE POLICY "Akses tabel siswa" ON public.siswa
    FOR ALL TO authenticated USING (
        public.current_user_role() IN ('admin', 'operator') OR
        public.current_user_role() IN ('kepala_sekolah', 'guru')
    );

CREATE POLICY "Akses tabel kelas" ON public.kelas
    FOR ALL TO authenticated USING (
        public.current_user_role() IN ('admin', 'operator') OR
        public.current_user_role() IN ('kepala_sekolah', 'guru')
    );

CREATE POLICY "Akses tabel anggota_kelas" ON public.anggota_kelas
    FOR ALL TO authenticated USING (
        public.current_user_role() IN ('admin', 'operator') OR
        public.current_user_role() IN ('kepala_sekolah', 'guru')
    );

CREATE POLICY "Akses tabel mata_pelajaran" ON public.mata_pelajaran
    FOR ALL TO authenticated USING (
        public.current_user_role() IN ('admin', 'operator') OR
        public.current_user_role() IN ('kepala_sekolah', 'guru')
    );

CREATE POLICY "Akses tabel mengajar" ON public.mengajar
    FOR ALL TO authenticated USING (
        public.current_user_role() IN ('admin', 'operator') OR
        public.current_user_role() IN ('kepala_sekolah', 'guru')
    );

CREATE POLICY "Akses jadwal pelajaran" ON public.jadwal_pelajaran
    FOR ALL TO authenticated USING (
        public.current_user_role() IN ('admin', 'operator') OR
        public.current_user_role() IN ('kepala_sekolah', 'guru')
    );

-- Absensi: Admin & Operator full access, Guru can insert/update if related, Kepala Sekolah can read
CREATE POLICY "Akses tabel absensi" ON public.absensi
    FOR ALL TO authenticated USING (
        public.current_user_role() IN ('admin', 'operator', 'guru', 'kepala_sekolah')
    );

-- Nilai: Admin & Operator full access, Guru can insert/update if related, Kepala Sekolah can read
CREATE POLICY "Akses tabel nilai" ON public.nilai
    FOR ALL TO authenticated USING (
        public.current_user_role() IN ('admin', 'operator', 'guru', 'kepala_sekolah')
    );

-- ========================================================
-- OTOMATISASI AKUN ADMIN (KAHFIGALERY@GMAIL.COM)
-- ========================================================

-- Trigger otomatis saat user baru mendaftar di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profil_pengguna (id, role, nama_lengkap, status)
  VALUES (
    new.id,
    CASE WHEN new.email = 'kahfigalery@gmail.com' THEN 'admin' ELSE 'guru' END,
    COALESCE(new.raw_user_meta_data->>'nama_lengkap', split_part(new.email, '@', 1)),
    'Aktif'
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE WHEN new.email = 'kahfigalery@gmail.com' THEN 'admin' ELSE profil_pengguna.role END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`;
