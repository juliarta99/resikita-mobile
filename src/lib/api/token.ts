import { storage } from "@/lib/storage";

/**
 * Kunci penyimpanan token Sanctum.
 *
 * Namanya dipertahankan dari versi sebelumnya supaya pengguna yang memperbarui
 * aplikasi tidak terlempar keluar — token lama tetap ditemukan di tempatnya.
 */
const TOKEN_KEY = "nr_token";

export const tokenStore = {
  get: () => storage.get(TOKEN_KEY),
  set: (token: string) => storage.set(TOKEN_KEY, token),
  clear: () => storage.remove(TOKEN_KEY),
};
