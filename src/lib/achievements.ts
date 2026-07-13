export type Stats = {
  saldo: number;
  totalSetorKg: number;
  jumlahSetor: number;
  jumlahBelanja: number;
  jumlahLaporan: number;
  jumlahKlasifikasi: number;
  jumlahTps: number;
};

export type Achievement = {
  key: string;
  label: string;
  icon: string; // nama ikon Feather
  desc: string;
  syarat: string; // penjelasan kondisi (untuk UI/dokumen)
  unlocked: (s: Stats) => boolean;
};

// Definisi pencapaian — dikaitkan ke fitur nyata aplikasi.
export const ACHIEVEMENTS: Achievement[] = [
  { key: 'pemula', label: 'Pemula Hijau', icon: 'user-check',
    desc: 'Selamat bergabung di Niti Resik!', syarat: 'Akun terdaftar & login.',
    unlocked: () => true },
  { key: 'setor1', label: 'Setor Pertama', icon: 'package',
    desc: 'Setoran sampah pertamamu tercatat.', syarat: 'Menyetor sampah ke bank sampah ≥ 1 kali.',
    unlocked: (s) => s.jumlahSetor >= 1 },
  { key: 'daur50', label: 'Pegiat Daur Ulang', icon: 'refresh-ccw',
    desc: 'Menyetor total ≥ 50 kg sampah.', syarat: 'Akumulasi berat setoran ≥ 50 kg.',
    unlocked: (s) => s.totalSetorKg >= 50 },
  { key: 'daur100', label: 'Pahlawan Sampah', icon: 'shield',
    desc: 'Menyetor total ≥ 100 kg sampah.', syarat: 'Akumulasi berat setoran ≥ 100 kg.',
    unlocked: (s) => s.totalSetorKg >= 100 },
  { key: 'nasabah', label: 'Nasabah Aktif', icon: 'credit-card',
    desc: 'Punya saldo hasil setoran.', syarat: 'Saldo > Rp0.',
    unlocked: (s) => s.saldo > 0 },
  { key: 'kolektor', label: 'Kolektor Saldo', icon: 'trending-up',
    desc: 'Saldo menembus Rp100.000.', syarat: 'Saldo ≥ Rp100.000.',
    unlocked: (s) => s.saldo >= 100000 },
  { key: 'belanja', label: 'Belanja Ramah', icon: 'shopping-bag',
    desc: 'Berbelanja produk ramah lingkungan.', syarat: 'Menyelesaikan belanja ≥ 1 kali.',
    unlocked: (s) => s.jumlahBelanja >= 1 },
  { key: 'pelapor', label: 'Pelapor Lingkungan', icon: 'alert-triangle',
    desc: 'Mengirim laporan masalah sampah.', syarat: 'Membuat laporan ≥ 1 kali.',
    unlocked: (s) => s.jumlahLaporan >= 1 },
  { key: 'pindai', label: 'Pindai AI', icon: 'zap',
    desc: 'Mencoba Klasifikasi AI.', syarat: 'Melakukan klasifikasi ≥ 1 kali.',
    unlocked: (s) => s.jumlahKlasifikasi >= 1 },
  { key: 'anggotaTps', label: 'Anggota TPS', icon: 'map-pin',
    desc: 'Terdaftar sebagai nasabah TPS.', syarat: 'Bergabung ke TPS ≥ 1.',
    unlocked: (s) => s.jumlahTps >= 1 },
  { key: 'ecoWarrior', label: 'Eco Warrior', icon: 'award',
    desc: 'Aktif di semua lini kebersihan.', syarat: 'Setor ≥ 100 kg DAN pernah belanja DAN pernah melapor.',
    unlocked: (s) => s.totalSetorKg >= 100 && s.jumlahBelanja >= 1 && s.jumlahLaporan >= 1 },
];

export type EvaluatedAchievement = Achievement & { done: boolean };

/** Evaluasi + urutkan: yang sudah tercapai di depan. */
export function evaluate(stats: Stats): EvaluatedAchievement[] {
  return ACHIEVEMENTS
    .map((a) => ({ ...a, done: a.unlocked(stats) }))
    .sort((a, b) => Number(b.done) - Number(a.done));
}
