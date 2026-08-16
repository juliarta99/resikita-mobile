import { useQuery } from "@tanstack/react-query";
import * as Device from "expo-device";
import React, { createContext, useContext, useEffect } from "react";
import { Platform } from "react-native";

import {
  daftar as apiDaftar,
  keluar as apiKeluar,
  masuk as apiMasuk,
  profilSaya,
} from "@/lib/api/auth";
import { tokenStore } from "@/lib/api/token";
import { cabutPush, daftarkanPush } from "@/lib/push";
import { queryClient } from "@/lib/queryClient";
import type { HasilAuth, PayloadDaftar, User } from "@/types/auth";

export const KUNCI_PROFIL = ["auth", "me"] as const;

type AuthCtx = {
  user: User | null;
  /** Sedang memastikan apakah ada sesi yang tersimpan. */
  loading: boolean;
  masuk: (email: string, password: string) => Promise<void>;
  daftar: (payload: PayloadDaftar) => Promise<void>;
  keluar: () => Promise<void>;
  /** Muat ulang profil, mis. setelah wilayah atau avatar berubah. */
  refresh: () => Promise<void>;
  /**
   * `true` bila role utama pengguna sama dengan yang ditanyakan.
   *
   * Peladen mengirim **satu** `role`, bukan larik — versi sebelumnya membaca
   * `user.roles` yang tidak pernah ada, sehingga area petugas tidak pernah
   * muncul untuk siapa pun.
   */
  punyaRole: (role: string) => boolean;
  /**
   * `true` bila pengguna memegang sebuah permission.
   *
   * **Inilah dasar menyusun menu** (§2.7), bukan daftar role yang ditulis ulang
   * di klien. Role bisa bertambah di peladen tanpa aplikasi ini tahu; permission
   * yang menjaga endpoint-nya tidak.
   */
  punyaIzin: (izin: string) => boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Tanpa lemparan ini, komponen di luar provider hanya menerima `null` dan
    // gagal jauh kemudian dengan pesan yang tidak menunjuk penyebabnya.
    throw new Error("useAuth dipakai di luar AuthProvider.");
  }
  return ctx;
}

/**
 * Nama perangkat yang ikut tercatat pada token Sanctum.
 *
 * Berguna saat pengguna ingin mengenali sesi miliknya di daftar perangkat.
 * `Device.deviceName` kosong di web dan pada sebagian emulator, jadi selalu ada
 * cadangan — tanpa itu peladen memakai label seragam `mobile` untuk semua sesi.
 */
function namaPerangkat(): string {
  return Device.deviceName?.trim() || `Resikita ${Platform.OS}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  /**
   * Profil disimpan di TanStack Query, bukan `useState`.
   *
   * Dua alasan. Pertama, aturan emas nomor 1: seluruh state peladen lewat
   * Query. Kedua, dan lebih praktis: penanganan 401 di `lib/api/client.ts`
   * memanggil `queryClient.clear()`. Selama profil disimpan di state React, ia
   * selamat dari pembersihan itu, dan nama pengguna sebelumnya masih terpampang
   * setelah sesinya dicabut.
   */
  const q = useQuery({
    queryKey: KUNCI_PROFIL,
    queryFn: async (): Promise<User | null> => {
      // Token diperiksa di dalam queryFn, bukan lewat `enabled`, supaya
      // pemuatan ulang setelah 401 berhenti di sini alih-alih menabrak peladen
      // lagi dengan token yang baru saja dibuang.
      const token = await tokenStore.get();
      if (!token) return null;
      return profilSaya();
    },
    retry: false,
    staleTime: 5 * 60_000,
  });

  /**
   * Daftarkan ulang perangkat pada setiap pembukaan aplikasi oleh pengguna
   * yang sesinya masih tersimpan.
   *
   * Token push bisa berubah — sistem operasi memutarnya saat aplikasi dipasang
   * ulang, data dibersihkan, atau setelah jeda panjang. Mendaftarkannya hanya
   * saat proses masuk berarti pengguna yang tidak pernah keluar lama-lama
   * berhenti menerima notifikasi tanpa pernah tahu sebabnya. Pemanggilan ini
   * murah karena `daftarkanPush` diam bila tokennya tidak berubah.
   */
  const idPengguna = q.data?.id;
  useEffect(() => {
    if (idPengguna) void daftarkanPush();
  }, [idPengguna]);

  const simpanSesi = async (hasil: HasilAuth) => {
    await tokenStore.set(hasil.token);
    queryClient.setQueryData<User>(KUNCI_PROFIL, hasil.user);
    // Dijalankan tanpa ditunggu: pendaftaran push melibatkan dialog izin dan
    // panggilan jaringan, dan menahan proses masuk sampai keduanya selesai
    // membuat aplikasi terasa menggantung setelah pengguna menekan "Masuk".
    void daftarkanPush();
  };

  const value: AuthCtx = {
    user: q.data ?? null,
    loading: q.isLoading,

    masuk: async (email, password) => {
      const hasil = await apiMasuk({
        email: email.trim(),
        password,
        nama_perangkat: namaPerangkat(),
      });
      await simpanSesi(hasil);
    },

    daftar: async (payload) => {
      const hasil = await apiDaftar({
        nama_perangkat: namaPerangkat(),
        ...payload,
      });
      await simpanSesi(hasil);
    },

    keluar: async () => {
      // Perangkat dicabut lebih dulu, selagi token Sanctum masih berlaku —
      // setelah `apiKeluar()` permintaan apa pun akan ditolak 401.
      await cabutPush();
      try {
        await apiKeluar();
      } catch {
        // Token mungkin sudah dicabut peladen. Pengguna tetap harus keluar dari
        // sisi perangkat, jadi kegagalan ini tidak boleh menghentikan apa pun.
      }
      await tokenStore.clear();
      queryClient.clear();
    },

    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: KUNCI_PROFIL });
    },

    punyaRole: (role) => q.data?.role === role,

    punyaIzin: (izin) => !!q.data?.permissions?.includes(izin),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
