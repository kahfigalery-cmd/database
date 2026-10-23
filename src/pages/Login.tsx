import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Database,
  UserPlus,
  KeyRound,
  CheckCircle2,
  Sparkles,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onOpenDbModal: () => void;
}

export const Login: React.FC<LoginProps> = ({ onOpenDbModal }) => {
  const { login, signUp, loginDirectAdmin, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('kahfigalery@gmail.com');
  const [password, setPassword] = useState('Excellentia2025!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register form state
  const [regNama, setRegNama] = useState('M. Kahfi');
  const [regEmail, setRegEmail] = useState('kahfigalery@gmail.com');
  const [regPassword, setRegPassword] = useState('Excellentia2025!');
  const [regLoading, setRegLoading] = useState(false);

  // Forgot Password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('kahfigalery@gmail.com');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Silakan masukkan email dan kata sandi Anda.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setErrorMsg(result.error || 'Email atau kata sandi tidak valid. Periksa kembali akun Anda.');
      } else {
        showToast(
          'success',
          'Selamat datang di Sistem Informasi Sekolah SMP Alam Excellentia Pamekasan.',
          'Login Berhasil'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regEmail || !regPassword || !regNama) {
      setErrorMsg('Semua kolom pendaftaran wajib diisi.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await signUp(regEmail, regPassword, regNama, 'admin');
      if (res.success) {
        showToast('success', res.message || 'Akun berhasil dibuat.', 'Akun Berhasil Dibuat');
        setMode('login');
        setEmail(regEmail);
        setPassword(regPassword);
      } else {
        setErrorMsg(res.error || 'Gagal membuat akun.');
      }
    } finally {
      setRegLoading(false);
    }
  };

  const handleQuickLoginAsKahfi = () => {
    loginDirectAdmin('kahfigalery@gmail.com', 'M. Kahfi (Administrator)');
    showToast('success', 'Berhasil masuk sebagai Administrator (kahfigalery@gmail.com)', 'Akses Diberikan');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      showToast('error', 'Masukkan email Anda untuk pemulihan akun.', 'Validasi');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await resetPassword(forgotEmail);
      if (res.success) {
        showToast('success', 'Tautan pemulihan kata sandi telah dikirim ke email Anda.', 'Email Terkirim');
        setIsForgotOpen(false);
      } else {
        showToast('error', res.error || 'Gagal mengirim email pemulihan.', 'Gagal');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-br from-stone-100 via-stone-50 to-emerald-50/50">
      {/* Background decoration with nature accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-md">
        {/* School Branding Card with Official Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-xl shadow-emerald-950/15 mb-3 p-1 border-2 border-emerald-500/30">
            <img
              src="/logo-sae.png"
              alt="Logo Resmi SMP Alam Excellentia Pamekasan"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            SMP ALAM EXCELLENTIA
          </h1>
          <p className="text-xs font-black text-emerald-800 uppercase tracking-widest mt-0.5">
            SAE • PAMEKASAN • MADURA
          </p>
          <p className="text-xs text-stone-500 mt-1.5 font-medium">
            Sistem Informasi Sekolah (SIS SAE) Terintegrasi
          </p>
        </div>

        {/* Quick Administrator Account Badge for Requested User */}
        <div className="mb-4 bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-4 text-white shadow-lg shadow-emerald-950/20 border border-emerald-700/60">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
                Akun Administrator Siap Pakai
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 border border-emerald-500/40">
              Role: Admin
            </span>
          </div>

          <div className="bg-black/20 rounded-xl p-2.5 text-xs font-mono space-y-1 mb-3 border border-white/10">
            <div className="flex items-center justify-between text-stone-200">
              <span className="text-stone-400">Email:</span>
              <strong className="text-white">kahfigalery@gmail.com</strong>
            </div>
            <div className="flex items-center justify-between text-stone-200">
              <span className="text-stone-400">Sandi:</span>
              <strong className="text-emerald-300">Excellentia2025!</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickLoginAsKahfi}
            className="w-full py-2 px-3 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Masuk Langsung Sebagai Administrator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Login / Register Card Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-stone-200/80 backdrop-blur-md">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-stone-200 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer text-center ${
                mode === 'login'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              Masuk Sistem
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer text-center ${
                mode === 'register'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              Daftarkan Akun Baru
            </button>
          </div>

          {!isSupabaseConfigured() && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Supabase Belum Dikonfigurasi</span>
              </div>
              <p className="leading-relaxed text-amber-700">
                Aplikasi belum terhubung ke Supabase aktif. Anda tetap dapat menggunakan tombol <strong>"Masuk Langsung Sebagai Administrator"</strong> di atas untuk mengakses seluruh fitur.
              </p>
              <button
                type="button"
                onClick={onOpenDbModal}
                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                Buka Pengaturan Supabase & Skrip SQL
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Form: Login */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Email Akun
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kahfigalery@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  >
                    Lupa sandi?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form: Register */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regNama}
                    onChange={(e) => setRegNama(e.target.value)}
                    placeholder="Nama Lengkap Administrator"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Email Akun
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="kahfigalery@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full mt-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {regLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mendaftarkan Akun...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Daftarkan & Aktifkan Sebagai Admin</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Security & RLS Note */}
          <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Supabase Auth & RLS
            </span>
            <button
              type="button"
              onClick={onOpenDbModal}
              className="text-stone-600 hover:text-emerald-700 font-semibold cursor-pointer flex items-center gap-1"
            >
              <Database className="w-3 h-3" />
              Skema Database
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-stone-400 mt-6">
          © {new Date().getFullYear()} SMP Alam Excellentia Pamekasan. Hak cipta dilindungi.
        </p>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        title="Pemulihan Kata Sandi"
        subtitle="Kirim tautan atur ulang kata sandi melalui Supabase Auth"
        maxWidth="sm"
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-xs text-stone-600 leading-relaxed">
            Masukkan alamat email yang terdaftar. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi Anda.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Email Akun</label>
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="kahfigalery@gmail.com"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsForgotOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={forgotLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {forgotLoading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Kirim Tautan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
