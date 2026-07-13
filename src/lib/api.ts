import axios from "axios";
import { storage } from "./storage";

const TOKEN_KEY = "nr_token";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { Accept: "application/json" },
  timeout: 30000,
});

// Sisipkan Bearer token pada setiap request
api.interceptors.request.use(async (config) => {
  const token = await storage.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token helpers
export const tokenStore = {
  get: () => storage.get(TOKEN_KEY),
  set: (t: string) => storage.set(TOKEN_KEY, t),
  clear: () => storage.remove(TOKEN_KEY),
};

// ---- Endpoint helpers (cocok dengan backend /api/v1) ----
// Auth
export const register = (body: {
  name: string;
  nik: string;
  tanggal_lahir: string;
  jenis_kelamin: "L" | "P";
  phone: string;
  password: string;
}) => api.post("/register", body).then((r) => r.data);

export const verifyRegister = (phone: string, kode: string) =>
  api.post("/register/verify", { phone, kode }).then((r) => r.data);

export const resendOtp = (phone: string) =>
  api.post("/register/resend", { phone }).then((r) => r.data);

export const login = (identifier: string, password: string) =>
  api.post("/login", { identifier, password }).then((r) => r.data);

export const getMe = () => api.get("/me").then((r) => r.data.data);
export const logout = () => api.post("/logout").then((r) => r.data);

// Contoh fitur
export const getSaldo = () =>
  api.get("/saldo").then((r) => r.data.data.saldo as number);
export const getProduk = (params?: Record<string, any>) =>
  api.get("/produk", { params }).then((r) => r.data);
export const getArtikel = (params?: Record<string, any>) =>
  api.get("/artikel", { params }).then((r) => r.data);
export const chat = (
  pesan: string,
  opts: {
    conversation_id?: number | null;
    riwayat?: { role: "user" | "model"; text: string }[];
  } = {},
) =>
  api
    .post("/chatbot", {
      pesan,
      conversation_id: opts.conversation_id ?? undefined,
      riwayat: opts.riwayat,
    })
    .then((r) => r.data.data);

// Klasifikasi (multipart)
export const klasifikasi = (uri: string) => {
  const form = new FormData();
  form.append("gambar", { uri, name: "foto.jpg", type: "image/jpeg" } as any);
  return api.post("/klasifikasi", form).then((r) => r.data.data);
};

// Direktori terdekat
export const direktori = (
  jenis: "tps" | "bank-sampah" | "umkm",
  near?: { lat: number; lng: number },
) =>
  api
    .get(`/direktori/${jenis}`, {
      params: near ? { near_lat: near.lat, near_lng: near.lng } : undefined,
    })
    .then((r) => r.data.data);

// ---- Peta GIS: detail & aksi ----
type NearPt = { lat: number; lng: number };
const nearParams = (n?: NearPt) =>
  n ? { near_lat: n.lat, near_lng: n.lng } : undefined;

export const getTpsDetail = (id: number | string, near?: NearPt) =>
  api
    .get(`/direktori/tps/${id}`, { params: nearParams(near) })
    .then((r) => r.data.data);
export const getBankSampahDetail = (id: number | string, near?: NearPt) =>
  api
    .get(`/direktori/bank-sampah/${id}`, { params: nearParams(near) })
    .then((r) => r.data.data);
export const gabungTps = (id: number | string) =>
  api.post(`/direktori/tps/${id}/gabung`).then((r) => r.data);
export const getPetaLaporan = (near?: NearPt) =>
  api
    .get("/peta/laporan", { params: nearParams(near) })
    .then((r) => r.data.data);

// ---- Laporan ----
export const getLaporanKategori = () =>
  api.get("/laporan/kategori").then((r) => r.data.data);
export const getLaporan = (params?: Record<string, any>) =>
  api.get("/laporan", { params }).then((r) => r.data);
export const getLaporanDetail = (id: number | string) =>
  api.get(`/laporan/${id}`).then((r) => r.data.data);
export const buatLaporan = (form: FormData) =>
  api.post("/laporan", form).then((r) => r.data);
export const hapusLaporan = (id: number | string) =>
  api.delete(`/laporan/${id}`).then((r) => r.data);
export const getTpsSaya = () =>
  api.get("/direktori/tps-saya").then((r) => r.data.data);

// ---- Chatbot: riwayat server-side ----
export const getChatRiwayat = () =>
  api.get("/chatbot/riwayat").then((r) => r.data.data);
export const getChatDetail = (id: number | string) =>
  api.get(`/chatbot/riwayat/${id}`).then((r) => r.data.data);
export const hapusChat = (id: number | string) =>
  api.delete(`/chatbot/riwayat/${id}`).then((r) => r.data);
export const gantiJudulChat = (id: number | string, judul: string) =>
  api
    .patch(`/chatbot/riwayat/${id}`, { title: judul })
    .then((r) => r.data.data);

// ---- Klasifikasi: riwayat ----
export const getKlasifikasiRiwayat = (params?: Record<string, any>) =>
  api.get("/klasifikasi", { params }).then((r) => r.data.data);
export const getKlasifikasiDetail = (id: number | string) =>
  api.get(`/klasifikasi/${id}`).then((r) => r.data.data);
export const hapusKlasifikasi = (id: number | string) =>
  api.delete(`/klasifikasi/${id}`).then((r) => r.data);

// ---- Edukasi ----
export const getArtikelDetail = (slug: string) =>
  api.get(`/artikel/${slug}`).then((r) => r.data.data);

// ---- Untuk pencapaian & ringkasan beranda ----
export const getSetoran = () => api.get("/setoran").then((r) => r.data);
export const getPesanan = (params?: Record<string, any>) =>
  api.get("/pesanan", { params }).then((r) => r.data);

// ---- Bank Sampah Digital (dompet) ----
export const getDompet = () => api.get("/saldo").then((r) => r.data.data);
export const getHargaSampah = () =>
  api.get("/harga-sampah", { params: { grouped: 1 } }).then((r) => r.data.data);
export const getTransaksi = () => api.get("/transaksi").then((r) => r.data);
export const getPenarikan = () => api.get("/penarikan").then((r) => r.data);
export const ajukanPenarikan = (body: {
  jumlah: number;
  nama_bank: string;
  no_rekening: string;
  atas_nama: string;
}) => api.post("/penarikan", body).then((r) => r.data);

// ---- Profil ----
export const updateProfil = (body: {
  name?: string;
  tanggal_lahir?: string | null;
  jenis_kelamin?: "L" | "P" | null;
}) => api.put("/profil", body).then((r) => r.data);
export const updatePassword = (body: {
  password_lama: string;
  password: string;
  password_confirmation: string;
}) => api.put("/profil/password", body).then((r) => r.data);
