/**
 * Ubah markdown artikel menjadi HTML sederhana.
 *
 * Kenapa ini ada: `GET /artikel/{slug}` mengirim `konten` dalam markdown,
 * sementara komponen `RichContent` di aplikasi ini merender HTML
 * (`react-native-render-html`). Tanpa penerjemah, pembaca melihat pagar dan
 * bintang mentah di layar.
 *
 * **Ini penerjemah subset, bukan parser markdown lengkap.** Ia menangani apa
 * yang benar-benar dipakai artikel edukasi: judul, tebal, miring, daftar,
 * kutipan, tautan, gambar, dan paragraf. Sintaks di luar itu — tabel, blok
 * kode berpagar, footnote — dibiarkan apa adanya.
 *
 * Alternatif yang lebih baik ada dua, keduanya di luar kendali klien:
 * peladen mengirim HTML seperti yang sudah dilakukannya untuk `teks_baca`,
 * atau proyek ini menambah dependensi parser markdown. Lihat catatan T17.
 */

/** Lolos karakter HTML supaya isi artikel tidak bisa menyuntikkan markup. */
function lolos(teks: string): string {
  return teks
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Terjemahkan penanda dalam satu baris: gambar, tautan, tebal, miring, kode. */
function baris(teks: string): string {
  return (
    lolos(teks)
      // Gambar harus lebih dulu dari tautan — sintaksnya hanya beda tanda seru.
      .replace(
        /!\[([^\]]*)\]\(([^)\s]+)\)/g,
        '<img src="$2" alt="$1" />',
      )
      .replace(
        /\[([^\]]+)\]\(([^)\s]+)\)/g,
        '<a href="$2">$1</a>',
      )
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
  );
}

export function markdownKeHtml(markdown: string): string {
  if (!markdown?.trim()) return "";

  const keluaran: string[] = [];
  let daftarTerbuka: "ul" | "ol" | null = null;

  const tutupDaftar = () => {
    if (daftarTerbuka) {
      keluaran.push(`</${daftarTerbuka}>`);
      daftarTerbuka = null;
    }
  };

  for (const mentah of markdown.split(/\r?\n/)) {
    const teks = mentah.trim();

    if (!teks) {
      tutupDaftar();
      continue;
    }

    const judul = /^(#{1,6})\s+(.*)$/.exec(teks);
    if (judul) {
      tutupDaftar();
      // Judul markdown mulai dari h1, tapi judul artikel sudah dirender layar
      // sebagai h1. Digeser satu tingkat supaya hierarki heading tetap benar
      // untuk pembaca layar.
      const tingkat = Math.min(judul[1].length + 1, 6);
      keluaran.push(`<h${tingkat}>${baris(judul[2])}</h${tingkat}>`);
      continue;
    }

    const kutipan = /^>\s?(.*)$/.exec(teks);
    if (kutipan) {
      tutupDaftar();
      keluaran.push(`<blockquote>${baris(kutipan[1])}</blockquote>`);
      continue;
    }

    const takBerurut = /^[-*+]\s+(.*)$/.exec(teks);
    if (takBerurut) {
      if (daftarTerbuka !== "ul") {
        tutupDaftar();
        keluaran.push("<ul>");
        daftarTerbuka = "ul";
      }
      keluaran.push(`<li>${baris(takBerurut[1])}</li>`);
      continue;
    }

    const berurut = /^\d+[.)]\s+(.*)$/.exec(teks);
    if (berurut) {
      if (daftarTerbuka !== "ol") {
        tutupDaftar();
        keluaran.push("<ol>");
        daftarTerbuka = "ol";
      }
      keluaran.push(`<li>${baris(berurut[1])}</li>`);
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(teks)) {
      tutupDaftar();
      keluaran.push("<hr />");
      continue;
    }

    tutupDaftar();
    keluaran.push(`<p>${baris(teks)}</p>`);
  }

  tutupDaftar();
  return keluaran.join("\n");
}
