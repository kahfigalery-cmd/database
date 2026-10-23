import React from 'react';
import { StatusAbsensi, StatusSiswa, UserRole } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'stone';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'stone', size = 'sm' }) => {
  const variantStyles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    blue: 'bg-sky-50 text-sky-700 border-sky-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
    stone: 'bg-stone-100 text-stone-700 border-stone-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 rounded-full font-medium border',
    md: 'text-sm px-3 py-1 rounded-full font-medium border',
  };

  return <span className={`inline-flex items-center gap-1.5 ${sizeStyles[size]} ${variantStyles[variant]}`}>{children}</span>;
};

export const StatusAbsensiBadge: React.FC<{ status: StatusAbsensi }> = ({ status }) => {
  switch (status) {
    case 'Hadir':
      return <Badge variant="emerald"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Hadir</Badge>;
    case 'Sakit':
      return <Badge variant="amber"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Sakit</Badge>;
    case 'Izin':
      return <Badge variant="blue"><span className="w-1.5 h-1.5 rounded-full bg-sky-500" />Izin</Badge>;
    case 'Alpa':
      return <Badge variant="rose"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Alpa</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export const StatusSiswaBadge: React.FC<{ status: StatusSiswa }> = ({ status }) => {
  switch (status) {
    case 'Aktif':
      return <Badge variant="emerald">Aktif</Badge>;
    case 'Lulus':
      return <Badge variant="blue">Lulus</Badge>;
    case 'Pindah':
      return <Badge variant="amber">Pindah</Badge>;
    case 'Keluar':
      return <Badge variant="rose">Keluar</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export const RoleBadge: React.FC<{ role?: UserRole | string | null }> = ({ role }) => {
  switch (role) {
    case 'admin':
      return <Badge variant="purple">Administrator</Badge>;
    case 'kepala_sekolah':
      return <Badge variant="blue">Kepala Sekolah</Badge>;
    case 'guru':
      return <Badge variant="emerald">Guru</Badge>;
    case 'operator':
      return <Badge variant="amber">Operator</Badge>;
    default:
      return <Badge variant="stone">Tamu / Belum Ditentukan</Badge>;
  }
};
