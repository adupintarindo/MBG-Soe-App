-- ============================================================================
-- Round 2 seed: suppliers baru, libur nasional 2026, sample PO/GRN/Invoice
-- ============================================================================

-- 2 supplier tambahan dari HTML prototype
insert into public.suppliers (id, name, type, commodity, pic, phone, address, email, notes, score, status, active)
values
  ('SUP-13', 'UD Dua Putra', 'UD', 'Kentang, Ubi jalar, Jagung manis',
   'Pemilik UD Dua Putra', '+62 813-3801-1313', 'Soe · TTS',
   'duaputra.soe@gmail.com', 'Umbi-umbian lokal',
   75.30, 'signed', true),
  ('SUP-14', 'CV Sayur Dataran Tinggi', 'CV',
   'Sawi, Bayam, Kangkung, Kacang Panjang, Wortel',
   'Direktur CV Sayur DT', '+62 812-3888-1414', 'Kapan · TTS',
   'sayurdt@gmail.com', 'Sayur dataran tinggi Kapan',
   81.20, 'signed', true)
on conflict (id) do nothing;

-- Link ke items
insert into public.supplier_items (supplier_id, item_code, is_main, price_idr, lead_time_days) values
  ('SUP-13', 'Kentang', false, 14000, 2),
  ('SUP-13', 'Ubi Jalar', true, 9000, 2),
  ('SUP-13', 'Jagung Manis', false, 8000, 2),
  ('SUP-14', 'Sawi', false, 8000, 1),
  ('SUP-14', 'Bayam', true, 7000, 1),
  ('SUP-14', 'Kangkung', false, 6000, 1),
  ('SUP-14', 'Kacang Panjang', false, 9000, 1),
  ('SUP-14', 'Wortel', false, 12000, 1)
on conflict (supplier_id, item_code) do nothing;

-- Hari libur nasional 2026 (non-operasional SPPG)
insert into public.non_op_days (op_date, reason) values
  ('2026-01-01', 'Tahun Baru Masehi'),
  ('2026-02-17', 'Tahun Baru Imlek'),
  ('2026-03-19', 'Hari Suci Nyepi'),
  ('2026-03-20', 'Cuti Bersama Nyepi'),
  ('2026-04-03', 'Wafat Isa Al Masih'),
  ('2026-04-14', 'Hari Raya Idul Fitri 1447 H'),
  ('2026-04-15', 'Hari Raya Idul Fitri 1447 H'),
  ('2026-04-16', 'Cuti Bersama Idul Fitri'),
  ('2026-04-17', 'Cuti Bersama Idul Fitri'),
  ('2026-05-01', 'Hari Buruh Internasional'),
  ('2026-05-13', 'Kenaikan Isa Al Masih'),
  ('2026-06-01', 'Hari Lahir Pancasila'),
  ('2026-06-21', 'Hari Raya Idul Adha 1447 H'),
  ('2026-07-11', 'Tahun Baru Islam 1448 H'),
  ('2026-08-17', 'HUT Kemerdekaan RI'),
  ('2026-09-19', 'Maulid Nabi Muhammad SAW'),
  ('2026-12-25', 'Hari Raya Natal'),
  ('2026-12-26', 'Cuti Bersama Natal'),
  -- Libur sekolah TTS
  ('2026-06-22', 'Libur Kenaikan Kelas'),
  ('2026-06-23', 'Libur Kenaikan Kelas'),
  ('2026-06-24', 'Libur Kenaikan Kelas'),
  ('2026-06-25', 'Libur Kenaikan Kelas'),
  ('2026-06-26', 'Libur Kenaikan Kelas'),
  ('2026-06-29', 'Libur Kenaikan Kelas'),
  ('2026-06-30', 'Libur Kenaikan Kelas'),
  ('2026-07-01', 'Libur Kenaikan Kelas'),
  ('2026-07-02', 'Libur Kenaikan Kelas'),
  ('2026-07-03', 'Libur Kenaikan Kelas'),
  ('2026-12-21', 'Libur Semester Ganjil'),
  ('2026-12-22', 'Libur Semester Ganjil'),
  ('2026-12-23', 'Libur Semester Ganjil'),
  ('2026-12-24', 'Libur Semester Ganjil'),
  ('2026-12-28', 'Libur Semester Ganjil'),
  ('2026-12-29', 'Libur Semester Ganjil'),
  ('2026-12-30', 'Libur Semester Ganjil'),
  ('2026-12-31', 'Libur Semester Ganjil')
on conflict (op_date) do nothing;

-- Sample PO (untuk Bulog NTT + CV Lintas Cakrawala)
insert into public.purchase_orders (no, po_date, supplier_id, delivery_date, total, status, pay_method, top, ref_contract, notes)
values
  ('PO-2026-0001', '2026-04-10', 'SUP-01', '2026-04-16', 44800000, 'confirmed',
   'Transfer BRI', 'NET 30', 'LTA-SPPG-2026-BULOG',
   'PO bulanan beras premium untuk stock awal Mei.'),
  ('PO-2026-0002', '2026-04-12', 'SUP-02', '2026-04-15', 18900000, 'delivered',
   'Transfer BRI', 'NET 14', 'LTA-SPPG-2026-LINTAS',
   'Ayam + ikan untuk siklus menu minggu 1 Mei.'),
  ('PO-2026-0003', '2026-04-13', 'SUP-03', '2026-04-14', 6200000, 'delivered',
   'Cash', 'COD', null,
   'Sayur & bumbu segar mingguan.'),
  ('PO-2026-0004', '2026-04-14', 'SUP-06', '2026-04-15', 9800000, 'delivered',
   'Transfer BRI', 'NET 7', null,
   'Tahu tempe + sembako mingguan.')
on conflict (no) do nothing;

-- PO rows
insert into public.po_rows (po_no, line_no, item_code, qty, unit, price) values
  -- PO-0001 Bulog: beras
  ('PO-2026-0001', 1, 'Beras Putih', 3200, 'kg', 14000),
  -- PO-0002 Lintas Cakrawala: hewani
  ('PO-2026-0002', 1, 'Ayam Segar', 300, 'kg', 45000),
  ('PO-2026-0002', 2, 'Ikan Tuna', 80, 'kg', 58000),
  ('PO-2026-0002', 3, 'Telur Ayam', 44, 'kg', 30000),
  -- PO-0003 Kurnia Jaya: sayur
  ('PO-2026-0003', 1, 'Kentang', 120, 'kg', 14000),
  ('PO-2026-0003', 2, 'Wortel', 80, 'kg', 12000),
  ('PO-2026-0003', 3, 'Bawang Merah', 60, 'kg', 35000),
  ('PO-2026-0003', 4, 'Bawang Putih', 50, 'kg', 30000),
  -- PO-0004 Rajawali: sembako
  ('PO-2026-0004', 1, 'Tahu', 80, 'kg', 12000),
  ('PO-2026-0004', 2, 'Tempe', 80, 'kg', 14000),
  ('PO-2026-0004', 3, 'Minyak Goreng', 90, 'lt', 18000),
  ('PO-2026-0004', 4, 'Garam', 20, 'kg', 6000),
  ('PO-2026-0004', 5, 'Gula', 30, 'kg', 16000)
on conflict (po_no, line_no) do nothing;

-- GRN
insert into public.grns (no, po_no, grn_date, status, qc_note) values
  ('GRN-2026-0001', 'PO-2026-0002', '2026-04-15', 'ok',
   'Ayam kondisi segar, suhu simpan <4°C. Ikan tuna mata jernih.'),
  ('GRN-2026-0002', 'PO-2026-0003', '2026-04-14', 'ok',
   'Semua sayur segar, bawang kering.'),
  ('GRN-2026-0003', 'PO-2026-0004', '2026-04-15', 'partial',
   'Tempe 78kg (kurang 2kg), supplier ganti besok. Lainnya OK.')
on conflict (no) do nothing;

-- Invoices
insert into public.invoices (no, po_no, inv_date, supplier_id, total, due_date, status) values
  ('INV-2026-0001', 'PO-2026-0002', '2026-04-15', 'SUP-02', 18900000, '2026-04-29', 'issued'),
  ('INV-2026-0002', 'PO-2026-0003', '2026-04-14', 'SUP-03', 6200000, '2026-04-14', 'paid'),
  ('INV-2026-0003', 'PO-2026-0004', '2026-04-15', 'SUP-06', 9772000, '2026-04-22', 'issued')
on conflict (no) do nothing;

-- Transactions ledger
insert into public.transactions (tx_date, tx_type, ref_no, supplier_id, amount, description) values
  ('2026-04-10', 'po', 'PO-2026-0001', 'SUP-01', 44800000, 'Order beras 3.200 kg ke Bulog NTT'),
  ('2026-04-12', 'po', 'PO-2026-0002', 'SUP-02', 18900000, 'Order protein hewani ke Lintas Cakrawala'),
  ('2026-04-13', 'po', 'PO-2026-0003', 'SUP-03', 6200000, 'Order sayur & bumbu ke Kurnia Jaya'),
  ('2026-04-14', 'po', 'PO-2026-0004', 'SUP-06', 9800000, 'Order sembako ke Rajawali Pangan'),
  ('2026-04-14', 'grn', 'GRN-2026-0002', 'SUP-03', null, 'Terima sayur & bumbu · QC OK'),
  ('2026-04-14', 'invoice', 'INV-2026-0002', 'SUP-03', 6200000, 'Invoice sayur Kurnia Jaya'),
  ('2026-04-14', 'payment', 'INV-2026-0002', 'SUP-03', 6200000, 'Bayar Kurnia Jaya · COD'),
  ('2026-04-15', 'grn', 'GRN-2026-0001', 'SUP-02', null, 'Terima hewani · QC OK'),
  ('2026-04-15', 'invoice', 'INV-2026-0001', 'SUP-02', 18900000, 'Invoice Lintas Cakrawala · NET 30'),
  ('2026-04-15', 'grn', 'GRN-2026-0003', 'SUP-06', null, 'Terima sembako · partial (tempe -2kg)'),
  ('2026-04-15', 'invoice', 'INV-2026-0003', 'SUP-06', 9772000, 'Invoice Rajawali · NET 7');

-- Stock moves (auto-sync ke stock via trigger)
insert into public.stock_moves (item_code, delta, reason, ref_doc, ref_no, note) values
  -- Opening balance Maret 2026
  ('Beras Putih', 500, 'opening', null, null, 'Opening stock Maret'),
  ('Ayam Segar', 30, 'opening', null, null, 'Opening stock'),
  ('Telur Ayam', 10, 'opening', null, null, 'Opening stock'),
  -- Receipt dari GRN
  ('Ayam Segar', 300, 'receipt', 'grn', 'GRN-2026-0001', 'Terima dari Lintas Cakrawala'),
  ('Ikan Tuna', 80, 'receipt', 'grn', 'GRN-2026-0001', 'Terima dari Lintas Cakrawala'),
  ('Telur Ayam', 44, 'receipt', 'grn', 'GRN-2026-0001', 'Terima dari Lintas Cakrawala'),
  ('Kentang', 120, 'receipt', 'grn', 'GRN-2026-0002', 'Terima dari Kurnia Jaya'),
  ('Wortel', 80, 'receipt', 'grn', 'GRN-2026-0002', 'Terima dari Kurnia Jaya'),
  ('Bawang Merah', 60, 'receipt', 'grn', 'GRN-2026-0002', 'Terima dari Kurnia Jaya'),
  ('Bawang Putih', 50, 'receipt', 'grn', 'GRN-2026-0002', 'Terima dari Kurnia Jaya'),
  ('Tahu', 80, 'receipt', 'grn', 'GRN-2026-0003', 'Terima dari Rajawali'),
  ('Tempe', 78, 'receipt', 'grn', 'GRN-2026-0003', 'Terima dari Rajawali (partial, -2kg)'),
  ('Minyak Goreng', 90, 'receipt', 'grn', 'GRN-2026-0003', 'Terima dari Rajawali'),
  ('Garam', 20, 'receipt', 'grn', 'GRN-2026-0003', 'Terima dari Rajawali'),
  ('Gula', 30, 'receipt', 'grn', 'GRN-2026-0003', 'Terima dari Rajawali');

-- ============================================================================
-- Supplier Onboarding Action Tracker
-- Sumber: 20260327_Onboarding MBG Suppliers_wfp.docx (meeting 27 Mar 2026)
-- Penanggung jawab default: IFSR-WFP field team
-- Target dates di-anchor dari meeting date 27 Mar 2026 + durasi di docx
-- ============================================================================
insert into public.supplier_actions
  (supplier_id, related_scope, title, description, category, priority, status,
   owner, target_date, source, source_ref, created_at)
values
  -- Item 1: Dual sourcing untuk bahan kritikal (eggs, tofu, LPG, rice)
  (null, 'Eggs · Tofu · LPG · Rice',
   'Identifikasi supplier cadangan untuk bahan kritikal',
   'Lakukan due diligence & onboarding supplier alternatif (dual sourcing) untuk telur, tahu, LPG, dan beras. Risiko single-source dinilai tinggi mengingat volume harian SPPG Nunumeu.',
   'Risk Mitigation', 'high', 'open',
   'IFSR-WFP + SPPG Nunumeu', '2026-04-10',
   'onboarding', 'docx:20260327/Item-1', '2026-03-27 10:00'),

  -- Item 2: Validasi kapasitas tahu CV Maju Lancar
  (null, 'CV Maju Lancar (Tahu)',
   'Verifikasi kapasitas produksi harian tahu',
   'Kunjungi fasilitas produksi CV Maju Lancar, ukur kapasitas harian vs. kebutuhan SPPG (~80 kg/hari). Evaluasi perlu tidaknya supplier kedua.',
   'Capacity Check', 'high', 'in_progress',
   'IFSR-WFP', '2026-04-10',
   'onboarding', 'docx:20260327/Item-2', '2026-03-27 10:05'),

  -- Item 3: Logistik ikan PT Alger Karya Utama
  (null, 'PT Alger Karya Utama (Ikan)',
   'Finalisasi skema logistik cold-chain ikan segar',
   'Konfirmasi SOP transportasi ikan (ice-box/reefer), frekuensi delivery, dan titik serah. Pastikan QC standar memenuhi syarat SPPG.',
   'Logistics', 'high', 'open',
   'IFSR-WFP', '2026-04-03',
   'onboarding', 'docx:20260327/Item-3', '2026-03-27 10:10'),

  -- Item 4: QC pisang dari Pisang Efron
  (null, 'Pisang Efron',
   'Tentukan standar QC pisang (ukuran, kematangan, packing)',
   'Susun acceptance criteria pisang untuk SPPG: grade ukuran, tingkat kematangan saat delivery, kemasan, toleransi reject. Edukasi supplier.',
   'Quality Control', 'medium', 'open',
   'Ahli Gizi SPPG', '2026-04-10',
   'onboarding', 'docx:20260327/Item-4', '2026-03-27 10:15'),

  -- Item 5: Price confirmation gate (SEMUA supplier)
  (null, 'ALL suppliers',
   'Pasang gate konfirmasi harga sebelum PO dirilis',
   'Standarkan alur: setiap PO harus punya konfirmasi tertulis harga dari supplier <48 jam sebelum rilis. Mencegah sengketa harga saat invoice.',
   'Process / Governance', 'high', 'in_progress',
   'Operator SPPG', '2026-03-30',
   'onboarding', 'docx:20260327/Item-5', '2026-03-27 10:20'),

  -- Item 6: Consignment SOP untuk Triananta Wijaya & Blivo
  (null, 'CV Triananta Wijaya · CV Blivo',
   'Susun SOP konsinyasi (consignment terms)',
   'Draft kontrak konsinyasi: scope barang, siapa menanggung susut, ritme stok-opname, mekanisme settlement. Review oleh legal WFP.',
   'Legal / SOP', 'medium', 'open',
   'IFSR-WFP Legal', '2026-04-10',
   'onboarding', 'docx:20260327/Item-6', '2026-03-27 10:25'),

  -- Item 7: Admin gaps Karya Utama (beras)
  (null, 'Karya Utama (Beras)',
   'Lengkapi dokumen administratif supplier beras',
   'NPWP, NIB, sertifikat halal/mutu beras, bukti sumber gabah. Tanpa ini LTA tidak bisa di-teken.',
   'Compliance / Docs', 'medium', 'open',
   'IFSR-WFP', '2026-04-03',
   'onboarding', 'docx:20260327/Item-7', '2026-03-27 10:30'),

  -- Item 8: Farmer Group Tunmuni
  (null, 'Farmer Group Tunmuni',
   'Formalisasi kelompok tani Tunmuni sebagai supplier',
   'Fasilitasi pendirian koperasi/legal entity, bimbingan SOP panen & pasca-panen, matching komoditas ke kebutuhan SPPG. Target awal: sayur dataran tinggi.',
   'Supplier Development', 'medium', 'open',
   'IFSR-WFP + Dinas Koperasi', '2026-04-24',
   'onboarding', 'docx:20260327/Item-8', '2026-03-27 10:35'),

  -- Item 9: PO cancellation policy (TLM, all)
  (null, 'TLM · ALL',
   'Susun kebijakan pembatalan PO',
   'Kondisi pembatalan (force majeure, QC gagal, supplier wanprestasi), konsekuensi finansial, lead-time notifikasi. Harmonisasi di LTA template.',
   'Legal / SOP', 'high', 'open',
   'IFSR-WFP Legal', '2026-04-03',
   'onboarding', 'docx:20260327/Item-9', '2026-03-27 10:40'),

  -- Item 10: Scope expansion Nusantara Pangan
  (null, 'CV Nusantara Pangan',
   'Evaluasi perluasan scope supply (selain LPG)',
   'Supplier menawarkan tambahan komoditas sembako (gula, minyak, tepung). Lakukan price discovery & cross-check dengan incumbent supplier.',
   'Scope / Pricing', 'medium', 'open',
   'Operator SPPG', '2026-04-10',
   'onboarding', 'docx:20260327/Item-10', '2026-03-27 10:45'),

  -- Item 11: Revisi LTA cooking gas (Nusantara Pangan & Wijaya)
  (null, 'CV Nusantara Pangan · CV Triananta Wijaya',
   'Revisi LTA LPG · klausul safety & distribusi',
   'Tambahkan klausul safety tabung (segel, SNI, expiry), frekuensi rotasi, SLA respon emergency. Draft revisi dikirim ke WFP legal.',
   'Legal / LTA', 'high', 'open',
   'IFSR-WFP Legal', '2026-04-03',
   'onboarding', 'docx:20260327/Item-11', '2026-03-27 10:50'),

  -- Item 12: Validasi LPG Red & White Coop
  (null, 'Red & White Coop (LPG)',
   'Validasi kapasitas & legalitas Red & White Coop',
   'Cek izin usaha LPG (agen/pangkalan resmi Pertamina), kapasitas tabung, area cakupan Soe-TTS. Penting untuk strategi dual-source LPG.',
   'Due Diligence', 'medium', 'open',
   'IFSR-WFP', '2026-04-10',
   'onboarding', 'docx:20260327/Item-12', '2026-03-27 10:55'),

  -- Item 13: Follow up BULOG NTT — maps to SUP-01
  ('SUP-01', null,
   'Follow up tanda tangan LTA Bulog NTT',
   'LTA Bulog NTT masih status awaiting. Follow up tanggal tanda tangan, siapkan draft final, koordinasi jadwal pimpinan Bulog.',
   'LTA / Contract', 'medium', 'in_progress',
   'IFSR-WFP', '2026-03-30',
   'onboarding', 'docx:20260327/Item-13', '2026-03-27 11:00')
on conflict do nothing;
