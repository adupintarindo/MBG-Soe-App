// Fallback komoditas per supplier untuk mode demo / DB yang belum di-seed lengkap.
// Dipakai ketika suppliers.commodity kosong/null. Disesuaikan dengan peran
// masing-masing supplier di rantai MBG Soe (beras BUMN, ikan PT, sayur koperasi,
// bumbu kering toko, dst).

const BY_ID: Record<string, string> = {
  // ===== HTML / legacy catalog =====
  "SUP-01": "Beras premium, beras medium, gula pasir",
  "SUP-02": "Beras premium, beras medium",
  "SUP-03": "Daging ayam, telur ayam, daging sapi",
  "SUP-04": "Ikan tuna, ikan tongkol, ikan kembung",
  "SUP-05": "Tempe, tahu, sayur mayur (bayam, kangkung, buncis, wortel)",
  "SUP-06": "Bumbu segar (bawang merah, bawang putih, cabai, tomat)",
  "SUP-07": "Buah segar (pisang, jeruk, pepaya, semangka)",
  "SUP-08": "Susu UHT, susu segar",
  "SUP-09": "Minyak goreng, gula, garam",
  "SUP-10": "Telur ayam, telur puyuh",
  "SUP-R1": "Telur ayam, ayam beku, bumbu kering",
  "SUP-R2": "Bumbu kering, minyak goreng",

  // ===== Excel costing master (SUP-E01..E17) =====
  "SUP-E01": "Beras premium",
  "SUP-E02": "Sayur mayur, bumbu segar",
  "SUP-E03": "Bumbu kering, beras, garam, minyak goreng, telur, ayam beku",
  "SUP-E04": "Bumbu kering, minyak goreng",
  "SUP-E05": "Buah segar (pisang, jeruk, pepaya)",
  "SUP-E06": "Susu UHT, susu segar",
  "SUP-E07": "Tempe, tahu",
  "SUP-E08": "Sayur hijau (bayam, kangkung, sawi)",
  "SUP-E09": "Ikan tuna, ikan tongkol",
  "SUP-E10": "Daging ayam potong, karkas ayam",
  "SUP-E11": "Telur ayam ras",
  "SUP-E12": "Bumbu segar (bawang, cabai, tomat)",
  "SUP-E13": "Wortel, buncis, kentang",
  "SUP-E14": "Gula pasir, tepung terigu",
  "SUP-E15": "Minyak goreng, margarin",
  "SUP-E16": "Garam, kecap, saos",
  "SUP-E17": "Buah musiman (pisang, jeruk)"
};

const BY_TYPE: Record<string, string> = {
  BUMN: "Beras premium, gula pasir, minyak goreng",
  PT: "Protein hewani (ikan/daging/ayam)",
  CV: "Protein hewani & sayur mayur",
  UD: "Beras, sembako dasar",
  KOPERASI: "Tempe, tahu, sayur mayur, bumbu segar",
  POKTAN: "Sayur mayur lokal, bumbu segar",
  TOKO: "Bumbu kering, sembako, telur, ayam beku",
  KIOS: "Bumbu kering, minyak goreng, gula",
  INFORMAL: "Sayur/buah pasar tradisional"
};

export function resolveSupplierCommodity(
  id: string,
  type: string,
  current: string | null
): string | null {
  const trimmed = current?.trim();
  if (trimmed && trimmed !== "—" && trimmed !== "-") return trimmed;
  if (BY_ID[id]) return BY_ID[id];
  if (BY_TYPE[type]) return BY_TYPE[type];
  return null;
}
