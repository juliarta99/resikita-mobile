import { Redirect } from "expo-router";

import Splash from "@/components/Splash";
import { useAuth } from "@/context/AuthContext";

/**
 * Satu-satunya tempat yang memutuskan pengguna mendarat di mana.
 *
 * Akun petugas dan akun warga terpisah: seseorang masuk sebagai warga untuk
 * menyetor dan berbelanja, dan masuk dengan akun petugasnya untuk bekerja.
 * Karena itu peran menentukan seluruh pengalaman aplikasi, bukan sekadar
 * memunculkan satu menu tambahan, petugas yang membuka aplikasi seharusnya
 * langsung melihat penugasannya, bukan saldo dan katalog produk.
 *
 * Logikanya sengaja dipusatkan di sini. Layar masuk cukup mengarahkan ke `/`
 * dan tidak perlu tahu apa-apa tentang peran.
 */
export default function Index() {
  const { user, loading, punyaRole } = useAuth();

  if (loading) return <Splash />;
  if (user && punyaRole("petugas")) return <Redirect href="/petugas" />;
  return <Redirect href="/beranda" />;
}
