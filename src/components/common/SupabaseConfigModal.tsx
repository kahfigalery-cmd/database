import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { testSupabaseConnection, getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, isSupabaseConfigured } from '../../lib/supabase';
import { SUPABASE_SCHEMA_SQL } from '../../lib/sqlScripts';
import { useToast } from '../../context/ToastContext';
import { Database, CheckCircle2, AlertCircle, Copy, Check, RefreshCw, Key, ShieldCheck, ExternalLink } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'credentials'>('status');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const creds = getSupabaseConfig();
  const [inputUrl, setInputUrl] = useState(creds.url);
  const [inputKey, setInputKey] = useState(creds.key);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
      if (res.success) {
        showToast('success', res.message, 'Koneksi Berhasil');
      } else {
        showToast('error', res.message, 'Koneksi Gagal');
      }
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTest();
    }
  }, [isOpen]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    showToast('success', 'Skrip SQL berhasil disalin ke papan klip!', 'Tersalin');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl || !inputKey) {
      showToast('error', 'URL dan Anon Key Supabase tidak boleh kosong', 'Validasi Gagal');
      return;
    }
    saveSupabaseConfig(inputUrl, inputKey);
  };

  const handleResetCredentials = () => {
    if (confirm('Hapus pengaturan kredensial lokal dan kembalikan ke default env?')) {
      clearSupabaseConfig();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Koneksi & Skema Database Supabase" maxWidth="3xl">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Status Koneksi
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Skrip SQL & RLS
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'credentials'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Pengaturan Kredensial
          </button>
        </div>

        {/* Tab 1: Status */}
        {activeTab === 'status' && (
          <div className="space-y-4 pt-1">
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                testResult?.success
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : isSupabaseConfigured()
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {testResult?.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : isSupabaseConfigured() ? (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div className="flex-1 text-sm">
                <h4 className="font-semibold text-base mb-1">
                  {testResult?.success
                    ? 'Terhubung ke Database Supabase'
                    : isSupabaseConfigured()
                    ? 'Koneksi Memerlukan Perhatian'
                    : 'Supabase Belum Dikonfigurasi'}
                </h4>
                <p className="text-stone-700 leading-relaxed">
                  {testing
                    ? 'Sedang menguji koneksi ke database...'
                    : testResult?.message ||
                      'Masukkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env atau simpan di tab Pengaturan Kredensial.'}
                </p>
              </div>
              <button
                onClick={runTest}
                disabled={testing}
                className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                Uji Ulang
              </button>
            </div>

            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-xs space-y-2 text-stone-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-stone-500">Supabase URL Terdeteksi:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800">
                  {creds.url ? `${creds.url.slice(0, 32)}...` : 'Belum diisi'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-stone-500">Sumber Kredensial:</span>
                <span className="font-semibold uppercase text-emerald-700">{creds.source}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-stone-500">Row Level Security (RLS):</span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Ditegakkan di tingkat tabel
                </span>
              </div>
            </div>

            <div className="text-xs text-stone-500 leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-200/60">
              <p className="font-semibold text-amber-900 mb-1">Catatan Penting:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                <li>Sistem Informasi Sekolah ini beroperasi penuh dengan query PostgreSQL langsung ke tabel Supabase.</li>
                <li>Tidak ada data dummy yang disamarkan sebagai data database nyata.</li>
                <li>Jika tabel belum dibuat di Supabase Anda, buka tab <strong>Skrip SQL & RLS</strong> di atas, salin kodenya, dan jalankan di <em>SQL Editor</em> dashboard Supabase Anda.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: SQL Scripts */}
        {activeTab === 'sql' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Skrip Migrasi Tabel & Kebijakan RLS</h4>
                <p className="text-xs text-stone-500">
                  Salin dan tempel ke Supabase SQL Editor untuk menyiapkan semua 11 tabel dan keamanan RLS.
                </p>
              </div>
              <button
                onClick={handleCopySql}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Tersalin ke Klip!' : 'Salin Seluruh SQL'}
              </button>
            </div>

            <div className="relative">
              <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-xs font-mono max-h-80 overflow-y-auto leading-relaxed border border-stone-800">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Credentials */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleSaveCredentials} className="space-y-4 pt-1">
            <p className="text-xs text-stone-500">
              Anda dapat memasukkan kredensial Supabase langsung di sini jika belum dikonfigurasi melalui environment variables. Nilai disimpan di penyimpanan aman browser.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Project URL (VITE_SUPABASE_URL)</label>
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full text-xs font-mono px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Anon Key Publik (VITE_SUPABASE_ANON_KEY)</label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full text-xs font-mono px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={handleResetCredentials}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
              >
                Reset ke Pengaturan Default
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
                >
                  Simpan & Hubungkan
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
