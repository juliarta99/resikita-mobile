export function youTubeId(url: string): string | null {
  const m = url?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  return m ? m[1] : null;
}
export function toEmbed(url: string): string | null {
  const id = youTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

const iframeTag = (src: string) =>
  `<iframe src="${src}" width="100%" height="200" frameborder="0" allowfullscreen></iframe>`;

/** Ubah link/URL YouTube di dalam HTML menjadi <iframe> agar ter-embed. */
export function embedYouTubeInHtml(html: string): string {
  if (!html) return "";
  // 1) <a href="...youtube...">...</a>
  html = html.replace(
    /<a[^>]*href=["']([^"']*(?:youtu\.be|youtube\.com)[^"']*)["'][^>]*>.*?<\/a>/gi,
    (mm, href) => (toEmbed(href) ? iframeTag(toEmbed(href)!) : mm),
  );
  // 2) URL telanjang (watch / shorts / youtu.be)
  html = html.replace(
    /(^|\s|>)(https?:\/\/(?:www\.)?(?:youtu\.be\/[\w-]{11}|youtube\.com\/watch\?v=[\w-]{11}|youtube\.com\/shorts\/[\w-]{11}))(?=\s|<|$)/gi,
    (mm, pre, url) => (toEmbed(url) ? pre + iframeTag(toEmbed(url)!) : mm),
  );
  return html;
}
