/**
 * Mengubah string menjadi format Title / Proper Case
 */
export function toProperCase(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/(?:^|\s|-|\/)\w/g, (match) => match.toUpperCase());
}

/**
 * Memeriksa apakah data PO termasuk PO Percepatan
 */
export function isPoPercepatan(po) {
  if (!po) return false;
  if (typeof po === 'string') return /percepatan/i.test(po);
  const tahap = po.tahapPembangunan || po.tahap_pembangunan || po.tahap || '';
  const namaPo = po.namaPo || po.nama_po || po.noPo || po.no_po || '';
  const kategori = po.kategori || po.jenis || '';
  return (
    /percepatan/i.test(tahap) ||
    /percepatan/i.test(namaPo) ||
    /percepatan/i.test(kategori) ||
    Boolean(po.isPerc || po.is_percepatan)
  );
}

