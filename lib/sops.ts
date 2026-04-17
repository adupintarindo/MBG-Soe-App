// SOP Master · 20 SOP (11 operasional + 9 higiene) untuk SPPG Nunumeu
// Source: HTML prototype Dashboard_SupplyChain_MBG_Soe.html (SOPS array)

export interface SOP {
  id: string;
  title: string;
  category: "OPERASIONAL" | "HIGIENE";
  scope: string;
  steps: string[];
  risks: string[];
  ref: string;
}

export const SOPS: SOP[] = [
  // ========= OPERASIONAL (11) =========
  {
    id: "SOP-OP-01",
    category: "OPERASIONAL",
    title: "Penerimaan Bahan Baku (GRN)",
    scope:
      "Berlaku untuk semua bahan baku yang datang dari supplier ke gudang SPPG.",
    steps: [
      "Verifikasi surat jalan dan PO referensi.",
      "Timbang ulang menggunakan timbangan terkalibrasi.",
      "Cek kualitas visual: warna, bau, tekstur, kemasan utuh.",
      "Catat hasil QC di form GRN dan unggah foto bukti terima.",
      "Update GRN status: OK / Partial / Rejected di sistem.",
      "Bahan masuk ke gudang sesuai kategori (dry, chilled, frozen)."
    ],
    risks: [
      "Bahan rusak/busuk lolos QC → kontaminasi.",
      "Berat tidak sesuai PO → pengadaan tidak akurat."
    ],
    ref: "ISO 22000 clause 8.5.2 · BPOM No. 11/2019"
  },
  {
    id: "SOP-OP-02",
    category: "OPERASIONAL",
    title: "Penyimpanan Stok Gudang",
    scope: "Pengelolaan stok bahan baku setelah GRN OK.",
    steps: [
      "Beras & sembako → rak FIFO tinggi ≥15 cm dari lantai.",
      "Sayur hijau & buah → chiller 4-8°C.",
      "Ikan & daging → freezer -18°C atau di bawah.",
      "Tahu/tempe → chiller, maks 2 hari.",
      "Bumbu kering → rak tertutup, kering, sejuk.",
      "Label: nama, tanggal terima, tanggal expired."
    ],
    risks: ["Cross-contamination", "Pertumbuhan bakteri cepat"],
    ref: "CODEX CAC/RCP 1-1969 · Permenkes 1096/2011"
  },
  {
    id: "SOP-OP-03",
    category: "OPERASIONAL",
    title: "Perencanaan Menu & BOM",
    scope:
      "Penetapan menu harian dan perhitungan kebutuhan bahan (Bill of Materials).",
    steps: [
      "Ahli gizi review siklus 14 hari dan variasi protein.",
      "Input BOM per porsi ke sistem (gram/porsi).",
      "Sistem hitung kebutuhan = porsi efektif × BOM.",
      "Verifikasi ketersediaan stok vs kebutuhan.",
      "Generate PO jika shortage > 0 atau stock cover < 3 hari."
    ],
    risks: [
      "Menu tidak memenuhi AKG",
      "Overstock/understock karena BOM tidak akurat"
    ],
    ref: "PMK No. 41/2014 · AKG Permenkes 28/2019"
  },
  {
    id: "SOP-OP-04",
    category: "OPERASIONAL",
    title: "Penerbitan Purchase Order (PO)",
    scope: "Proses order ke supplier berdasarkan kebutuhan planning.",
    steps: [
      "Hitung kebutuhan bersih = requirement − on-hand − safety stock.",
      "Pilih supplier berdasar Vendor Matrix (skor ≥ 70).",
      "Buat PO draft: items, qty, price, delivery date.",
      "Review dan approval oleh Kepala SPPG.",
      "Kirim PO ke supplier via email/WA.",
      "Update status PO: draft → sent → confirmed."
    ],
    risks: ["PO tidak sampai supplier", "Harga tidak sesuai kontrak LTA"],
    ref: "Perpres 16/2018 · LTA Vendor SPPG"
  },
  {
    id: "SOP-OP-05",
    category: "OPERASIONAL",
    title: "Perhitungan Porsi Efektif",
    scope: "Rumus baku konversi siswa → porsi efektif per hari.",
    steps: [
      "Identifikasi jenjang per sekolah (PAUD, SD kelas 1-3, SD kelas 4-6, SMP+).",
      "Hitung porsi kecil = PAUD + SD kelas 1-3.",
      "Hitung porsi besar = SD kelas 4-6 + SMP + SMA + SMK.",
      "Tambah porsi guru (weight 1.0).",
      "Porsi efektif = (kecil × 0.7) + (besar × 1.0) + (guru × 1.0).",
      "Cek kalender: hari libur & UAS → non-operasional."
    ],
    risks: ["Over-serving / under-serving"],
    ref: "PMK 28/2019 AKG · SPPG Nunumeu SOP Internal"
  },
  {
    id: "SOP-OP-06",
    category: "OPERASIONAL",
    title: "Pembuatan Berita Acara GRN",
    scope: "Dokumentasi terima bahan yang sah dan auditable.",
    steps: [
      "Cocokkan qty PO vs qty fisik terima.",
      "Catat selisih, kerusakan, dan alasan penolakan.",
      "Tanda tangan basah: supplier, operator, kepala SPPG.",
      "Foto bukti: bahan, timbangan, dokumen.",
      "Upload ke sistem, link ke PO."
    ],
    risks: ["Berita acara tidak lengkap → tidak auditable"],
    ref: "BPKP Pedoman Barang Dagangan · SPPG Audit"
  },
  {
    id: "SOP-OP-07",
    category: "OPERASIONAL",
    title: "Pengelolaan Invoice & Pembayaran",
    scope: "Alur invoice dari supplier ke pembayaran.",
    steps: [
      "Terima invoice dari supplier (email/fisik).",
      "Cocokkan: invoice vs PO vs GRN (3-way match).",
      "Verifikasi harga sesuai LTA/kontrak.",
      "Input invoice ke sistem, status = issued.",
      "Proses pembayaran sesuai TOP (term of payment).",
      "Update status invoice = paid setelah transfer."
    ],
    risks: ["Double payment", "Pembayaran untuk PO belum GRN"],
    ref: "PSAK 14 Persediaan · Perpres 16/2018"
  },
  {
    id: "SOP-OP-08",
    category: "OPERASIONAL",
    title: "Distribusi Menu ke Sekolah",
    scope: "Pengiriman makanan dari SPPG ke 9 sekolah penerima.",
    steps: [
      "Porsi matang dikemas per sekolah sesuai daftar porsi.",
      "Termos & food grade container, segel tamper-evident.",
      "Pengemudi catat suhu keberangkatan (≥60°C panas, ≤5°C dingin).",
      "Rute prioritas: sekolah terjauh dulu (Oeklani 3.6km).",
      "Serah terima di sekolah: PIC sekolah tanda tangan + foto.",
      "Kembali ke SPPG: wash container, lapor anomali."
    ],
    risks: ["Zona bahaya suhu 5-60°C > 2 jam", "Container kontaminasi silang"],
    ref: "FDA Food Code 3-501 · BPOM Distribusi"
  },
  {
    id: "SOP-OP-09",
    category: "OPERASIONAL",
    title: "Pelaporan Harian & Traceability",
    scope: "Laporan operasional harian untuk WFP × IFSR × FFI.",
    steps: [
      "Update transaction ledger (PO/GRN/invoice/payment).",
      "Foto dokumentasi setiap pergerakan kunci.",
      "Sinkronisasi stok: opening + moves = closing.",
      "Kirim rekap harian ke WFP PIC via dashboard.",
      "Anomali (shortage, reject, late delivery) → flag merah."
    ],
    risks: ["Kehilangan audit trail", "Data tidak sinkron"],
    ref: "ISO 22005 Traceability · WFP M&E Guidelines"
  },
  {
    id: "SOP-OP-10",
    category: "OPERASIONAL",
    title: "Adjustment Stok & Waste Handling",
    scope: "Koreksi stok karena kerusakan, susut, atau hilang.",
    steps: [
      "Identifikasi penyebab: damage, expired, theft, measurement.",
      "Hitung selisih fisik vs sistem.",
      "Stock move reason = adjustment/waste, foto + note.",
      "Approval Kepala SPPG untuk adjustment > 5% nilai.",
      "Waste disposal: organik → kompos, non-organik → TPS.",
      "Laporan waste bulanan ke FFI (target < 3%)."
    ],
    risks: ["Penyalahgunaan kategori waste", "Waste > 3% = tidak ekonomis"],
    ref: "EPA Food Recovery Hierarchy · FFI Loss & Waste Target"
  },
  {
    id: "SOP-OP-11",
    category: "OPERASIONAL",
    title: "Audit Internal Supply Chain",
    scope: "Review kuartalan semua proses supply chain SPPG.",
    steps: [
      "Sampling random 10% PO, GRN, invoice.",
      "Verifikasi 3-way match dan kelengkapan dokumen.",
      "Spot check fisik stok vs sistem (2% SKU).",
      "Review Vendor Matrix update skor supplier.",
      "Temuan → CAPA (corrective & preventive action) plan.",
      "Laporan audit ke Steering Committee."
    ],
    risks: ["Temuan tidak ditindaklanjuti", "Score supplier outdated"],
    ref: "ISO 19011 Audit · BPKP Penyusunan Laporan"
  },

  // ========= HIGIENE (9) =========
  {
    id: "SOP-HG-01",
    category: "HIGIENE",
    title: "Higiene Personal (Food Handler)",
    scope: "Semua personel yang kontak dengan bahan pangan.",
    steps: [
      "Medical check-up 2× setahun, bebas TBC/Hepatitis.",
      "Cuci tangan dengan sabun selama 20 detik sebelum masuk kitchen.",
      "Wajib pakai: apron, hairnet, masker, sarung tangan.",
      "Tidak boleh pakai perhiasan, kuku pendek, tidak sakit.",
      "Jika batuk/pilek/luka → istirahat dari kitchen.",
      "Toilet: cuci tangan wajib sebelum kembali masuk."
    ],
    risks: ["Pathogen dari handler", "Cross-contamination"],
    ref: "WHO Golden Rules · Permenkes 1096/2011"
  },
  {
    id: "SOP-HG-02",
    category: "HIGIENE",
    title: "Sanitasi Peralatan Dapur",
    scope: "Pembersihan alat masak, peralatan makan, permukaan kerja.",
    steps: [
      "Pre-rinse: buang sisa makanan, rendam air.",
      "Wash: sabun food-grade, air hangat 40-50°C, sikat.",
      "Rinse: air bersih mengalir.",
      "Sanitize: klorin 100 ppm 1 menit atau air 82°C 30 detik.",
      "Air dry: di rak terbalik, tidak dilap kain.",
      "Simpan di area bersih tertutup."
    ],
    risks: ["Residu sabun/klorin", "Bakteri menempel"],
    ref: "CODEX CAC/RCP 1-1969 rev.4 · BPOM Sanitasi"
  },
  {
    id: "SOP-HG-03",
    category: "HIGIENE",
    title: "Pest Control Gudang & Kitchen",
    scope: "Pencegahan dan pengendalian hama.",
    steps: [
      "Inspeksi harian: jejak tikus, kotoran, gigitan kemasan.",
      "Kontrak pest control berlisensi, frekuensi 1× bulan.",
      "Perangkap lem tikus di perimeter gudang (mapping log).",
      "Light trap lalat di pintu masuk kitchen.",
      "Tidak boleh racun rodentisida di area food zone.",
      "Log pest activity → review bulanan."
    ],
    risks: ["Kontaminasi feses tikus", "Larva serangga"],
    ref: "IPM · BPOM Higiene · WHO Pest Control"
  },
  {
    id: "SOP-HG-04",
    category: "HIGIENE",
    title: "Pengelolaan Sampah Organik & Non-Organik",
    scope: "Pemilahan dan pembuangan sampah dapur.",
    steps: [
      "Pilah: organik (sisa sayur/buah), non-organik (plastik, kertas).",
      "Tempat sampah tertutup, diinjak-buka, liner plastik.",
      "Angkut keluar kitchen sebelum penuh (max 2/3).",
      "Organik → kompos di belakang SPPG.",
      "Non-organik → TPS eksternal, 2× minggu.",
      "Disinfeksi tempat sampah 1× minggu."
    ],
    risks: ["Bau, lalat, tikus"],
    ref: "Permenkes 492/2010 · IPM Waste"
  },
  {
    id: "SOP-HG-05",
    category: "HIGIENE",
    title: "Kontrol Suhu Makanan (Danger Zone)",
    scope:
      "Menjaga makanan tetap keluar dari zona 5-60°C (danger zone) sepanjang rantai.",
    steps: [
      "Cek suhu freezer ≤ -18°C, chiller 4-8°C, hot holding ≥ 63°C.",
      "Makanan matang panas: sajikan dalam 2 jam atau holding 63°C+.",
      "Cooling: dari 60°C ke 21°C dalam 2 jam, 21°C ke 5°C dalam 4 jam.",
      "Reheat: capai 75°C core temp minimal 15 detik.",
      "Log temperatur tiap 2 jam di form harian.",
      "Alarm freezer/chiller jika gagal dinginkan."
    ],
    risks: ["Pertumbuhan Salmonella, E.coli, Listeria"],
    ref: "HACCP · FDA Food Code 3-401 · Permenkes 1096/2011"
  },
  {
    id: "SOP-HG-06",
    category: "HIGIENE",
    title: "Pemeriksaan Kualitas Bahan Harian",
    scope: "QC bahan segar & sensitif sebelum masuk produksi.",
    steps: [
      "Ayam segar: warna merah muda, bau netral, tidak berlendir.",
      "Ikan: mata jernih, insang merah, daging elastis.",
      "Telur: uji apung, cangkang utuh, tidak retak.",
      "Sayur: daun segar, tidak layu/busuk, tidak ada serangga.",
      "Tahu/tempe: tidak berlendir, tidak asam, warna putih segar.",
      "Beras: kering, tidak berkutu, tidak apek."
    ],
    risks: ["Bahan tidak layak konsumsi masuk produksi"],
    ref: "BPOM Panduan QC · SNI Pangan"
  },
  {
    id: "SOP-HG-07",
    category: "HIGIENE",
    title: "Kebersihan Area Kitchen & Gudang",
    scope: "Schedule cleaning harian/mingguan/bulanan.",
    steps: [
      "Harian: lantai, meja prep, permukaan kontak, cuci piring.",
      "Harian: tempat sampah kosongkan, pintu handle disanitasi.",
      "Mingguan: dinding, exhaust, ventilasi, freezer/chiller dalam.",
      "Bulanan: plafon, lampu, rak gudang, pest control audit.",
      "Master cleaning schedule & checklist sign-off.",
      "Deep cleaning kuartalan oleh tim eksternal."
    ],
    risks: ["Biofilm bakteri", "Grease fire"],
    ref: "Cleaning Schedule CODEX · BPOM Sanitasi"
  },
  {
    id: "SOP-HG-08",
    category: "HIGIENE",
    title: "Penanganan Alergen & Label Khusus",
    scope: "Identifikasi alergen dan pemisahan produksi.",
    steps: [
      "Identifikasi alergen utama: gluten, susu, telur, kacang tanah, kedelai, ikan, kerang, biji-bijian.",
      "Bahan alergen disimpan terpisah dengan label merah.",
      "Produksi menu alergen: sequencing terakhir atau alat khusus.",
      "Cleaning wajib setelah handle alergen.",
      "Label menu sekolah: indikasi alergen untuk siswa sensitif.",
      "Training tahunan food handler tentang alergen."
    ],
    risks: ["Anafilaksis pada siswa alergi"],
    ref: "FSANZ Allergen · BPOM Label Pangan"
  },
  {
    id: "SOP-HG-09",
    category: "HIGIENE",
    title: "Incident Response · Foodborne Illness",
    scope: "Protokol jika ada laporan keracunan/sakit setelah konsumsi MBG.",
    steps: [
      "Stop distribusi batch terkait, karantina sisa makanan.",
      "Kumpulkan info: jumlah kasus, gejala, menu, waktu konsumsi.",
      "Hubungi Puskesmas / Dinkes dalam 4 jam.",
      "Serahkan sampel makanan & bahan baku untuk lab.",
      "Review log suhu, QC, cleaning, food handler hari itu.",
      "Root cause analysis + CAPA; lapor ke WFP, IFSR, FFI."
    ],
    risks: ["Eskalasi publik, cedera massal, hukum"],
    ref: "Permenkes 1501/2010 KLB · HACCP Recall Plan"
  }
];
