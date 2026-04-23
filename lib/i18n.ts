// i18n dictionary for the whole app. Server components read lang via
// lib/i18n-server.ts#getLang(); client components via lib/prefs-context#useLang().
//
// Keys are flat + dot-namespaced ("procurement.title"). For interpolation,
// use `{name}` placeholders in the string and call `ti(key, lang, { name })`.

export type Lang = "ID" | "EN";

type Pair = { ID: string; EN: string };

export const LANG_KEYS = {
  // ---------------- Brand + Nav (used by components/nav.tsx) ----------------
  appTitle: { ID: "Supply Chain MBG", EN: "MBG Supply Chain" },
  brandSub: { ID: "SPPG Nunumeu — Kota Soe", EN: "SPPG Nunumeu — Soe City" },
  brandRegion: {
    ID: "Timor Tengah Selatan, Nusa Tenggara Timur",
    EN: "South Central Timor, East Nusa Tenggara"
  },
  statusOperasional: { ID: "Operasional", EN: "Operational" },
  statusOutOfHours: { ID: "Tidak Operasional", EN: "Outside Hours" },
  statusWeekend: { ID: "Akhir Pekan", EN: "Weekend" },
  statusHoliday: { ID: "Libur", EN: "Holiday" },
  statusMenuPrefix: { ID: "Menu", EN: "Menu" },
  signOut: { ID: "Keluar", EN: "Sign Out" },
  themeLight: { ID: "Mode terang", EN: "Light mode" },
  themeDark: { ID: "Mode gelap", EN: "Dark mode" },
  tabDashboard: { ID: "Dashboard", EN: "Dashboard" },
  tabSchools: { ID: "P. Manfaat", EN: "Beneficiaries" },
  tabMenu: { ID: "Master Menu", EN: "Menu Master" },
  tabCalendar: { ID: "Kalender Menu", EN: "Menu Calendar" },
  tabPlanning: { ID: "Kebutuhan", EN: "Planning" },
  tabStock: { ID: "Kartu Stok", EN: "Stock Card" },
  tabProcurement: { ID: "Pengadaan", EN: "Procurement" },
  tabSuppliers: { ID: "Supplier", EN: "Suppliers" },
  tabPriceList: { ID: "Price List", EN: "Price List" },
  tabDocgen: { ID: "Dokumen", EN: "Documents" },
  tabSOP: { ID: "SOP", EN: "SOP" },
  tabData: { ID: "Data Master", EN: "Master Data" },
  tabAdmin: { ID: "Admin", EN: "Admin" },
  tabForecast: { ID: "Forecast 90h", EN: "Forecast 90d" },
  tabSupplierPortal: { ID: "Portal", EN: "Portal" },
  tabKeuangan: { ID: "Keuangan", EN: "Finance" },
  tabPersonalia: { ID: "Personalia", EN: "Personnel" },
  tabDokumenBgn: { ID: "Dokumen BGN", EN: "BGN Forms" },
  navMainAria: { ID: "Modul utama", EN: "Main modules" },

  // ---------------- Common words ----------------
  "common.detail": { ID: "Detail", EN: "Detail" },
  "common.back": { ID: "← Kembali", EN: "← Back" },
  "common.save": { ID: "Simpan", EN: "Save" },
  "common.cancel": { ID: "Batal", EN: "Cancel" },
  "common.delete": { ID: "Hapus", EN: "Delete" },
  "common.edit": { ID: "Edit", EN: "Edit" },
  "common.add": { ID: "Tambah", EN: "Add" },
  "common.new": { ID: "Baru", EN: "New" },
  "common.reset": { ID: "Reset", EN: "Reset" },
  "common.close": { ID: "Tutup", EN: "Close" },
  "common.loading": { ID: "Memuat...", EN: "Loading..." },
  "common.saving": { ID: "Menyimpan...", EN: "Saving..." },
  "common.date": { ID: "Tanggal", EN: "Date" },
  "common.dayDate": { ID: "Hari, Tanggal", EN: "Day, Date" },
  "common.status": { ID: "Status", EN: "Status" },
  "common.note": { ID: "Catatan", EN: "Notes" },
  "common.item": { ID: "Item", EN: "Item" },
  "common.items": { ID: "item", EN: "items" },
  "common.unit": { ID: "Satuan", EN: "Unit" },
  "common.qty": { ID: "Qty", EN: "Qty" },
  "common.total": { ID: "Total", EN: "Total" },
  "common.grandTotal": { ID: "GRAND TOTAL", EN: "GRAND TOTAL" },
  "common.supplier": { ID: "Supplier", EN: "Supplier" },
  "common.category": { ID: "Kategori", EN: "Category" },
  "common.name": { ID: "Nama", EN: "Name" },
  "common.price": { ID: "Harga", EN: "Price" },
  "common.description": { ID: "Deskripsi", EN: "Description" },
  "common.action": { ID: "Aksi", EN: "Action" },
  "common.noData": { ID: "Belum ada data.", EN: "No data yet." },
  "common.today": { ID: "Hari ini", EN: "Today" },
  "common.tomorrow": { ID: "Besok", EN: "Tomorrow" },
  "common.from": { ID: "dari", EN: "of" },
  "common.to": { ID: "ke", EN: "to" },
  "common.at": { ID: "pada", EN: "at" },
  "common.and": { ID: "dan", EN: "and" },
  "common.or": { ID: "atau", EN: "or" },
  "common.days": { ID: "hari", EN: "days" },
  "common.day": { ID: "hari", EN: "day" },
  "common.months": { ID: "bulan", EN: "months" },
  "common.weeks": { ID: "minggu", EN: "weeks" },
  "common.students": { ID: "siswa", EN: "students" },
  "common.teachers": { ID: "guru", EN: "teachers" },
  "common.active": { ID: "aktif", EN: "active" },
  "common.inactive": { ID: "nonaktif", EN: "inactive" },
  "common.all": { ID: "Semua", EN: "All" },
  "common.none": { ID: "Tidak ada", EN: "None" },
  "common.yes": { ID: "Ya", EN: "Yes" },
  "common.no": { ID: "Tidak", EN: "No" },
  "common.overdue": { ID: "overdue", EN: "overdue" },
  "common.paid": { ID: "dibayar", EN: "paid" },
  "common.period": { ID: "Periode", EN: "Period" },
  "common.range": { ID: "Rentang", EN: "Range" },
  "common.filter": { ID: "Filter", EN: "Filter" },
  "common.search": { ID: "Cari", EN: "Search" },
  "common.role": { ID: "Peran", EN: "Role" },
  "common.phone": { ID: "Telepon", EN: "Phone" },
  "common.email": { ID: "Email", EN: "Email" },
  "common.address": { ID: "Alamat", EN: "Address" },
  "common.export": { ID: "Ekspor", EN: "Export" },
  "common.import": { ID: "Impor", EN: "Import" },
  "common.print": { ID: "Cetak", EN: "Print" },
  "common.preview": { ID: "Pratinjau", EN: "Preview" },
  "common.documents": { ID: "dokumen", EN: "documents" },
  "common.latest": { ID: "terbaru", EN: "latest" },
  "common.percentOfSku": { ID: "% dari SKU", EN: "% of SKU" },
  "common.ofSku": { ID: "dari SKU", EN: "of SKU" },
  "common.inStock": { ID: "ada stok", EN: "in stock" },
  "common.empty": { ID: "kosong", EN: "empty" },
  "common.delivery": { ID: "Delivery", EN: "Delivery" },
  "common.level": { ID: "Jenjang", EN: "Level" },
  "common.contact": { ID: "Kontak", EN: "Contact" },
  "common.distance": { ID: "Jarak", EN: "Distance" },
  "common.distanceKm": { ID: "Jarak (km)", EN: "Distance (km)" },
  "common.menu": { ID: "Menu", EN: "Menu" },
  "common.porsi": { ID: "Porsi", EN: "Servings" },
  "common.porsiShort": { ID: "porsi", EN: "servings" },
  "common.needed": { ID: "Kebutuhan", EN: "Required" },
  "common.short": { ID: "Short", EN: "Short" },
  "common.required": { ID: "Butuh", EN: "Required" },
  "common.onHand": { ID: "Ada", EN: "On hand" },
  "common.gap": { ID: "Kurang", EN: "Gap" },
  "common.commodity": { ID: "Komoditas", EN: "Commodity" },
  "common.cost": { ID: "Biaya", EN: "Cost" },
  "common.value": { ID: "Nilai", EN: "Value" },
  "common.weight": { ID: "Berat", EN: "Weight" },
  "common.reason": { ID: "Reason", EN: "Reason" },
  "common.delta": { ID: "Delta", EN: "Delta" },
  "common.time": { ID: "Waktu", EN: "Time" },
  "common.ref": { ID: "Referensi", EN: "Reference" },
  "common.confirm": { ID: "Konfirmasi", EN: "Confirm" },
  "common.searchPlaceholder": { ID: "Cari di tabel…", EN: "Search table…" },
  "common.showingRows": { ID: "{visible} dari {total} baris", EN: "{visible} of {total} rows" },
  "common.sortedBy": { ID: "Diurutkan", EN: "Sorted by" },
  "common.exportExcel": { ID: "Ekspor Excel", EN: "Export Excel" },
  "common.filterCategory": { ID: "Semua kategori", EN: "All categories" },

  // ---------------- Dashboard (/dashboard) ----------------
  "dashboard.notActiveTitle": { ID: "Akun belum aktif", EN: "Account not yet active" },
  "dashboard.notActiveBody": {
    ID: "sudah masuk ke sistem, tapi admin belum meng-aktifkan profil Anda. Hubungi admin untuk diverifikasi.",
    EN: "has signed in, but an administrator has not activated your profile yet. Contact an admin to verify."
  },
  "dashboard.shortageToday": { ID: "{n} shortage hari ini", EN: "{n} shortages today" },
  "dashboard.kpiStudents": { ID: "Penerima Manfaat", EN: "Beneficiaries" },
  "dashboard.kpiStudentsSub": { ID: "{n} sekolah aktif", EN: "{n} active schools" },
  "dashboard.kpiSchoolsActive": { ID: "Sekolah Aktif", EN: "Active Schools" },
  "dashboard.kpiSchoolsSub": { ID: "SPPG Nunumeu", EN: "SPPG Nunumeu" },
  "dashboard.kpiMenuToday": { ID: "Menu Hari Ini", EN: "Today's Menu" },
  "dashboard.kpiMenuNotSet": { ID: "Belum ditetapkan", EN: "Not yet set" },
  "dashboard.kpiMenuSub": {
    ID: "{porsi} porsi | {kg}",
    EN: "{porsi} servings | {kg}"
  },
  "dashboard.kpiSuppliersActive": { ID: "Supplier Aktif", EN: "Active Suppliers" },
  "dashboard.kpiSuppliersSub": { ID: "BUMN + UMKM + Poktan", EN: "SOE + SMEs + Farmer Groups" },
  "dashboard.volumeTitle": {
    ID: "Kebutuhan Bahan",
    EN: "Ingredient Requirements"
  },
  "dashboard.volumeRangeFallback": { ID: "4 Bulan", EN: "4 Months" },
  "dashboard.volumeHint": {
    ID: "Top 12 komoditas berdasarkan agregat porsi × menu BOM per hari operasional (Senin–Jumat, skip non-op).",
    EN: "Top 12 commodities by aggregate servings × menu BOM per operating day (Mon–Fri, skipping non-op)."
  },
  "dashboard.volumeEmptyTitle": {
    ID: "Belum ada data kebutuhan",
    EN: "No requirements data yet"
  },
  "dashboard.volumeEmptyMsg": {
    ID: "Pastikan menu sudah dijadwalkan pada tanggal di periode ini.",
    EN: "Make sure menus have been scheduled to dates within this period."
  },
  "dashboard.tblNo": { ID: "No.", EN: "No." },
  "dashboard.tblCommodity": { ID: "Komoditas", EN: "Commodity" },
  "dashboard.tblTotalKg": { ID: "Total (kg)", EN: "Total (kg)" },
  "dashboard.planningTitle": { ID: "Planning 10 Hari Ke Depan", EN: "Planning for the Next 10 Days" },
  "dashboard.planningHint": {
    ID: "Prakiraan porsi × menu, tanpa hari non-operasional.",
    EN: "Forecast of servings × menu, excluding non-operational days."
  },
  "dashboard.planningEmpty": { ID: "Belum ada planning.", EN: "No planning yet." },
  "dashboard.tblDate": { ID: "Tanggal", EN: "Date" },
  "dashboard.tblMenu": { ID: "Menu", EN: "Menu" },
  "dashboard.tblPorsi": { ID: "Porsi", EN: "Servings" },
  "dashboard.tblKebutuhan": { ID: "Kebutuhan", EN: "Required" },
  "dashboard.tblShort": { ID: "Short", EN: "Short" },
  "dashboard.badgeNonOp": { ID: "NON-OP", EN: "NON-OP" },
  "dashboard.badgeOp": { ID: "OP", EN: "OP" },
  "dashboard.badgeNonOpLong": { ID: "NON-OP", EN: "NON-OP" },
  "dashboard.tblStatus": { ID: "Status", EN: "Status" },
  "dashboard.scheduleTitle": {
    ID: "Jadwal Menu dan Porsi",
    EN: "Menu and Portion Schedule"
  },
  "dashboard.scheduleHint": {
    ID: "Ringkasan menu harian, sekolah penerima, dan distribusi porsi kecil/besar per tanggal.",
    EN: "Daily menu overview, receiving schools, and small/large portion split per date."
  },
  "dashboard.scheduleEmpty": {
    ID: "Belum ada menu terjadwal untuk periode ini.",
    EN: "No menu scheduled for this period yet."
  },
  "dashboard.tblDayDate": { ID: "Hari, Tanggal", EN: "Day, Date" },
  "dashboard.tblMenuName": { ID: "Nama Menu", EN: "Menu Name" },
  "dashboard.tblSchools": { ID: "Sekolah", EN: "Schools" },
  "dashboard.tblStudents": { ID: "Siswa", EN: "Students" },
  "dashboard.tblPregnant": { ID: "Bumil/Busui", EN: "Pregnant/Nursing" },
  "dashboard.tblToddler": { ID: "Balita", EN: "Toddlers" },
  "dashboard.tblPorsiKecil": { ID: "Porsi Kecil", EN: "Small Portion" },
  "dashboard.tblPorsiBesar": { ID: "Porsi Besar", EN: "Large Portion" },
  "dashboard.tblPorsiTotal": { ID: "Total Porsi", EN: "Total Portion" },
  "dashboard.breakdownTitle": { ID: "Rincian Penerima — {date}", EN: "Beneficiary Breakdown — {date}" },
  "dashboard.breakdownSchools": { ID: "Sekolah", EN: "Schools" },
  "dashboard.breakdownPregnant": { ID: "Ibu Hamil/Menyusui", EN: "Pregnant/Nursing Mothers" },
  "dashboard.breakdownToddler": { ID: "Balita", EN: "Toddlers" },
  "dashboard.breakdownDownload": { ID: "Unduh Excel", EN: "Download Excel" },
  "dashboard.breakdownClose": { ID: "Tutup", EN: "Close" },
  "dashboard.breakdownLoading": { ID: "Memuat rincian…", EN: "Loading details…" },
  "dashboard.breakdownEmptyOp": { ID: "Hari ini tidak operasional.", EN: "Non-operational day." },
  "dashboard.breakdownColName": { ID: "Nama", EN: "Name" },
  "dashboard.breakdownColLevel": { ID: "Jenjang", EN: "Level" },
  "dashboard.breakdownColQty": { ID: "Porsi", EN: "Portions" },
  "dashboard.breakdownColKecil": { ID: "Kecil", EN: "Small" },
  "dashboard.breakdownColBesar": { ID: "Besar", EN: "Large" },
  "dashboard.breakdownColGuru": { ID: "Guru", EN: "Teachers" },
  "dashboard.breakdownColTotal": { ID: "Total", EN: "Total" },
  "dashboard.breakdownColPhase": { ID: "Fase", EN: "Phase" },
  "dashboard.breakdownColPosyandu": { ID: "Posyandu", EN: "Posyandu" },
  "dashboard.breakdownColAge": { ID: "Usia", EN: "Age" },
  "dashboard.breakdownColDob": { ID: "Tgl Lahir", EN: "Birth Date" },
  "dashboard.breakdownColMother": { ID: "Nama Ibu", EN: "Mother's Name" },
  "dashboard.tblActions": { ID: "Rincian", EN: "Details" },
  "dashboard.breakdownOpen": { ID: "Lihat rincian penerima", EN: "View beneficiary details" },
  "dashboard.stockAlertTitle": { ID: "Alert Stok Hari Ini", EN: "Today's Stock Alert" },
  "dashboard.stockAlertHintOk": { ID: "Semua kebutuhan tercover.", EN: "All requirements covered." },
  "dashboard.stockAlertHintBad": { ID: "{n} item | gap {gap}", EN: "{n} items | gap {gap}" },
  "dashboard.stockAlertEmpty": {
    ID: "Tidak ada kekurangan untuk hari ini.",
    EN: "No shortages for today."
  },
  "dashboard.procurementTitle": { ID: "Jadwal Belanja", EN: "Procurement Schedule" },
  "dashboard.procurementHint": {
    ID: "Daftar belanja komoditas untuk 10 hari operasional ke depan, dikelompokkan per tanggal menu.",
    EN: "Commodity shopping list for the next 10 operational days, grouped by menu date."
  },
  "dashboard.procurementEmpty": {
    ID: "Belum ada menu operasional dalam 10 hari ke depan.",
    EN: "No operational menus in the next 10 days."
  },
  "dashboard.procurementLoading": {
    ID: "Memuat jadwal belanja…",
    EN: "Loading procurement schedule…"
  },
  "dashboard.procurementColItem": { ID: "Komoditas", EN: "Commodity" },
  "dashboard.procurementColCategory": { ID: "Kategori", EN: "Category" },
  "dashboard.procurementColQty": { ID: "Jumlah", EN: "Quantity" },
  "dashboard.procurementColPrice": { ID: "Harga Satuan", EN: "Unit Price" },
  "dashboard.procurementColSubtotal": { ID: "Subtotal", EN: "Subtotal" },
  "dashboard.procurementDaySubtotal": { ID: "Subtotal hari ini", EN: "Day subtotal" },
  "dashboard.tblItem": { ID: "Item", EN: "Item" },
  "dashboard.tblButuh": { ID: "Butuh", EN: "Needed" },
  "dashboard.tblAda": { ID: "Ada", EN: "On hand" },
  "dashboard.tblKurang": { ID: "Kurang", EN: "Short" },
  "dashboard.supplierSpendTitle": { ID: "Nilai Belanja Supplier", EN: "Supplier Spend" },
  "dashboard.supplierSpendHint": {
    ID: "Periode {start} s.d. {end} | {n} supplier bertransaksi",
    EN: "Period {start} to {end} | {n} suppliers with transactions"
  },
  "dashboard.supplierSpendEmpty": { ID: "Belum ada invoice bulan ini.", EN: "No invoices this month yet." },
  "dashboard.tblType": { ID: "Tipe", EN: "Type" },
  "dashboard.tblInvoice": { ID: "Invoice", EN: "Invoice" },
  "dashboard.tblTotalSpend": { ID: "Total Belanja", EN: "Total Spend" },
  "dashboard.forecastTitle": { ID: "Peramalan Shortage 14 Hari Ke Depan", EN: "Shortage Forecast Next 14 Days" },
  "dashboard.forecastHint": {
    ID: "Proyeksi hari dengan potensi kekurangan stok 14 hari ke depan, dikelompokkan per tingkat keparahan.",
    EN: "Projection of days with potential stock shortages over the next 14 days, grouped by severity."
  },
  "dashboard.forecastEmpty": {
    ID: "Tidak ada potensi kekurangan dalam 14 hari ke depan.",
    EN: "No shortages detected over the next 14 days."
  },
  "dashboard.forecastItemsShort": { ID: "{n} item kurang", EN: "{n} items short" },
  "dashboard.forecastGap": { ID: "gap {value}", EN: "gap {value}" },
  "dashboard.footer": {
    ID: "Round 6 | Phase 1 | Next.js + Supabase | Go-live SPPG Nunumeu 4 Mei 2026",
    EN: "Round 6 | Phase 1 | Next.js + Supabase | Go-live SPPG Nunumeu 4 May 2026"
  },
  "dashboard.commodityCarbo": { ID: "Karbo", EN: "Carbs" },
  "dashboard.commodityFruit": { ID: "Buah", EN: "Fruit" },
  "dashboard.commodityProtein": { ID: "Protein", EN: "Protein" },
  "dashboard.commoditySeasoning": { ID: "Bumbu", EN: "Seasoning" },
  "dashboard.commodityVeg": { ID: "Sayur", EN: "Vegetables" },
  "dashboard.hppTitle": {
    ID: "HPP per Porsi Rata-rata Periode",
    EN: "Cost per Portion Period Average"
  },
  "dashboard.hppHint": {
    ID: "Rata-rata tertimbang {from} s/d {to} | {days} hari aktif",
    EN: "Weighted average {from} to {to} | {days} active days"
  },
  "dashboard.hppFrom": { ID: "Dari", EN: "From" },
  "dashboard.hppTo": { ID: "Sampai", EN: "To" },
  "dashboard.hppApply": { ID: "Terapkan", EN: "Apply" },
  "dashboard.hppPreset7": { ID: "7 Hari", EN: "7 Days" },
  "dashboard.hppPreset30": { ID: "30 Hari", EN: "30 Days" },
  "dashboard.hppPresetMonth": { ID: "Bulan Ini", EN: "This Month" },
  "dashboard.hppAvg": { ID: "Rata-rata HPP", EN: "Average HPP" },
  "dashboard.hppTotalPorsi": { ID: "Total Porsi", EN: "Total Portions" },
  "dashboard.hppTotalSpent": { ID: "Total Belanja (PO)", EN: "Total Spend (PO)" },
  "dashboard.hppEmpty": {
    ID: "Belum ada data HPP pada periode ini.",
    EN: "No cost data in this period."
  },
  "dashboard.hppColDate": { ID: "Tanggal", EN: "Date" },
  "dashboard.hppColPorsi": { ID: "Porsi", EN: "Portions" },
  "dashboard.hppColSpent": { ID: "Belanja (PO)", EN: "Spend (PO)" },
  "dashboard.hppColHpp": { ID: "HPP / Porsi", EN: "Cost / Portion" },

  // ---------------- Procurement (/procurement) ----------------
  "procurement.title": {
    ID: "Pengadaan",
    EN: "Procurement"
  },
  "procurement.subtitle": {
    ID: "{prs} PR | {qts} Quotation | {pos} PO | {grns} GRN | {invs} Invoice | outstanding",
    EN: "{prs} PR | {qts} Quotation | {pos} PO | {grns} GRN | {invs} Invoice | outstanding"
  },
  "procurement.btnNewPR": { ID: "+ Buat PR (split supplier)", EN: "+ New PR (split supplier)" },
  "procurement.btnNewPRshort": { ID: "+ Buat PR", EN: "+ New PR" },
  "procurement.btnNewQuotation": { ID: "+ Buat Quotation", EN: "+ New Quotation" },
  "procurement.btnNewSimple": { ID: "+ Buat Baru", EN: "+ Create New" },
  "procurement.kpiPOValue": { ID: "Nilai PO", EN: "PO Value" },
  "procurement.kpiGRN": { ID: "GRN", EN: "GRN" },
  "procurement.kpiInvoicePaid": { ID: "Invoice Dibayar", EN: "Invoices Paid" },
  "procurement.kpiInvoicePaidSub": { ID: "dari {total}", EN: "of {total}" },
  "procurement.kpiOutstanding": { ID: "Outstanding", EN: "Outstanding" },
  "procurement.kpiNCR": { ID: "NCR Aktif", EN: "Active NCR" },
  "procurement.kpiNCRSub": {
    ID: "{crit} critical | avg resolve {days} hari",
    EN: "{crit} critical | avg resolve {days} days"
  },
  "procurement.kpiOK": { ID: "{n} OK", EN: "{n} OK" },
  "procurement.kpiOverdue": { ID: "{n} overdue", EN: "{n} overdue" },
  "procurement.kpiDocuments": { ID: "{n} dokumen", EN: "{n} documents" },
  "procurement.secPRtitle": { ID: "Purchase Requisitions (Split-Supplier)", EN: "Purchase Requisitions (Split-Supplier)" },
  "procurement.secPRhint": {
    ID: "Agregasi kebutuhan tanggal tertentu → alokasi qty absolut ke beberapa supplier → otomatis membuat quotation per supplier.",
    EN: "Aggregate requirements for a given date → allocate absolute qty across several suppliers → automatically create a quotation per supplier."
  },
  "procurement.prEmpty": {
    ID: "Belum ada PR. Klik 'Buat PR' untuk mulai membagi kebutuhan ke beberapa supplier.",
    EN: "No PRs yet. Click 'New PR' to start splitting requirements across suppliers."
  },
  "procurement.colPRNo": { ID: "No PR", EN: "PR No." },
  "procurement.colCreated": { ID: "Dibuat", EN: "Created" },
  "procurement.colNeeded": { ID: "Butuh", EN: "Needed" },
  "procurement.secQTtitle": { ID: "Quotations", EN: "Quotations" },
  "procurement.secQThint": {
    ID: "Draft harga ke supplier sebelum PO | export .xlsx untuk supplier tanda tangan/edit, lalu convert ke PO.",
    EN: "Price draft to supplier before PO | export .xlsx for the supplier to sign/edit, then convert to PO."
  },
  "procurement.qtEmpty": {
    ID: "Belum ada quotation. Klik 'Buat Baru' untuk mulai.",
    EN: "No quotations yet. Click 'Create New' to start."
  },
  "procurement.colValidUntil": { ID: "Berlaku s/d", EN: "Valid until" },
  "procurement.colAmount": { ID: "Nilai", EN: "Amount" },
  "procurement.colPO": { ID: "PO", EN: "PO" },
  "procurement.secPOtitle": { ID: "Purchase Orders", EN: "Purchase Orders" },
  "procurement.secPOhint": { ID: "50 PO terbaru", EN: "50 latest POs" },
  "procurement.poEmpty": { ID: "Belum ada PO.", EN: "No POs yet." },
  "procurement.colItems": { ID: "Items", EN: "Items" },
  "procurement.colTotalQty": { ID: "Total Qty", EN: "Total Qty" },
  "procurement.secGRNtitle": {
    ID: "GRN & QC Non-Conformance",
    EN: "GRN & QC Non-Conformance"
  },
  "procurement.secGRNhint": {
    ID: "Klik baris untuk buat pemeriksaan QC dari template | NCR dicatat per severity.",
    EN: "Click a row to create a QC check from a template | NCRs are logged per severity."
  },
  "procurement.secINVtitle": { ID: "Invoice", EN: "Invoices" },
  "procurement.secINVhint": { ID: "50 invoice terbaru", EN: "50 latest invoices" },
  "procurement.invEmpty": { ID: "Belum ada invoice.", EN: "No invoices yet." },
  "procurement.colInvoiceNo": { ID: "No Invoice", EN: "Invoice No." },
  "procurement.colDueDate": { ID: "Jatuh Tempo", EN: "Due Date" },
  "procurement.secReceiptsTitle": { ID: "Bukti Terima (Foto)", EN: "Delivery Proof (Photos)" },
  "procurement.secReceiptsHint": {
    ID: "20 terbaru | klik untuk detail di procurement system",
    EN: "20 latest | click for detail in the procurement system"
  },
  "procurement.receiptsEmpty": { ID: "Belum ada foto bukti.", EN: "No proof photos yet." },
  "procurement.noPhoto": { ID: "(tanpa foto)", EN: "(no photo)" },

  // ---------------- 3-Way Match (PO ↔ GRN ↔ Invoice) ----------------
  "match.title": {
    ID: "3-Way Match — PO ↔ GRN ↔ Invoice",
    EN: "3-Way Match — PO ↔ GRN ↔ Invoice"
  },
  "match.hint": {
    ID: "Cocokkan nominal kontrak (PO), barang masuk (GRN), dan tagihan (Invoice). Status \"Cocok\" = ketiganya selaras dalam toleransi 0,5%.",
    EN: "Reconcile contract value (PO), goods received (GRN), and billed amount (Invoice). \"Matched\" = all three align within 0.5% tolerance."
  },

  // ---------------- Jadwal Pengiriman (Delivery Schedule) ----------------
  "procurement.tabJadwal": { ID: "Jadwal Kirim", EN: "Delivery Schedule" },
  "delivery.secTitle": { ID: "Jadwal Pengiriman Bahan Baku", EN: "Inbound Delivery Schedule" },
  "delivery.secHint": {
    ID: "Pemetaan tanggal kirim → tanggal masak. Kering 1–2×/bln · Ikan 2×/bln · Sayur H-1 · Ayam/Telur/Tahu H-2 · Minggu tutup.",
    EN: "Delivery → cooking date mapping. Dry 1–2×/mo · Fish 2×/mo · Veg H-1 · Chicken/Egg/Tofu H-2 · Sundays closed."
  },
  "delivery.empty": {
    ID: "Belum ada jadwal pengiriman untuk bulan ini.",
    EN: "No delivery schedule for this month yet."
  },
  "delivery.viewCalendar": { ID: "Kalender", EN: "Calendar" },
  "delivery.viewTable": { ID: "Tabel", EN: "Table" },
  "delivery.prevMonth": { ID: "Bulan sebelumnya", EN: "Previous month" },
  "delivery.nextMonth": { ID: "Bulan berikutnya", EN: "Next month" },
  "delivery.today": { ID: "Hari ini", EN: "Today" },
  "delivery.legend": { ID: "Legenda kategori", EN: "Category legend" },
  "delivery.catDry": { ID: "Kering (1–2×/bln)", EN: "Dry (1–2×/mo)" },
  "delivery.catVeg": { ID: "Sayur & Buah (H-1)", EN: "Veg & Fruit (H-1)" },
  "delivery.catFish": { ID: "Ikan (2×/bln)", EN: "Fish (2×/mo)" },
  "delivery.catProtein": { ID: "Ayam/Telur/Tahu (H-2)", EN: "Poultry/Egg/Tofu (H-2)" },
  "delivery.closed": { ID: "Tutup", EN: "Closed" },
  "delivery.colDate": { ID: "Tgl Kirim", EN: "Delivery Date" },
  "delivery.colCategory": { ID: "Kategori", EN: "Category" },
  "delivery.colItem": { ID: "Bahan", EN: "Item" },
  "delivery.colQty": { ID: "Qty (kg/lt)", EN: "Qty (kg/lt)" },
  "delivery.colFor": { ID: "Untuk Masak", EN: "For Cooking" },
  "delivery.colMenu": { ID: "Menu", EN: "Menu" },
  "delivery.modalTitle": { ID: "Pengiriman · {date}", EN: "Delivery · {date}" },
  "delivery.modalSubtitle": {
    ID: "{n} bahan · {kg} kg · melayani masak: {dates}",
    EN: "{n} items · {kg} kg · serves cooking: {dates}"
  },
  "delivery.modalClose": { ID: "Tutup", EN: "Close" },
  "delivery.noDelivery": { ID: "Tidak ada pengiriman", EN: "No delivery" },
  "delivery.noCooking": { ID: "Tidak masak", EN: "No cooking" },
  "delivery.qtyUnit": { ID: "{qty} kg", EN: "{qty} kg" },
  "delivery.statTotalDays": { ID: "Hari Kirim", EN: "Delivery Days" },
  "delivery.statTotalItems": { ID: "Total Line", EN: "Total Lines" },
  "delivery.statTotalKg": { ID: "Total Qty (kg)", EN: "Total Qty (kg)" },
  "delivery.itemsLabel": { ID: "bahan", EN: "items" },

  // ---------------- GRN QC Panel ----------------
  "grnQc.summary": { ID: "{n} GRN | {qc} dengan QC | {ncr} NCR aktif", EN: "{n} GRNs | {qc} with QC | {ncr} active NCRs" },
  "grnQc.btnNewNcr": { ID: "+ Non-Conformance", EN: "+ Non-Conformance" },
  "grnQc.colGrn": { ID: "GRN", EN: "GRN" },
  "grnQc.colDate": { ID: "Tanggal", EN: "Date" },
  "grnQc.colPo": { ID: "PO", EN: "PO" },
  "grnQc.colSupplier": { ID: "Supplier", EN: "Supplier" },
  "grnQc.colQc": { ID: "QC", EN: "QC" },
  "grnQc.colNcr": { ID: "NCR", EN: "NCR" },
  "grnQc.colStatus": { ID: "Status", EN: "Status" },
  "grnQc.emptyGrn": { ID: "Belum ada GRN.", EN: "No GRNs yet." },
  "grnQc.linkQc": { ID: "QC →", EN: "QC →" },
  "grnQc.logTitle": { ID: "Non-Conformance Log ({n} entri)", EN: "Non-Conformance Log ({n} entries)" },
  "grnQc.colNcrNo": { ID: "NCR", EN: "NCR" },
  "grnQc.colSeverity": { ID: "Severity", EN: "Severity" },
  "grnQc.colIssue": { ID: "Issue", EN: "Issue" },
  "grnQc.colReported": { ID: "Dilaporkan", EN: "Reported" },
  "grnQc.promptCa": { ID: "Corrective action (singkat, muncul di log):", EN: "Corrective action (short, shows in the log):" },
  "grnQc.caDialogTitle": {
    ID: "Corrective Action — {ncr}",
    EN: "Corrective Action — {ncr}"
  },
  "grnQc.caDialogHint": {
    ID: "Singkat namun jelas. Tindakan ini masuk ke log audit NCR.",
    EN: "Short but clear. This entry goes into the NCR audit log."
  },
  "grnQc.caDialogStatus": {
    ID: "Tandai sebagai: {status}",
    EN: "Mark as: {status}"
  },
  "grnQc.caPlaceholder": {
    ID: "mis. Retur 2 karung, supplier ganti Rabu H+1. Foto tersimpan.",
    EN: "e.g. Returned 2 sacks, supplier replaces Wed H+1. Photo logged."
  },
  "grnQc.btnCaSave": { ID: "Simpan", EN: "Save" },
  "grnQc.detailHead": { ID: "QC Checklist", EN: "QC Checklist" },
  "grnQc.closeAria": { ID: "Tutup", EN: "Close" },
  "grnQc.draftTitle": { ID: "Draft Pemeriksaan ({n} checkpoint)", EN: "Inspection Draft ({n} checkpoints)" },
  "grnQc.btnReset": { ID: "Reset", EN: "Reset" },
  "grnQc.phNote": { ID: "catatan", EN: "note" },
  "grnQc.btnSaveDraft": { ID: "Simpan {n} Checkpoint", EN: "Save {n} Checkpoint(s)" },
  "grnQc.saving": { ID: "Menyimpan…", EN: "Saving…" },
  "grnQc.resultsTitle": { ID: "Hasil Pemeriksaan ({n})", EN: "Inspection Results ({n})" },
  "grnQc.loading": { ID: "Memuat…", EN: "Loading…" },
  "grnQc.noChecks": { ID: "Belum ada pemeriksaan untuk GRN ini.", EN: "No checks yet for this GRN." },
  "grnQc.phItem": { ID: "Kode item (contoh: Beras Putih)", EN: "Item code (e.g. White Rice)" },
  "grnQc.btnLoadTemplate": { ID: "Muat Template", EN: "Load Template" },
  "grnQc.newNcrTitle": { ID: "Buat Non-Conformance", EN: "Create Non-Conformance" },
  "grnQc.fldGrnOpt": { ID: "GRN (opsional)", EN: "GRN (optional)" },
  "grnQc.optNoLink": { ID: "— tidak terhubung —", EN: "— not linked —" },
  "grnQc.fldSeverity": { ID: "Severity", EN: "Severity" },
  "grnQc.fldIssue": { ID: "Issue *", EN: "Issue *" },
  "grnQc.phIssue": { ID: "Deskripsi masalah (mis. Beras berkutu 3 karung, tidak sesuai sample)", EN: "Issue description (e.g. 3 sacks of rice infested, not matching sample)" },
  "grnQc.fldQty": { ID: "Qty", EN: "Qty" },
  "grnQc.fldUnit": { ID: "Unit", EN: "Unit" },
  "grnQc.fldCost": { ID: "Kerugian (IDR)", EN: "Loss (IDR)" },
  "grnQc.btnCancelDialog": { ID: "Batal", EN: "Cancel" },
  "grnQc.btnSaveNcr": { ID: "Simpan NCR", EN: "Save NCR" },

  // ---------------- Stock (/stock) ----------------
  "stock.title": { ID: "Stok Gudang SPPG", EN: "SPPG Warehouse Stock" },
  "stock.subtitle": {
    ID: "{sku} SKU | {inStock} ada stok | {empty} kosong",
    EN: "{sku} SKUs | {inStock} in stock | {empty} empty"
  },
  "stock.btnProcurement": { ID: "🧾 PO / GRN", EN: "🧾 PO / GRN" },
  "stock.btnVariance": { ID: "📉 BOM Variance", EN: "📉 BOM Variance" },
  "stock.btnPlanning": { ID: "📈 Kebutuhan →", EN: "📈 Requirements →" },
  "stock.kpiSku": { ID: "SKU Dikelola", EN: "SKUs Managed" },
  "stock.kpiSkuSub": { ID: "{n} ada stok", EN: "{n} in stock" },
  "stock.kpiValue": { ID: "Nilai Stok", EN: "Stock Value" },
  "stock.kpiValueSub": { ID: "harga referensi", EN: "reference price" },
  "stock.kpiEmpty": { ID: "Stok Kosong", EN: "Empty Stock" },
  "stock.kpiEmptySub": { ID: "{pct}% dari SKU", EN: "{pct}% of SKUs" },
  "stock.kpiShort": { ID: "Kurang Hari Ini", EN: "Short Today" },
  "stock.kpiShortSub": { ID: "vs kebutuhan harian", EN: "vs daily needs" },
  "stock.shortTitle": {
    ID: "{n} Item Kurang untuk Hari Ini",
    EN: "{n} Items Short Today"
  },
  "stock.shortHint": {
    ID: "Kekurangan dihitung dari kebutuhan BOM hari ini vs on-hand.",
    EN: "Shortages are calculated from today's BOM requirements vs on-hand stock."
  },
  "stock.catTitle": { ID: "{cat} ({n} item)", EN: "{cat} ({n} items)" },
  "stock.catTotalValue": { ID: "Total nilai", EN: "Total value" },
  "stock.masterTitle": { ID: "Master Stok ({n} item)", EN: "Stock Master ({n} items)" },
  "stock.masterHint": {
    ID: "Semua item master dengan sisa stok agregat, lead time, dan reorder point.",
    EN: "All master items with aggregate on-hand stock, lead time, and reorder point."
  },
  "stock.colHarga": { ID: "Harga", EN: "Price" },
  "stock.colNilai": { ID: "Nilai", EN: "Value" },
  "stock.valueOpen": {
    ID: "Lihat rincian nilai stok",
    EN: "View stock value breakdown"
  },
  "stock.valueModalTitle": {
    ID: "Rincian Nilai Stok · {code}",
    EN: "Stock Value Breakdown · {code}"
  },
  "stock.valueFormula": {
    ID: "{qty} {unit} × {price} = {value}",
    EN: "{qty} {unit} × {price} = {value}"
  },
  "stock.valueBatchesTitle": {
    ID: "Komposisi Batch ({n})",
    EN: "Batch Composition ({n})"
  },
  "stock.valueBatchesEmpty": {
    ID: "Tidak ada batch aktif — nilai dihitung langsung dari total qty × harga satuan.",
    EN: "No active batches — value computed from total qty × unit price."
  },
  "stock.valueColBatch": { ID: "Batch / GRN", EN: "Batch / GRN" },
  "stock.valueColSupplier": { ID: "Supplier", EN: "Supplier" },
  "stock.valueColReceived": { ID: "Masuk", EN: "Received" },
  "stock.valueColExpiry": { ID: "Kadaluarsa", EN: "Expiry" },
  "stock.valueColRemaining": { ID: "Sisa", EN: "Remaining" },
  "stock.valueColValue": { ID: "Nilai", EN: "Value" },
  "stock.valueClose": { ID: "Tutup", EN: "Close" },
  "stock.valueNoBatch": { ID: "(tanpa kode)", EN: "(no code)" },
  "stock.valueNoExpiry": { ID: "—", EN: "—" },
  "stock.valueTotalLabel": { ID: "Total Nilai", EN: "Total Value" },
  "stock.colVolWeekly": { ID: "Vol Mingguan", EN: "Weekly Vol" },
  "stock.statusShort": { ID: "Kurang {gap}", EN: "Short {gap}" },
  "stock.statusEmpty": { ID: "Kosong", EN: "Empty" },
  "stock.statusLow": { ID: "Low {w}w", EN: "Low {w}w" },
  "stock.statusOK": { ID: "OK", EN: "OK" },
  "stock.movesTitle": { ID: "50 Pergerakan Stok Terakhir", EN: "Last 50 Stock Movements" },
  "stock.movesHint": {
    ID: "Riwayat transaksi stok terbaru: terima, konsumsi, dan penyesuaian per batch.",
    EN: "Latest stock transactions: receipts, consumption, and adjustments per batch."
  },
  "stock.movesEmpty": { ID: "Belum ada pergerakan stok.", EN: "No stock movements yet." },
  "stock.colRef": { ID: "Referensi", EN: "Reference" },
  "stock.reasonReceipt": { ID: "Terima", EN: "Receipt" },
  "stock.reasonConsumption": { ID: "Konsumsi", EN: "Consumption" },
  "stock.reasonAdjustment": { ID: "Adjust", EN: "Adjust" },
  "stock.reasonWaste": { ID: "Waste", EN: "Waste" },
  "stock.reasonTransferIn": { ID: "Transfer In", EN: "Transfer In" },
  "stock.reasonTransferOut": { ID: "Transfer Out", EN: "Transfer Out" },
  "stock.reasonOpening": { ID: "Opening", EN: "Opening" },

  // ---------------- Batch & Expiry (0031) ----------------
  "batch.kpiExpiring": { ID: "Akan Kedaluwarsa", EN: "Expiring Soon" },
  "batch.kpiExpiringSub": { ID: "H-14 dari hari ini", EN: "next 14 days" },
  "batch.kpiExpired": { ID: "Kedaluwarsa", EN: "Expired" },
  "batch.kpiExpiredSub": { ID: "perlu dimusnahkan", EN: "needs disposal" },
  "batch.kpiBatchTotal": { ID: "Batch Aktif", EN: "Active Batches" },
  "batch.kpiBatchTotalSub": { ID: "masih ada sisa", EN: "with remaining qty" },
  "batch.kpiQtyAtRisk": { ID: "Qty Berisiko", EN: "Qty At Risk" },
  "batch.kpiQtyAtRiskSub": { ID: "H-14 urgensi tinggi", EN: "14-day urgency" },
  "batch.expiringTitle": { ID: "Batch Kedaluwarsa H-{days}", EN: "Batches Expiring in {days} Days" },
  "batch.expiringHint": {
    ID: "FEFO: First Expired, First Out. Konsumsi duluan batch urgensi tinggi.",
    EN: "FEFO: First Expired, First Out. Consume high-urgency batches first."
  },
  "batch.expiringEmpty": { ID: "Tidak ada batch berisiko kedaluwarsa.", EN: "No batches at risk of expiry." },
  "batch.allTitle": { ID: "Semua Batch Aktif ({n})", EN: "All Active Batches ({n})" },
  "batch.allHint": {
    ID: "Semua batch stok aktif dengan sisa qty, tanggal expiry, dan status QC.",
    EN: "All active stock batches with remaining qty, expiry date, and QC status."
  },
  "batch.allEmpty": { ID: "Belum ada batch aktif. Batch otomatis dibuat saat GRN diterima.", EN: "No active batches yet. Batches are auto-created on GRN receipt." },
  "batch.colBatchCode": { ID: "Kode Batch", EN: "Batch Code" },
  "batch.colReceived": { ID: "Diterima", EN: "Received" },
  "batch.colExpiry": { ID: "Expiry", EN: "Expiry" },
  "batch.colDaysLeft": { ID: "Sisa Hari", EN: "Days Left" },
  "batch.colRemaining": { ID: "Sisa Qty", EN: "Remaining" },
  "batch.statusExpired": { ID: "Kedaluwarsa", EN: "Expired" },
  "batch.statusUrgent": { ID: "Mendesak", EN: "Urgent" },
  "batch.statusSoon": { ID: "Segera", EN: "Soon" },
  "batch.statusOK": { ID: "OK", EN: "OK" },

  // ---------------- Payments / Cashflow (0032) ----------------
  "tabPayments": { ID: "Pembayaran", EN: "Payments" },
  "pay.title": { ID: "Pembayaran & Kas", EN: "Payments & Cashflow" },
  "pay.subtitle": {
    ID: "Kas masuk dari sumber dana (dinas/WFP/IFSR) vs kas keluar ke supplier.",
    EN: "Cash in from funding sources (dinas/WFP/IFSR) vs cash out to suppliers."
  },
  "pay.kpiOutstanding": { ID: "Hutang Outstanding", EN: "Outstanding AP" },
  "pay.kpiOutstandingSub": { ID: "invoice belum lunas", EN: "unpaid invoices" },
  "pay.kpiCashIn": { ID: "Kas Masuk 30h", EN: "Cash In 30d" },
  "pay.kpiCashInSub": { ID: "dari sumber dana", EN: "from funding" },
  "pay.kpiCashOut": { ID: "Kas Keluar 30h", EN: "Cash Out 30d" },
  "pay.kpiCashOutSub": { ID: "ke supplier", EN: "to suppliers" },
  "pay.kpiNet": { ID: "Net 30h", EN: "Net 30d" },
  "pay.kpiNetSub": { ID: "masuk − keluar", EN: "in − out" },
  "pay.outstandingTitle": { ID: "Outstanding per Supplier", EN: "Outstanding by Supplier" },
  "pay.outstandingHint": {
    ID: "Saldo invoice yang belum lunas per supplier dengan umur piutang terpanjang.",
    EN: "Unpaid invoice balance per supplier with the longest aging bucket."
  },
  "pay.outstandingEmpty": { ID: "Semua invoice lunas.", EN: "All invoices paid." },
  "pay.cashflowTitle": { ID: "Cashflow Bulanan", EN: "Monthly Cashflow" },
  "pay.cashflowHint": {
    ID: "Arus kas masuk vs keluar per bulan dengan saldo kumulatif.",
    EN: "Monthly cash in vs out with cumulative balance."
  },
  "pay.recentTitle": { ID: "Pembayaran Terbaru", EN: "Recent Payments" },
  "pay.recentHint": {
    ID: "Pembayaran ke supplier terbaru dengan invoice dan metode bayar.",
    EN: "Recent supplier payments with invoice reference and payment method."
  },
  "pay.recentEmpty": { ID: "Belum ada pembayaran tercatat.", EN: "No payments recorded yet." },
  "pay.receiptsTitle": { ID: "Penerimaan Kas", EN: "Cash Receipts" },
  "pay.receiptsHint": {
    ID: "Penerimaan dana dari sumber internal (BGN, anggaran daerah, hibah).",
    EN: "Incoming funds from internal sources (BGN, regional budget, grants)."
  },
  "pay.receiptsEmpty": { ID: "Belum ada penerimaan kas.", EN: "No cash receipts yet." },
  "pay.btnNewPayment": { ID: "+ Bayar Supplier", EN: "+ Pay Supplier" },
  "pay.btnNewReceipt": { ID: "+ Terima Dana", EN: "+ Record Funding" },
  "pay.colInvoiceCount": { ID: "Invoice", EN: "Invoices" },
  "pay.colOldestDue": { ID: "Jatuh Tempo Tertua", EN: "Oldest Due" },
  "pay.colPaid": { ID: "Terbayar", EN: "Paid" },
  "pay.colOutstanding": { ID: "Sisa", EN: "Outstanding" },
  "pay.colMethod": { ID: "Metode", EN: "Method" },
  "pay.colSource": { ID: "Sumber", EN: "Source" },
  "pay.colPeriod": { ID: "Periode", EN: "Period" },
  "pay.colReference": { ID: "Referensi", EN: "Reference" },
  "pay.colIn": { ID: "Masuk", EN: "Cash In" },
  "pay.colOut": { ID: "Keluar", EN: "Cash Out" },
  "pay.colNet": { ID: "Net", EN: "Net" },
  "pay.colCumulative": { ID: "Akumulasi", EN: "Cumulative" },
  "pay.formTitle": { ID: "Catat Pembayaran", EN: "Record Payment" },
  "pay.formInvoice": { ID: "No Invoice", EN: "Invoice No" },
  "pay.formAmount": { ID: "Jumlah (Rp)", EN: "Amount (Rp)" },
  "pay.formPayDate": { ID: "Tanggal Bayar", EN: "Payment Date" },
  "pay.formMethod": { ID: "Metode", EN: "Method" },
  "pay.formReference": { ID: "No Referensi", EN: "Reference No" },
  "pay.formNote": { ID: "Catatan", EN: "Note" },
  "pay.errPickInvoice": { ID: "Pilih invoice dulu.", EN: "Pick an invoice first." },
  "pay.errAmountZero": { ID: "Jumlah harus lebih dari 0.", EN: "Amount must be greater than 0." },
  "pay.errNoOutstanding": {
    ID: "Invoice ini sudah lunas.",
    EN: "This invoice is fully paid."
  },
  "pay.errOverpay": {
    ID: "Jumlah melebihi sisa tagihan (max {max}).",
    EN: "Amount exceeds outstanding (max {max})."
  },
  "pay.hintMaxOutstanding": {
    ID: "Maksimal: {max}",
    EN: "Max: {max}"
  },
  "pay.receiptFormTitle": { ID: "Catat Penerimaan Kas", EN: "Record Cash Receipt" },
  "pay.receiptFormSource": { ID: "Sumber Dana", EN: "Funding Source" },
  "pay.receiptFormSourceName": { ID: "Nama Detail (ops)", EN: "Source Name (opt)" },
  "pay.receiptFormDate": { ID: "Tanggal Terima", EN: "Receipt Date" },
  "pay.receiptFormPeriod": { ID: "Periode Alokasi (YYYY-MM)", EN: "Allocation Period (YYYY-MM)" },

  // ---------------- Deliveries / POD (0033) ----------------
  "tabDeliveries": { ID: "Pengiriman", EN: "Deliveries" },
  "del.title": { ID: "Pengiriman ke Sekolah", EN: "School Deliveries" },
  "del.subtitle": {
    ID: "Manifest harian, surat jalan, dan proof-of-delivery (POD) per sekolah.",
    EN: "Daily manifest, dispatch slip, and proof-of-delivery per school."
  },
  "del.kpiToday": { ID: "Pengiriman Hari Ini", EN: "Deliveries Today" },
  "del.kpiTodaySub": { ID: "total stop ke sekolah", EN: "total school stops" },
  "del.kpiPorsiDelivered": { ID: "Porsi Terkirim", EN: "Portions Delivered" },
  "del.kpiPorsiDeliveredSub": { ID: "total hari ini", EN: "today's total" },
  "del.kpiFulfilment": { ID: "Fulfilment", EN: "Fulfilment" },
  "del.kpiFulfilmentSub": { ID: "delivered ÷ planned", EN: "delivered ÷ planned" },
  "del.kpiPending": { ID: "Belum Dispatch", EN: "Pending Dispatch" },
  "del.kpiPendingSub": { ID: "status planned", EN: "status planned" },
  "del.todayTitle": { ID: "Manifest Hari Ini", EN: "Today's Manifest" },
  "del.todayHint": {
    ID: "Pengiriman hari ini: rute stop, supir, kendaraan, dan status POD.",
    EN: "Today's deliveries: stop route, driver, vehicle, and POD status."
  },
  "del.todayEmpty": { ID: "Belum ada pengiriman dibuat.", EN: "No deliveries generated yet." },
  "del.historyTitle": { ID: "Riwayat Pengiriman ({n} hari)", EN: "Delivery History ({n} days)" },
  "del.historyHint": {
    ID: "Arsip manifest pengiriman sebelumnya dengan status POD dan catatan lapangan.",
    EN: "Archive of past delivery manifests with POD status and field notes."
  },
  "del.btnGenerate": { ID: "+ Generate Manifest", EN: "+ Generate Manifest" },
  "del.pickDate": { ID: "Tanggal manifest", EN: "Manifest date" },
  "del.btnPOD": { ID: "POD", EN: "POD" },
  "del.statusPlanned": { ID: "Direncanakan", EN: "Planned" },
  "del.statusDispatched": { ID: "Dispatch", EN: "Dispatched" },
  "del.statusDelivered": { ID: "Terkirim", EN: "Delivered" },
  "del.statusPartial": { ID: "Sebagian", EN: "Partial" },
  "del.statusCancelled": { ID: "Batal", EN: "Cancelled" },
  "del.colDriver": { ID: "Driver", EN: "Driver" },
  "del.colVehicle": { ID: "Kendaraan", EN: "Vehicle" },
  "del.colSchool": { ID: "Sekolah", EN: "School" },
  "del.colRecipient": { ID: "Tujuan", EN: "Recipient" },
  "del.colKind": { ID: "Jenis", EN: "Type" },
  "del.kindSchool": { ID: "Sekolah", EN: "School" },
  "del.kindPosyandu": { ID: "Posyandu", EN: "Posyandu" },
  "del.colPlanned": { ID: "Direncanakan", EN: "Planned" },
  "del.colDelivered": { ID: "Terkirim", EN: "Delivered" },
  "del.colArrival": { ID: "Tiba", EN: "Arrival" },
  "del.colReceiver": { ID: "Penerima", EN: "Receiver" },
  "del.colTemp": { ID: "Suhu", EN: "Temp" },
  "del.colFulfilment": { ID: "Fulfilment", EN: "Fulfilment" },
  "del.colStops": { ID: "Stop", EN: "Stops" },
  "del.podTitle": { ID: "Proof of Delivery {no}", EN: "Proof of Delivery {no}" },
  "del.podArrival": { ID: "Waktu Tiba", EN: "Arrival Time" },
  "del.podReceiver": { ID: "Nama Penerima", EN: "Receiver Name" },
  "del.podPorsi": { ID: "Porsi Terkirim", EN: "Portions Delivered" },
  "del.podTemp": { ID: "Suhu (°C)", EN: "Temperature (°C)" },
  "del.podPhoto": { ID: "URL Foto", EN: "Photo URL" },
  "del.podSignature": { ID: "URL Tanda Tangan", EN: "Signature URL" },
  "del.podNote": { ID: "Catatan", EN: "Note" },
  "del.podSubmit": { ID: "Simpan POD", EN: "Save POD" },

  // ---------------- Audit log (0034) ----------------
  "tabAudit": { ID: "Audit Log", EN: "Audit Log" },
  "audit.title": { ID: "Audit Log", EN: "Audit Log" },
  "audit.subtitle": {
    ID: "Jejak perubahan semua tabel penting. Read-only, tidak bisa dihapus.",
    EN: "Change trail for all critical tables. Read-only, immutable."
  },
  "audit.kpiTotal": { ID: "Event 30h", EN: "Events 30d" },
  "audit.kpiActors": { ID: "User Aktif", EN: "Active Users" },
  "audit.kpiTables": { ID: "Tabel Tersentuh", EN: "Tables Touched" },
  "audit.kpiDeletes": { ID: "Delete", EN: "Deletes" },
  "audit.filterTable": { ID: "Tabel", EN: "Table" },
  "audit.filterActor": { ID: "User (email)", EN: "User (email)" },
  "audit.filterAction": { ID: "Aksi", EN: "Action" },
  "audit.filterFrom": { ID: "Dari", EN: "From" },
  "audit.filterTo": { ID: "Sampai", EN: "To" },
  "audit.filterApply": { ID: "Terapkan", EN: "Apply" },
  "audit.listTitle": { ID: "Event Log", EN: "Event Log" },
  "audit.listHint": {
    ID: "Jejak audit perubahan data: siapa, kapan, tabel mana, dan diff sebelum/sesudah.",
    EN: "Data change audit trail: who, when, which table, and before/after diff."
  },
  "audit.empty": { ID: "Tidak ada event yang cocok dengan filter.", EN: "No events match filter." },
  "audit.colTs": { ID: "Waktu", EN: "Time" },
  "audit.colActor": { ID: "User", EN: "User" },
  "audit.colTable": { ID: "Tabel", EN: "Table" },
  "audit.colRow": { ID: "Row PK", EN: "Row PK" },
  "audit.colAction": { ID: "Aksi", EN: "Action" },
  "audit.colDiff": { ID: "Diff", EN: "Diff" },
  "audit.diffBefore": { ID: "Sebelum", EN: "Before" },
  "audit.diffAfter": { ID: "Sesudah", EN: "After" },
  "audit.diffChanged": { ID: "Berubah", EN: "Changed" },

  // ---------------- Budget & cost-per-portion (0035) ----------------
  "tabBudget": { ID: "Anggaran", EN: "Budget" },
  "bud.title": { ID: "Anggaran & Cost per Porsi", EN: "Budget & Cost per Portion" },
  "bud.subtitle": {
    ID: "Burn rate bulanan dari sumber dana vs realisasi belanja & biaya per porsi.",
    EN: "Monthly burn rate from funding sources vs realized spend & unit cost."
  },
  "bud.kpiBudget": { ID: "Total Anggaran", EN: "Total Budget" },
  "bud.kpiBudgetSub": { ID: "periode aktif", EN: "active period" },
  "bud.kpiSpent": { ID: "Realisasi Bayar", EN: "Cash Paid" },
  "bud.kpiSpentSub": { ID: "burn to date", EN: "burn to date" },
  "bud.kpiBurnPct": { ID: "Burn %", EN: "Burn %" },
  "bud.kpiBurnPctSub": { ID: "paid ÷ budget", EN: "paid ÷ budget" },
  "bud.kpiCPP": { ID: "Biaya per Porsi", EN: "Cost per Portion" },
  "bud.kpiCPPSub": { ID: "30 hari terakhir", EN: "last 30 days" },
  "bud.burnTitle": { ID: "Burn Rate Bulanan", EN: "Monthly Burn Rate" },
  "bud.burnHint": {
    ID: "Realisasi belanja vs alokasi anggaran per bulan per sumber dana.",
    EN: "Realized spend vs budget allocation per month per funding source."
  },
  "bud.cppTitle": { ID: "Biaya per Porsi Harian", EN: "Daily Cost per Portion" },
  "bud.cppHint": {
    ID: "Biaya per porsi per hari operasional, dibandingkan dengan target APBN.",
    EN: "Cost per portion per operating day, compared against APBN target."
  },
  "bud.budgetsTitle": { ID: "Master Anggaran", EN: "Budget Master" },
  "bud.budgetsHint": {
    ID: "Semua pos anggaran aktif dengan alokasi, realisasi PO/invoice/paid, dan sisa.",
    EN: "All active budget lines with allocation, PO/invoice/paid realization, and remaining."
  },
  "bud.btnNew": { ID: "+ Tambah Anggaran", EN: "+ New Budget" },
  "bud.colSource": { ID: "Sumber", EN: "Source" },
  "bud.colAmount": { ID: "Jumlah", EN: "Amount" },
  "bud.colTarget": { ID: "Target/Porsi", EN: "Target/Portion" },
  "bud.colPeriod": { ID: "Periode", EN: "Period" },
  "bud.colSpentPO": { ID: "PO", EN: "PO" },
  "bud.colSpentInv": { ID: "Invoice", EN: "Invoice" },
  "bud.colSpentPaid": { ID: "Paid", EN: "Paid" },
  "bud.colRemaining": { ID: "Sisa", EN: "Remaining" },
  "bud.colPorsi": { ID: "Porsi", EN: "Portions" },
  "bud.colCPP": { ID: "Biaya/Porsi", EN: "Cost/Portion" },
  "bud.cppOverTarget": { ID: "Di atas target", EN: "Over target" },
  "bud.cppUnderTarget": { ID: "Di bawah target", EN: "Under target" },

  // ---------------- Supplier portal expansion (0036) ----------------
  "sup.inboxTitle": { ID: "Kotak Masuk PO", EN: "PO Inbox" },
  "sup.inboxHint": {
    ID: "PO yang menunggu keputusan Anda: terima, tolak, atau ajukan perubahan qty/tanggal.",
    EN: "POs awaiting your decision: accept, reject, or propose qty/date changes."
  },
  "sup.ackAccepted": { ID: "Diterima", EN: "Accepted" },
  "sup.ackRejected": { ID: "Ditolak", EN: "Rejected" },
  "sup.ackPartial": { ID: "Sebagian", EN: "Partial" },
  "sup.ackPending": { ID: "Menunggu", EN: "Pending" },
  "sup.btnAccept": { ID: "Terima PO", EN: "Accept PO" },
  "sup.btnReject": { ID: "Tolak", EN: "Reject" },
  "sup.btnPartial": { ID: "Sebagian", EN: "Partial" },
  "sup.ackNote": { ID: "Alasan / catatan", EN: "Reason / note" },
  "sup.ackAltDate": { ID: "Usulan tanggal alternatif", EN: "Alternative delivery date" },
  "sup.uploadTitle": { ID: "Upload Scan Invoice", EN: "Upload Invoice Scan" },
  "sup.uploadHint": {
    ID: "Unggah PDF/foto invoice untuk PO yang sudah GRN. Invoice akan masuk antrian verifikasi.",
    EN: "Upload PDF/photo invoice for POs already GRN'd. Invoice enters verification queue."
  },
  "sup.uploadFormTotal": { ID: "Total Invoice (Rp)", EN: "Invoice Total (Rp)" },
  "sup.uploadFormInvNo": { ID: "No Invoice Anda", EN: "Your Invoice No" },
  "sup.uploadFormFile": { ID: "URL File (PDF/JPG)", EN: "File URL (PDF/JPG)" },
  "sup.uploadSubmit": { ID: "Upload", EN: "Upload" },
  "sup.paymentStatusTitle": { ID: "Status Pembayaran", EN: "Payment Status" },
  "sup.paymentStatusHint": {
    ID: "Status invoice Anda: pending verifikasi, disetujui, paid, atau overdue.",
    EN: "Your invoice status: pending verification, approved, paid, or overdue."
  },
  "sup.messagesTitle": { ID: "Pesan untuk PO {po}", EN: "Messages for PO {po}" },
  "sup.messagePlaceholder": { ID: "Tulis pesan...", EN: "Write a message..." },
  "sup.messageSend": { ID: "Kirim", EN: "Send" },
  "sup.colDecision": { ID: "Keputusan", EN: "Decision" },
  "sup.colGRN": { ID: "GRN", EN: "GRN" },
  "sup.colInvoice": { ID: "Invoice", EN: "Invoice" },
  "sup.colUnread": { ID: "Belum Dibaca", EN: "Unread" },
  "sup.colUploadStatus": { ID: "Status Upload", EN: "Upload Status" },

  // ---------------- Command palette (0037) ----------------
  "cmdk.trigger": { ID: "Cari", EN: "Search" },
  "cmdk.placeholder": { ID: "Cari PO, invoice, supplier, item, sekolah...", EN: "Search PO, invoice, supplier, item, school..." },
  "cmdk.hintOpen": { ID: "⌘K untuk cari", EN: "⌘K to search" },
  "cmdk.empty": { ID: "Ketik minimal 2 karakter untuk mencari.", EN: "Type at least 2 characters to search." },
  "cmdk.noResults": { ID: "Tidak ada hasil.", EN: "No results." },
  "cmdk.groupPO": { ID: "Purchase Orders", EN: "Purchase Orders" },
  "cmdk.groupGRN": { ID: "Good Receipts", EN: "Good Receipts" },
  "cmdk.groupInvoice": { ID: "Invoices", EN: "Invoices" },
  "cmdk.groupQuotation": { ID: "Quotations", EN: "Quotations" },
  "cmdk.groupPR": { ID: "Purchase Requisitions", EN: "Purchase Requisitions" },
  "cmdk.groupItem": { ID: "Items", EN: "Items" },
  "cmdk.groupSupplier": { ID: "Suppliers", EN: "Suppliers" },
  "cmdk.groupMenu": { ID: "Menus", EN: "Menus" },
  "cmdk.groupSchool": { ID: "Schools", EN: "Schools" },
  "cmdk.groupDelivery": { ID: "Deliveries", EN: "Deliveries" },

  // ---------------- Planning (/planning) ----------------
  "planning.title": { ID: "Rencana Kebutuhan Bahan", EN: "Ingredient Requirements Plan" },
  "planning.subtitle": {
    ID: "Proyeksi 5 bulan berdasarkan menu assignment × porsi efektif × BOM",
    EN: "5-month projection based on menu assignment × effective servings × BOM"
  },
  "planning.kpiOpDays": { ID: "Hari Operasional", EN: "Operational Days" },
  "planning.kpiOpDaysSub": { ID: "30 hari ke depan", EN: "next 30 days" },
  "planning.kpiTotalPorsi": { ID: "Total Porsi", EN: "Total Servings" },
  "planning.kpiTotalPorsiSub": { ID: "akumulasi periode", EN: "period total" },
  "planning.kpiTotalKg": { ID: "Total Kebutuhan", EN: "Total Required" },
  "planning.kpiTotalKgSub": { ID: "bahan basah", EN: "wet ingredients" },
  "planning.kpiEstSpend": { ID: "Estimasi Belanja", EN: "Estimated Spend" },
  "planning.kpiEstSpendSub": { ID: "5 bulan ke depan", EN: "next 5 months" },
  "planning.catDistTitle": { ID: "Distribusi Kebutuhan per Kategori (5 bulan)", EN: "Requirements Distribution by Category (5 months)" },
  "planning.matrixTitle": {
    ID: "Matriks Kebutuhan {months} Bulan ({items} komoditas)",
    EN: "Requirements Matrix {months} Months ({items} commodities)"
  },
  "planning.matrixHint": {
    ID: "Top 30 komoditas, urut dari volume terbesar.",
    EN: "Top 30 commodities, ordered by largest volume."
  },
  "planning.matrixEmpty": { ID: "Belum ada data kebutuhan.", EN: "No requirements data yet." },
  "planning.colTotalKg": { ID: "Total kg", EN: "Total kg" },
  "planning.colEstCost": { ID: "Est. Biaya", EN: "Est. Cost" },
  "planning.totalTop30": { ID: "TOTAL (TOP 30)", EN: "TOTAL (TOP 30)" },
  "planning.dailyTitle": { ID: "Planning Harian 30 Hari ke Depan", EN: "Daily Planning for the Next 30 Days" },
  "planning.dailyHint": {
    ID: "Menu harian per tanggal dengan target porsi, kebutuhan bahan, dan status hari operasional.",
    EN: "Daily menu per date with portion targets, ingredient needs, and operating day status."
  },
  "planning.colPorsiEff": { ID: "Porsi Eff", EN: "Eff. Servings" },
  "planning.badgeOP": { ID: "OP", EN: "OP" },
  "planning.forecastTitle": { ID: "Forecast Shortage 30 Hari", EN: "Shortage Forecast 30 Days" },
  "planning.forecastHint": {
    ID: "Proyeksi hari dengan kekurangan stok relatif terhadap rencana BOM.",
    EN: "Projection of days with stock shortages relative to the BOM plan."
  },
  "planning.forecastEmpty": {
    ID: "Tidak ada shortage terdeteksi dalam 30 hari ke depan.",
    EN: "No shortages detected over the next 30 days."
  },
  "planning.tierCritical": { ID: "Kritis", EN: "Critical" },
  "planning.tierHigh": { ID: "Tinggi", EN: "High" },
  "planning.tierMed": { ID: "Sedang", EN: "Medium" },
  "planning.fcHariTerdampak": { ID: "Hari Terdampak", EN: "Affected Days" },
  "planning.fcTotalGap": { ID: "Total Gap", EN: "Total Gap" },
  "planning.fcPeak": { ID: "Puncak / Hari", EN: "Peak / Day" },
  "planning.fcTotalItems": { ID: "Total Item Kurang", EN: "Total Items Short" },
  "planning.fcToday": { ID: "Hari ini", EN: "Today" },
  "planning.fcTomorrow": { ID: "Besok", EN: "Tomorrow" },
  "planning.fcItemsShort": { ID: "{rel} — {n} item kurang", EN: "{rel} — {n} items short" },
  "planning.fcGap": { ID: "gap", EN: "gap" },

  // ---------------- Schools (/schools) ----------------
  "schools.title": { ID: "Sekolah Penerima", EN: "Recipient Schools" },
  "schools.subtitle": {
    ID: "{n} sekolah aktif | {students} siswa | {teachers} guru | porsi efektif",
    EN: "{n} active schools | {students} students | {teachers} teachers | effective servings"
  },
  "schools.studentsSuffix": { ID: "siswa", EN: "students" },
  "schools.teachersSuffix": { ID: "guru", EN: "teachers" },
  "schools.tileActiveLabel": {
    ID: "Sekolah aktif hari ini",
    EN: "Active schools today"
  },
  "schools.tileNonOp": { ID: "Libur hari ini", EN: "Non-operational today" },
  "schools.rosterTitle": { ID: "Rincian Sekolah", EN: "School Details" },
  "schools.rosterHint": {
    ID: "Porsi efektif menentukan volume BOM harian — Kecil (0.7) untuk PAUD/TK + SD kelas 1–3, Besar (1.0) untuk SD kelas 4–6 ke atas.",
    EN: "Effective servings drive daily BOM volume — Small (0.7) for PAUD/TK + SD grades 1–3, Large (1.0) for SD grades 4–6 and above."
  },
  "schools.colId": { ID: "ID", EN: "ID" },
  "schools.colName": { ID: "Nama", EN: "Name" },
  "schools.colLevel": { ID: "Jenjang", EN: "Level" },
  "schools.colStudents": { ID: "Siswa", EN: "Students" },
  "schools.colSmall": { ID: "Kecil", EN: "Small" },
  "schools.colLarge": { ID: "Besar", EN: "Large" },
  "schools.colTeachers": { ID: "Guru", EN: "Teachers" },
  "schools.colEff": { ID: "Total Penerima Manfaat", EN: "Total Beneficiaries" },
  "schools.colDistance": { ID: "Jarak (km)", EN: "Distance (km)" },
  "schools.colContact": { ID: "Kontak", EN: "Contact" },
  "schools.totalLabel": { ID: "TOTAL ({n} sekolah aktif)", EN: "TOTAL ({n} active schools)" },
  "schools.footnote": {
    ID: "Porsi Efektif = (Kecil × 0.7) + (Besar × 1.0) + (Guru × 1.0). Kecil mencakup PAUD/TK dan SD kelas 1–3. Besar mencakup SD kelas 4–6, SMP, SMA, SMK.",
    EN: "Effective Servings = (Small × 0.7) + (Large × 1.0) + (Teachers × 1.0). Small covers PAUD/TK and SD grades 1–3. Large covers SD grades 4–6, SMP, SMA, SMK."
  },
  "schools.footnoteLabel": { ID: "Porsi Efektif", EN: "Effective Servings" },

  // ---------------- Penerima Manfaat (/schools tabs) ----------------
  "penerima.pageTitle": { ID: "Penerima Manfaat", EN: "Beneficiaries" },
  "penerima.pageSubtitle": {
    ID: "Sekolah, ibu hamil/menyusui, dan balita penerima makanan bergizi.",
    EN: "Schools, pregnant/nursing mothers, and toddlers receiving nutritious meals."
  },
  "penerima.tabSekolah": { ID: "Sekolah", EN: "Schools" },
  "penerima.tabBumil": { ID: "Ibu Hamil/Menyusui", EN: "Pregnant/Nursing" },
  "penerima.tabBalita": { ID: "Balita", EN: "Toddlers" },

  "penerima.bumilTitle": {
    ID: "Daftar Ibu Hamil & Menyusui",
    EN: "Pregnant & Nursing Mothers Roster"
  },
  "penerima.bumilHint": {
    ID: "Ibu hamil dan menyusui penerima porsi besar. Data dikelola lewat Posyandu setempat.",
    EN: "Pregnant and nursing mothers receiving large portions. Managed via local Posyandu."
  },
  "penerima.bumilTotal": { ID: "Total Aktif", EN: "Total Active" },
  "penerima.bumilHamil": { ID: "Hamil", EN: "Pregnant" },
  "penerima.bumilMenyusui": { ID: "Menyusui", EN: "Nursing" },

  "penerima.balitaTitle": { ID: "Daftar Balita", EN: "Toddler Roster" },
  "penerima.balitaHint": {
    ID: "Balita (0–59 bulan) penerima porsi kecil. Data dikelola lewat Posyandu setempat.",
    EN: "Toddlers (0–59 months) receiving small portions. Managed via local Posyandu."
  },
  "penerima.balitaTotal": { ID: "Total Aktif", EN: "Total Active" },
  "penerima.balitaLaki": { ID: "Laki-laki", EN: "Male" },
  "penerima.balitaPerempuan": { ID: "Perempuan", EN: "Female" },
  "penerima.balitaUnder2": { ID: "Usia < 2 thn", EN: "Age < 2 yrs" },

  "penerima.colName": { ID: "Nama", EN: "Name" },
  "penerima.colPhase": { ID: "Fase", EN: "Phase" },
  "penerima.colDetailFase": { ID: "Rincian", EN: "Detail" },
  "penerima.colAge": { ID: "Umur", EN: "Age" },
  "penerima.colPosyandu": { ID: "Posyandu", EN: "Posyandu" },
  "penerima.colPhone": { ID: "Telepon", EN: "Phone" },
  "penerima.colAddress": { ID: "Alamat", EN: "Address" },
  "penerima.colGender": { ID: "Jenis Kelamin", EN: "Gender" },
  "penerima.colDob": { ID: "Tanggal Lahir", EN: "Date of Birth" },
  "penerima.colMother": { ID: "Nama Ibu", EN: "Mother's Name" },
  "penerima.phaseHamil": { ID: "Hamil", EN: "Pregnant" },
  "penerima.phaseMenyusui": { ID: "Menyusui", EN: "Nursing" },
  "penerima.genderL": { ID: "Laki-laki", EN: "Male" },
  "penerima.genderP": { ID: "Perempuan", EN: "Female" },

  "schools.attTitle": {
    ID: "Perkiraan Kehadiran Siswa",
    EN: "Expected Student Attendance"
  },
  "schools.attHint": {
    ID: "Isi angka kehadiran per sekolah per tanggal. SD dipecah jadi Porsi Kecil (kelas 1–3) dan Porsi Besar (kelas 4–6) karena bobot porsi BOM-nya berbeda. Default = kapasitas penuh.",
    EN: "Enter attendance per school per date. SD is split into Small Servings (grades 1–3) and Large Servings (grades 4–6) because their BOM weights differ. Default = full capacity."
  },
  "schools.attFillFull": { ID: "Isi Penuh", EN: "Fill Full" },
  "schools.attEst90": { ID: "Estimasi 90%", EN: "90% Estimate" },
  "schools.attEst85": { ID: "Estimasi 85%", EN: "85% Estimate" },
  "schools.attSave": { ID: "Simpan Perkiraan", EN: "Save Estimate" },
  "schools.attSaving": { ID: "Menyimpan…", EN: "Saving…" },
  "schools.attSavedMsg": { ID: "Tersimpan ({n} baris)", EN: "Saved ({n} rows)" },
  "schools.attColSekolah": { ID: "Sekolah", EN: "School" },
  "schools.attColPorsi": { ID: "Porsi", EN: "Servings" },
  "schools.attColKapasitas": { ID: "Kapasitas", EN: "Capacity" },
  "schools.attGroupKecil": { ID: "Porsi Kecil — kelas 1–3", EN: "Small Servings — grades 1–3" },
  "schools.attGroupBesar": { ID: "Porsi Besar — kelas 4–6", EN: "Large Servings — grades 4–6" },
  "schools.attFootnote": {
    ID: "SD ditampilkan 2 baris karena bobot porsi BOM beda — Kecil ×0.7 (kelas 1–3) & Besar ×1.0 (kelas 4–6). Saat disimpan, kedua angka dijumlahkan kembali jadi 1 entri per sekolah per tanggal. Akhir pekan ditandai kuning. Nilai <b class='text-ink'>&lt; kapasitas</b> akan memproporsionalkan kebutuhan bahan untuk tanggal tsb.",
    EN: "SD is shown in 2 rows because BOM serving weights differ — Small ×0.7 (grades 1–3) & Large ×1.0 (grades 4–6). On save, both values are summed back into one entry per school per date. Weekends are highlighted in yellow. A value <b class='text-ink'>&lt; capacity</b> will proportionally reduce ingredient requirements for that date."
  },
  "calParser.title": {
    ID: "Parser Kalender Pendidikan",
    EN: "Education Calendar Parser"
  },
  "calParser.hint": {
    ID: "Paste teks kalender Dinas (rentang tanggal + keterangan). Sistem menguraikan jadi baris non-operasional yang otomatis memblok penjadwalan BOM.",
    EN: "Paste the official education calendar text (date range + description). The system parses it into non-operational rows that automatically block BOM scheduling."
  },
  "calParser.textLabel": { ID: "Teks kalender", EN: "Calendar text" },
  "calParser.btnParse": { ID: "Parse", EN: "Parse" },
  "calParser.btnExample": { ID: "Pakai contoh", EN: "Use example" },
  "calParser.btnReset": { ID: "Reset", EN: "Reset" },
  "calParser.errNoParsed": {
    ID: "Tidak ada baris yang bisa dibaca sebagai tanggal.",
    EN: "No lines could be read as dates."
  },
  "calParser.errNoEntries": {
    ID: "Tidak ada entri yang akan diimpor.",
    EN: "No entries to import."
  },
  "calParser.warnUnrecognized": {
    ID: "{n} baris tidak dikenali",
    EN: "{n} unrecognized lines"
  },
  "calParser.warnMoreLines": {
    ID: "…dan {n} baris lain.",
    EN: "…and {n} more lines."
  },
  "calParser.overrideLabel": {
    ID: "Alasan override (opsional)",
    EN: "Override reason (optional)"
  },
  "calParser.overridePlaceholder": {
    ID: "Kosongkan untuk pakai keterangan per-baris",
    EN: "Leave empty to use per-line description"
  },
  "calParser.btnImporting": { ID: "Mengimport…", EN: "Importing…" },
  "calParser.btnImportN": {
    ID: "Import {n} tanggal",
    EN: "Import {n} dates"
  },
  "calParser.statTotal": { ID: "Total parsed:", EN: "Total parsed:" },
  "calParser.statActive": { ID: "Aktif:", EN: "Active:" },
  "calParser.statNew": { ID: "Baru:", EN: "New:" },
  "calParser.statUpdate": { ID: "Update existing:", EN: "Update existing:" },
  "calParser.statExcluded": { ID: "Dikecualikan:", EN: "Excluded:" },
  "calParser.colInclude": { ID: "Sertakan", EN: "Include" },
  "calParser.colDate": { ID: "Tanggal", EN: "Date" },
  "calParser.colDay": { ID: "Hari", EN: "Day" },
  "calParser.colReason": { ID: "Alasan", EN: "Reason" },
  "calParser.colStatus": { ID: "Status", EN: "Status" },
  "calParser.colLine": { ID: "Baris", EN: "Line" },
  "calParser.badgeSame": { ID: "sama", EN: "same" },
  "calParser.badgeOverride": { ID: "override", EN: "override" },
  "calParser.badgeNew": { ID: "baru", EN: "new" },
  "calParser.readOnly": {
    ID: "Hanya admin/operator yang bisa mengimport kalender pendidikan.",
    EN: "Only admin/operator can import the education calendar."
  },
  "calParser.storedHeader": {
    ID: "Non-operasional tersimpan ({n} tanggal)",
    EN: "Stored non-operational ({n} dates)"
  },
  "calParser.emptyStored": {
    ID: "Belum ada hari non-operasional tersimpan.",
    EN: "No non-operational days stored yet."
  },
  "calParser.colAksi": { ID: "Aksi", EN: "Action" },
  "calParser.btnHapus": { ID: "Hapus", EN: "Delete" },
  "calParser.confirmDelete": {
    ID: "Hapus non-operasional tanggal {date}?",
    EN: "Delete non-operational date {date}?"
  },
  "calParser.msgImported": {
    ID: "Berhasil import {n} tanggal ({new} baru, {update} update).",
    EN: "Successfully imported {n} dates ({new} new, {update} updates)."
  },
  "calParser.msgDeleted": {
    ID: "Tanggal {date} dihapus dari non-operasional.",
    EN: "Date {date} removed from non-operational."
  },

  // ---------------- Menu Master (/menu) ----------------
  "menu.title": { ID: "Master Menu & BOM", EN: "Menu Master & BOM" },
  "menu.subtitle": {
    ID: "Siklus {n} hari | {items} komoditas | {bom} entri BOM | 2 porsi (Kecil 3-9 th / Besar 10 th+)",
    EN: "{n}-day cycle | {items} commodities | {bom} BOM entries | 2 serving sizes (Small 3-9 y / Large 10 y+)"
  },
  "menu.btnCalendar": { ID: "📅 Kalender Menu", EN: "📅 Menu Calendar" },
  "menu.btnVariance": { ID: "📉 BOM Variance", EN: "📉 BOM Variance" },
  "menu.btnPlanning": { ID: "📊 Rencana Kebutuhan →", EN: "📊 Planning →" },
  "menu.kpiActive": { ID: "Menu Aktif", EN: "Active Menus" },
  "menu.kpiActiveSub": { ID: "dari {n} siklus", EN: "of {n} cycles" },
  "menu.kpiAvgGram": { ID: "Rata-rata Gram/Porsi", EN: "Avg Grams/Serving" },
  "menu.kpiAvgGramSub": { ID: "gram bahan basah", EN: "grams wet ingredient" },
  "menu.kpiAvgCost": { ID: "Rata-rata Cost/Porsi", EN: "Avg Cost/Serving" },
  "menu.kpiAvgCostSub": { ID: "harga bahan saja", EN: "ingredient price only" },
  "menu.kpiCommodity": { ID: "Komoditas", EN: "Commodities" },
  "menu.kpiCommoditySub": { ID: "{n} kategori", EN: "{n} categories" },
  "menu.cycleTitle": { ID: "Daftar Menu", EN: "Menu List" },
  "menu.cycleHint": {
    ID: "Tiap kartu menampilkan Bill of Materials per porsi (gram bahan basah).",
    EN: "Each card shows the Bill of Materials per serving (grams of wet ingredient)."
  },
  "menu.bomEmpty": { ID: "Belum ada BOM untuk menu ini.", EN: "No BOM for this menu yet." },
  "menu.colKat": { ID: "Kategori", EN: "Category" },
  "menu.colSmall": { ID: "Kecil", EN: "Small" },
  "menu.colLarge": { ID: "Besar", EN: "Large" },
  "menu.titleSmall": { ID: "PAUD + SD 1-3 (3-9 th)", EN: "PAUD + SD 1-3 (3-9 y)" },
  "menu.titleLarge": { ID: "SD 4-6 + SMP/SMA + Guru (10 th+)", EN: "SD 4-6 + SMP/SMA + Teachers (10 y+)" },
  "menu.gramasiNote": {
    ID: "Gramasi: <b>Kecil</b> = PAUD + SD 1-3 (3-9 th) + Balita; <b>Besar</b> = SD 4-6 + SMP/SMA + Guru (10 th+) + Bumil/Busui",
    EN: "Grammage: <b>Small</b> = PAUD + SD 1-3 (3-9 y) + Toddlers; <b>Large</b> = SD 4-6 + SMP/SMA + Teachers (10 y+) + Pregnant/Nursing"
  },
  "menu.commodityTitle": { ID: "Master Komoditas ({n} item)", EN: "Commodity Master ({n} items)" },
  "menu.commodityHint": {
    ID: "Harga referensi | Dipakai di menu apa saja | Sumber supplier",
    EN: "Reference price | Used in which menus | Supplier sources"
  },
  "menu.colPrice": { ID: "Harga (IDR)", EN: "Price (IDR)" },
  "menu.colUsedIn": { ID: "Dipakai di Menu", EN: "Used in Menus" },
  "menu.totalLabel": { ID: "Total", EN: "Total" },
  "menu.perPorsi": { ID: "/porsi", EN: "/serving" },
  "menu.footer": {
    ID: "Master Menu | Bill of Materials | Data siklus {n} hari — revisi per Go-Live 4 Mei 2026",
    EN: "Menu Master | Bill of Materials | {n}-day cycle data — revised as of Go-Live 4 May 2026"
  },

  // ---------------- Calendar (/calendar) - block A (unique keys; duplicates kept in block B below) ----------------
  "calendar.subtitleOp": {
    ID: "{label} | {op} hari operasional | {hol} libur | {nonop} non-op",
    EN: "{label} | {op} operational days | {hol} holidays | {nonop} non-op"
  },
  "calendar.notAssigned": { ID: "{n} belum dijadwalkan", EN: "{n} unassigned" },
  "calendar.btnLihatBOM": { ID: "🍽️ Lihat BOM", EN: "🍽️ View BOM" },
  "calendar.aria.prevMonth": { ID: "Bulan sebelumnya", EN: "Previous month" },
  "calendar.aria.nextMonth": { ID: "Bulan berikutnya", EN: "Next month" },
  "calendar.autoAssign": { ID: "Auto-assign {n} hari", EN: "Auto-assign {n} days" },
  "calendar.autoAssigning": { ID: "Menjalankan auto-assign…", EN: "Running auto-assign…" },
  "calendar.autoAssignDone": { ID: "Selesai — {n} hari dijadwalkan", EN: "Done — {n} days assigned" },
  "calendar.autoAssignFail": { ID: "Gagal: {msg}", EN: "Failed: {msg}" },
  "calendar.saveCombo": { ID: "Simpan Kombinasi", EN: "Save Combination" },
  "calendar.deleteAssign": { ID: "Hapus Assignment", EN: "Delete Assignment" },
  "calendar.markNonOp": { ID: "Tandai Tidak Operasional", EN: "Mark Non-Operational" },
  "calendar.unmarkNonOp": { ID: "Hapus tanda Tidak Operasional", EN: "Unmark Non-Operational" },
  "calendar.reasonPlaceholder": { ID: "Alasan (opsional)", EN: "Reason (optional)" },
  "calendar.noteLabel": { ID: "Catatan", EN: "Note" },
  "calendar.chooseMenu": { ID: "Pilih menu", EN: "Choose menu" },
  "calendar.inheritedFrom": { ID: "Mewarisi dari hari sebelumnya", EN: "Inherited from previous day" },
  "calendar.assigned": { ID: "Terjadwal", EN: "Assigned" },
  "calendar.holiday": { ID: "Libur", EN: "Holiday" },
  "calendar.weekend": { ID: "Weekend", EN: "Weekend" },
  "calendar.nonOp": { ID: "Non-OP", EN: "Non-OP" },
  "calendar.today": { ID: "Hari ini", EN: "Today" },

  // ---------------- Price List (/price-list) - block A (all keys moved to block B below) ----------------

  // ---------------- DocGen (/docgen) - block A (unique keys; duplicates kept in block B below) ----------------
  "docgen.kpiPOsub": { ID: "Order ke supplier", EN: "Order to supplier" },
  "docgen.kpiGRNsub": { ID: "Goods Receipt", EN: "Goods Receipt" },
  "docgen.kpiLTAsub": { ID: "Supplier signed", EN: "Signed suppliers" },
  "docgen.secPOtitle": { ID: "Purchase Orders", EN: "Purchase Orders" },
  "docgen.secGRNtitle": { ID: "Goods Receipt Notes", EN: "Goods Receipt Notes" },
  "docgen.secInvoiceTitle": { ID: "Invoice", EN: "Invoices" },
  "docgen.secLtaTitle": { ID: "Kontrak LTA", EN: "LTA Contracts" },

  // ---------------- SOP (/sop) ----------------
  "sop.title": { ID: "Standard Operating Procedure", EN: "Standard Operating Procedure" },
  "sop.subtitle": {
    ID: "Manual SOP SPPG | referensi WHO / CODEX / BPOM / Permenkes | 90 hari eksekusi",
    EN: "SPPG SOP manual | WHO / CODEX / BPOM / Permenkes references | 90-day execution"
  },
  "sop.kpiTotal": { ID: "Total SOP", EN: "Total SOPs" },
  "sop.kpiExec": { ID: "Eksekusi 90 hari", EN: "90-day Executions" },
  "sop.kpiAvg": { ID: "Avg Completion", EN: "Avg Completion" },
  "sop.kpiRisk": { ID: "Risiko Teramati", EN: "Observed Risks" },
  "sop.tocTitle": { ID: "Daftar Isi", EN: "Table of Contents" },
  "sop.tocHint": { ID: "Klik untuk buka detail SOP di popup.", EN: "Click to open SOP detail in a popup." },
  "sop.badgeOp": { ID: "{n} Operasional", EN: "{n} Operational" },
  "sop.badgeHg": { ID: "{n} Higiene", EN: "{n} Hygiene" },
  "sop.catOp": { ID: "OPERASIONAL", EN: "OPERATIONAL" },
  "sop.catHg": { ID: "HIGIENE", EN: "HYGIENE" },
  "sop.catCount": { ID: "{cat} ({n} SOP)", EN: "{cat} ({n} SOP)s" },
  "sop.kpiTotalSub": { ID: "{exec} sudah dieksekusi | {rest} belum", EN: "{exec} executed | {rest} pending" },
  "sop.kpiExecSub": { ID: "entry compliance log", EN: "compliance log entries" },
  "sop.kpiAvgSub": { ID: "rata-rata centang langkah", EN: "average step completion" },
  "sop.kpiRiskSub": { ID: "{steps} langkah total | {risks} risiko master", EN: "{steps} total steps | {risks} master risks" },
  "sop.footer": { ID: "SOP Manual | SPPG Nunumeu | Disusun IFSR × FFI untuk WFP × Pemkab TTS | Revisi terakhir 2026-04", EN: "SOP Manual | SPPG Nunumeu | Prepared by IFSR × FFI for WFP × TTS Regency | Last revised 2026-04" },
  "sop.badgeSteps": { ID: "{n} langkah", EN: "{n} steps" },
  "sop.badgeRisks": { ID: "{n} risiko", EN: "{n} risks" },
  "sop.badgeNotExec": { ID: "belum dieksekusi", EN: "not yet executed" },
  "sop.modalLabel": { ID: "SOP {title}", EN: "SOP {title}" },
  "sop.secScope": { ID: "Scope", EN: "Scope" },
  "sop.secSteps": { ID: "Langkah ({n})", EN: "Steps ({n})" },
  "sop.secRisks": { ID: "Risiko Utama ({n})", EN: "Main Risks ({n})" },
  "sop.refLabel": { ID: "Ref:", EN: "Ref:" },
  "sop.btnDownload": { ID: "⬇ Download", EN: "⬇ Download" },
  "sop.menuClose": { ID: "Tutup menu", EN: "Close menu" },
  "sop.menuPdf": { ID: "📄 PDF (Cetak)", EN: "📄 PDF (Print)" },
  "sop.menuHtml": { ID: "🌐 HTML Standalone", EN: "🌐 HTML Standalone" },
  "sop.menuMd": { ID: "📝 Markdown", EN: "📝 Markdown" },
  "sop.btnClose": { ID: "Tutup", EN: "Close" },
  "sop.popupBlocked": { ID: "Popup diblokir browser. Izinkan popup untuk download PDF.", EN: "Browser blocked popup. Please allow popups to download PDF." },
  "sop.mdCategoryLabel": { ID: "**Kategori:**", EN: "**Category:**" },
  "sop.mdRefLabel": { ID: "**Referensi:**", EN: "**Reference:**" },
  "sop.mdStepsHeading": { ID: "Langkah", EN: "Steps" },
  "sop.mdRisksHeading": { ID: "Risiko Utama", EN: "Main Risks" },
  "sop.mdFooter": { ID: "SPPG Nunumeu | IFSR × FFI untuk WFP × Pemkab TTS | {date}", EN: "SPPG Nunumeu | IFSR × FFI for WFP × TTS Regency | {date}" },
  "sop.htmlPrinted": { ID: "Dicetak", EN: "Printed" },
  // Sop run form
  "sopRun.secLabel": { ID: "Catat Eksekusi SOP", EN: "Log SOP Execution" },
  "sopRun.secHeading": { ID: "Checklist compliance — simpan sebagai audit trail", EN: "Compliance checklist — save as audit trail" },
  "sopRun.dateLabel": { ID: "Tanggal Eksekusi", EN: "Execution Date" },
  "sopRun.btnCheckAll": { ID: "Centang semua", EN: "Check all" },
  "sopRun.btnReset": { ID: "Reset", EN: "Reset" },
  "sopRun.stepsDone": { ID: "Langkah dilakukan", EN: "Steps performed" },
  "sopRun.risksObs": { ID: "Risiko yang teramati (opsional)", EN: "Observed risks (optional)" },
  "sopRun.notesLabel": { ID: "Catatan Evaluator", EN: "Evaluator Notes" },
  "sopRun.notesPh": { ID: "Catatan tambahan, kendala, observasi (opsional)…", EN: "Additional notes, issues, observations (optional)…" },
  "sopRun.btnSave": { ID: "Simpan Eksekusi", EN: "Save Execution" },
  "sopRun.btnSaving": { ID: "Menyimpan…", EN: "Saving…" },
  "sopRun.errDate": { ID: "Tanggal eksekusi wajib diisi.", EN: "Execution date is required." },
  "sopRun.okSaved": { ID: "Tercatat (#{id}) — completion {pct}%.", EN: "Recorded (#{id}) — completion {pct}%." },
  "sopRun.noWrite": { ID: "Hanya admin/operator/ahli gizi yang boleh mencatat eksekusi SOP. Tampilan di bawah tetap bisa dilihat sebagai riwayat compliance.", EN: "Only admin/operator/nutritionist roles can log SOP executions. The view below remains available as compliance history." },
  "sopRun.historyLabel": { ID: "Riwayat Eksekusi", EN: "Execution History" },
  "sopRun.historyCount": { ID: "{n} entri terakhir", EN: "{n} recent entries" },
  "sopRun.historyLoading": { ID: "memuat…", EN: "loading…" },
  "sopRun.historyLoadingText": { ID: "Memuat riwayat…", EN: "Loading history…" },
  "sopRun.historyEmpty": { ID: "Belum ada eksekusi tercatat untuk SOP ini.", EN: "No execution logged for this SOP yet." },
  "sopRun.badgeRiskCount": { ID: "⚠ {n} risiko", EN: "⚠ {n} risks" },

  // ---------------- Admin Data (/admin/data) ----------------
  "adminData.title": { ID: "Admin Data Master", EN: "Admin Master Data" },
  "adminData.subtitle": {
    ID: "Tambah, edit, atau reset data master & transaksi. Hanya admin yang punya akses ke modul ini.",
    EN: "Add, edit, or reset master & transaction data. Only admins can access this module."
  },
  "adminData.countItems": { ID: "{n} item", EN: "{n} items" },
  "adminData.countMenus": { ID: "{n} menu", EN: "{n} menus" },
  "adminData.countSuppliers": { ID: "{n} supplier", EN: "{n} suppliers" },
  "adminData.countSchools": { ID: "{n} sekolah", EN: "{n} schools" },
  "adminData.tabItems": { ID: "Bahan Makanan", EN: "Food Items" },
  "adminData.tabMenus": { ID: "Menu", EN: "Menus" },
  "adminData.tabSuppliers": { ID: "Supplier", EN: "Suppliers" },
  "adminData.tabSchools": { ID: "Sekolah", EN: "Schools" },
  "adminData.tabReset": { ID: "Reset Data", EN: "Reset Data" },
  "adminData.statusTitle": { ID: "Status Data Saat Ini", EN: "Current Data Status" },
  "adminData.statusHint": { ID: "Snapshot diambil saat halaman dimuat. Refresh halaman untuk update angka.", EN: "Snapshot taken when the page loaded. Refresh to update numbers." },
  "adminData.tileItems": { ID: "Items", EN: "Items" },
  "adminData.tileMenus": { ID: "Menus", EN: "Menus" },
  "adminData.tileSuppliers": { ID: "Suppliers", EN: "Suppliers" },
  "adminData.tileSchools": { ID: "Sekolah", EN: "Schools" },
  "adminData.tileStockRows": { ID: "Stock rows", EN: "Stock rows" },
  "adminData.tilePO": { ID: "PO", EN: "PO" },
  "adminData.tileGRN": { ID: "GRN", EN: "GRN" },
  "adminData.tileInvoice": { ID: "Invoice", EN: "Invoice" },
  "adminData.tileStockMoves": { ID: "Stock moves", EN: "Stock moves" },
  "adminData.tileTransactions": { ID: "Transactions", EN: "Transactions" },
  "adminData.resetTxTitle": { ID: "Reset Transaksi", EN: "Reset Transactions" },
  "adminData.resetTxHint": { ID: "Hapus semua dokumen procurement & ledger. Master data tetap aman.", EN: "Delete all procurement & ledger documents. Master data stays safe." },
  "adminData.resetTxAffects": { ID: "PO, GRN, Invoice, Receipt, Stock Moves, Transactions — stok diatur ke 0", EN: "PO, GRN, Invoice, Receipt, Stock Moves, Transactions — stock set to 0" },
  "adminData.resetTxKeeps": { ID: "Items, Menu + BOM, Suppliers, Schools, Settings, Profiles, Invites", EN: "Items, Menu + BOM, Suppliers, Schools, Settings, Profiles, Invites" },
  "adminData.resetTxWord": { ID: "RESET TRANSAKSI", EN: "RESET TRANSACTIONS" },
  "adminData.resetStockTitle": { ID: "Reset Stok", EN: "Reset Stock" },
  "adminData.resetStockHint": { ID: "Set stok semua item ke 0 dengan log opening move. Dokumen procurement tetap.", EN: "Set all item stock to 0 with an opening-move log. Procurement documents remain." },
  "adminData.resetStockAffects": { ID: "Stock.qty (semua item ke 0) — log via stock_moves (reason=opening)", EN: "Stock.qty (all items to 0) — logged via stock_moves (reason=opening)" },
  "adminData.resetStockKeeps": { ID: "PO, GRN, Invoice, Transactions, master data", EN: "PO, GRN, Invoice, Transactions, master data" },
  "adminData.resetStockWord": { ID: "RESET STOK", EN: "RESET STOCK" },
  "adminData.resetMasterTitle": { ID: "Reset Master Data", EN: "Reset Master Data" },
  "adminData.resetMasterHint": { ID: "Hapus items, menus, BOM, suppliers, supplier_items, schools. WAJIB Reset Transaksi dulu.", EN: "Delete items, menus, BOM, suppliers, supplier_items, schools. MUST Reset Transactions first." },
  "adminData.resetMasterAffects": { ID: "Items, Menus + BOM, Suppliers, Supplier-Items, Schools, Stock rows", EN: "Items, Menus + BOM, Suppliers, Supplier-Items, Schools, Stock rows" },
  "adminData.resetMasterKeeps": { ID: "Profiles, Invites, Settings", EN: "Profiles, Invites, Settings" },
  "adminData.resetMasterWord": { ID: "HAPUS MASTER", EN: "DELETE MASTER" },
  "adminData.tileAffects": { ID: "Yang dihapus / direset", EN: "Will be deleted / reset" },
  "adminData.tileKeeps": { ID: "Yang tetap aman", EN: "Will stay safe" },
  "adminData.confirmHint": { ID: "ketik \"{word}\" persis", EN: "type \"{word}\" exactly" },
  "adminData.confirmLabel": { ID: "Konfirmasi", EN: "Confirmation" },
  "adminData.btnRunning": { ID: "Memproses…", EN: "Processing…" },
  "adminData.btnRun": { ID: "Jalankan {title} →", EN: "Run {title} →" },
  "adminData.armedReady": { ID: "siap dijalankan", EN: "ready to run" },
  "adminData.armedMismatch": { ID: "konfirmasi belum cocok", EN: "confirmation does not match" },
  "adminData.okMsg": { ID: "{title} berhasil. Data diperbarui.", EN: "{title} succeeded. Data updated." },
  "adminData.errTitle": { ID: "Gagal", EN: "Failed" },
  // items panel
  "adminItems.title": { ID: "Bahan Makanan (items)", EN: "Food Items" },
  "adminItems.hint": { ID: "Master bahan baku. Code = nama unik, dipakai sebagai FK di BOM, stock, PO.", EN: "Raw material master. Code = unique name, used as FK in BOM, stock, PO." },
  "adminItems.btnCancelAdd": { ID: "× Batal Tambah", EN: "× Cancel Add" },
  "adminItems.btnAdd": { ID: "+ Tambah Bahan", EN: "+ Add Item" },
  "adminItems.fldCode": { ID: "Kode (unik)", EN: "Code (unique)" },
  "adminItems.fldCategory": { ID: "Kategori", EN: "Category" },
  "adminItems.fldUnit": { ID: "Satuan", EN: "Unit" },
  "adminItems.fldPrice": { ID: "Harga (IDR)", EN: "Price (IDR)" },
  "adminItems.fldVolWeekly": { ID: "Volume / minggu", EN: "Volume / week" },
  "adminItems.phCode": { ID: "mis. Beras Putih", EN: "e.g. White Rice" },
  "adminItems.phUnit": { ID: "kg, lt, butir", EN: "kg, lt, unit" },
  "adminItems.required": { ID: "wajib", EN: "required" },
  "adminItems.lblActive": { ID: "Aktif", EN: "Active" },
  "adminItems.btnSave": { ID: "Simpan Bahan", EN: "Save Item" },
  "adminItems.btnSaving": { ID: "Menyimpan…", EN: "Saving…" },
  "adminItems.searchLabel": { ID: "Cari kode", EN: "Search code" },
  "adminItems.searchPh": { ID: "ketik untuk filter…", EN: "type to filter…" },
  "adminItems.optAll": { ID: "Semua", EN: "All" },
  "adminItems.filteredOf": { ID: "{shown} dari {total}", EN: "{shown} of {total}" },
  "adminItems.emptyTitle": { ID: "Belum ada bahan", EN: "No items yet" },
  "adminItems.emptyMsg": { ID: "Tambahkan bahan pertama lewat tombol di atas.", EN: "Add the first item using the button above." },
  "adminItems.colCode": { ID: "Kode", EN: "Code" },
  "adminItems.colCategory": { ID: "Kategori", EN: "Category" },
  "adminItems.colUnit": { ID: "Satuan", EN: "Unit" },
  "adminItems.colPrice": { ID: "Harga (IDR)", EN: "Price (IDR)" },
  "adminItems.colVolWk": { ID: "Vol/Mgg", EN: "Vol/Wk" },
  "adminItems.colActive": { ID: "Aktif", EN: "Active" },
  "adminItems.colAction": { ID: "Aksi", EN: "Action" },
  "adminItems.tagActive": { ID: "aktif", EN: "active" },
  "adminItems.tagInactive": { ID: "nonaktif", EN: "inactive" },
  "adminItems.btnEdit": { ID: "Edit", EN: "Edit" },
  "adminItems.btnDelete": { ID: "Hapus", EN: "Delete" },
  "adminItems.btnSaveEdit": { ID: "Simpan", EN: "Save" },
  "adminItems.btnCancelEdit": { ID: "Batal", EN: "Cancel" },
  "adminItems.errCodeReq": { ID: "Kode bahan wajib diisi.", EN: "Item code is required." },
  "adminItems.errUnitReq": { ID: "Satuan wajib diisi (mis. kg, lt, butir).", EN: "Unit is required (e.g. kg, lt, unit)." },
  "adminItems.confirmDel": { ID: "Hapus bahan \"{code}\"? Tidak bisa dihapus jika dipakai BOM/PO.", EN: "Delete item \"{code}\"? Cannot be deleted if used in BOM/PO." },
  // menus panel
  "adminMenus.title": { ID: "Menu (siklus)", EN: "Menu (cycle)" },
  "adminMenus.hint": { ID: "Master menu siklus 10 hari (ADJUSTED WFP × IFSR × FFI). BOM (gramasi tiered P/SD₁₃/SD₄₆/S+) diubah lewat migrasi SQL atau halaman Master Menu.", EN: "10-day cycle menu master (ADJUSTED WFP × IFSR × FFI). BOM (tiered gramming P/SD₁₃/SD₄₆/S+) is edited via SQL migration or Menu Master page." },
  "adminMenus.btnAdd": { ID: "+ Tambah Menu", EN: "+ Add Menu" },
  "adminMenus.btnCancelAdd": { ID: "× Batal Tambah", EN: "× Cancel Add" },
  "adminMenus.fldId": { ID: "ID (1..n, unik)", EN: "ID (1..n, unique)" },
  "adminMenus.fldNameID": { ID: "Nama (ID)", EN: "Name (ID)" },
  "adminMenus.fldNameEN": { ID: "Nama EN", EN: "Name EN" },
  "adminMenus.fldCycleDay": { ID: "Cycle day", EN: "Cycle day" },
  "adminMenus.fldNotes": { ID: "Catatan", EN: "Notes" },
  "adminMenus.phNameID": { ID: "Nasi Ayam Wortel Jagung", EN: "Nasi Ayam Wortel Jagung" },
  "adminMenus.phNameEN": { ID: "Rice with Chicken & Veg", EN: "Rice with Chicken & Veg" },
  "adminMenus.phCycle": { ID: "1..14", EN: "1..14" },
  "adminMenus.phNotes": { ID: "opsional", EN: "optional" },
  "adminMenus.lblActive": { ID: "Aktif", EN: "Active" },
  "adminMenus.btnSave": { ID: "Simpan Menu", EN: "Save Menu" },
  "adminMenus.btnSaving": { ID: "Menyimpan…", EN: "Saving…" },
  "adminMenus.errIdNumeric": { ID: "ID menu wajib angka >= 1.", EN: "Menu ID must be a number >= 1." },
  "adminMenus.errNameReq": { ID: "Nama menu wajib diisi.", EN: "Menu name is required." },
  "adminMenus.confirmDel": { ID: "Hapus menu M{id}? BOM ikut terhapus otomatis. Tidak bisa dihapus jika menu sudah terjadwal di tanggal tertentu.", EN: "Delete menu M{id}? BOM will be deleted automatically. Cannot be deleted if the menu is already scheduled to any date." },
  "adminMenus.searchLabel": { ID: "Cari nama / ID", EN: "Search name / ID" },
  "adminMenus.searchPh": { ID: "ketik untuk filter…", EN: "type to filter…" },
  "adminMenus.filteredOf": { ID: "{shown} dari {total}", EN: "{shown} of {total}" },
  "adminMenus.emptyTitle": { ID: "Belum ada menu", EN: "No menus yet" },
  "adminMenus.colId": { ID: "ID", EN: "ID" },
  "adminMenus.colNameID": { ID: "Nama (ID)", EN: "Name (ID)" },
  "adminMenus.colNameEN": { ID: "Nama EN", EN: "Name EN" },
  "adminMenus.colCycle": { ID: "Cycle Day", EN: "Cycle Day" },
  "adminMenus.colNotes": { ID: "Catatan", EN: "Notes" },
  "adminMenus.colActive": { ID: "Aktif", EN: "Active" },
  "adminMenus.tagActive": { ID: "aktif", EN: "active" },
  "adminMenus.tagInactive": { ID: "nonaktif", EN: "inactive" },
  "adminMenus.btnEdit": { ID: "Edit", EN: "Edit" },
  "adminMenus.btnDelete": { ID: "Hapus", EN: "Delete" },
  "adminMenus.btnSaveEdit": { ID: "Simpan", EN: "Save" },
  "adminMenus.btnCancelEdit": { ID: "Batal", EN: "Cancel" },
  "adminMenus.required": { ID: "wajib", EN: "required" },
  // suppliers panel
  "adminSup.title": { ID: "Supplier", EN: "Suppliers" },
  "adminSup.hint": { ID: "Master vendor. ID format SUP-NN. Status menentukan apakah bisa transact (signed).", EN: "Vendor master. ID format SUP-NN. Status determines whether transactions are allowed (signed)." },
  "adminSup.btnAdd": { ID: "+ Tambah Supplier", EN: "+ Add Supplier" },
  "adminSup.btnCancelAdd": { ID: "× Batal Tambah", EN: "× Cancel Add" },
  "adminSup.fldId": { ID: "ID (unik)", EN: "ID (unique)" },
  "adminSup.fldName": { ID: "Nama", EN: "Name" },
  "adminSup.fldType": { ID: "Tipe", EN: "Type" },
  "adminSup.fldCommodity": { ID: "Komoditas (CSV)", EN: "Commodity (CSV)" },
  "adminSup.fldPic": { ID: "PIC", EN: "PIC" },
  "adminSup.fldPhone": { ID: "HP", EN: "Phone" },
  "adminSup.fldAddress": { ID: "Alamat", EN: "Address" },
  "adminSup.fldEmail": { ID: "Email", EN: "Email" },
  "adminSup.fldScore": { ID: "Score (0-100)", EN: "Score (0-100)" },
  "adminSup.fldStatus": { ID: "Status", EN: "Status" },
  "adminSup.phName": { ID: "CV Pangan Soe", EN: "CV Pangan Soe" },
  "adminSup.phCommodity": { ID: "Beras, Telur", EN: "Rice, Eggs" },
  "adminSup.phPhone": { ID: "+62 8xx", EN: "+62 8xx" },
  "adminSup.lblActive": { ID: "Aktif", EN: "Active" },
  "adminSup.btnSave": { ID: "Simpan Supplier", EN: "Save Supplier" },
  "adminSup.btnSaving": { ID: "Menyimpan…", EN: "Saving…" },
  "adminSup.errIdReq": { ID: "ID supplier wajib (mis. SUP-13).", EN: "Supplier ID is required (e.g. SUP-13)." },
  "adminSup.errNameReq": { ID: "Nama supplier wajib.", EN: "Supplier name is required." },
  "adminSup.confirmDel": { ID: "Hapus supplier {id}? Tidak bisa kalau masih punya PO/invoice. Pertimbangkan set Aktif=false sebagai gantinya.", EN: "Delete supplier {id}? Not possible if still has PO/invoice. Consider setting Active=false instead." },
  "adminSup.searchLabel": { ID: "Cari ID / nama / komoditas", EN: "Search ID / name / commodity" },
  "adminSup.searchPh": { ID: "ketik untuk filter…", EN: "type to filter…" },
  "adminSup.optAll": { ID: "Semua", EN: "All" },
  "adminSup.filteredOf": { ID: "{shown} dari {total}", EN: "{shown} of {total}" },
  "adminSup.emptyTitle": { ID: "Tidak ada supplier", EN: "No suppliers found" },
  "adminSup.colId": { ID: "ID", EN: "ID" },
  "adminSup.colName": { ID: "Nama", EN: "Name" },
  "adminSup.colType": { ID: "Tipe", EN: "Type" },
  "adminSup.colCommodity": { ID: "Komoditas", EN: "Commodity" },
  "adminSup.colPicPhone": { ID: "PIC / HP", EN: "PIC / Phone" },
  "adminSup.colScore": { ID: "Score", EN: "Score" },
  "adminSup.colStatus": { ID: "Status", EN: "Status" },
  "adminSup.tagInactive": { ID: "nonaktif", EN: "inactive" },
  "adminSup.lblPic": { ID: "PIC", EN: "PIC" },
  "adminSup.lblPhone": { ID: "HP", EN: "Phone" },
  "adminSup.btnEdit": { ID: "Edit", EN: "Edit" },
  "adminSup.btnDelete": { ID: "Hapus", EN: "Delete" },
  "adminSup.btnSaveEdit": { ID: "Simpan", EN: "Save" },
  "adminSup.btnCancelEdit": { ID: "Batal", EN: "Cancel" },
  "adminSup.required": { ID: "wajib", EN: "required" },

  // ---------------- Admin Schools (SchoolsPanel) ----------------
  "adminSch.title": { ID: "Sekolah", EN: "Schools" },
  "adminSch.hint": {
    ID: "Master cluster sekolah. Untuk SD: isi kelas13 (porsi kecil) + kelas46 (porsi besar). Selain SD pakai students.",
    EN: "School cluster master. For elementary: fill kelas13 (small portion) + kelas46 (large portion). For others use students."
  },
  "adminSch.btnAdd": { ID: "+ Tambah Sekolah", EN: "+ Add School" },
  "adminSch.btnCancelAdd": { ID: "× Batal Tambah", EN: "× Cancel Add" },
  "adminSch.fldId": { ID: "ID (unik)", EN: "ID (unique)" },
  "adminSch.fldName": { ID: "Nama", EN: "Name" },
  "adminSch.fldLevel": { ID: "Jenjang", EN: "Level" },
  "adminSch.fldStudents": { ID: "Total siswa", EN: "Total students" },
  "adminSch.fldKelas13": { ID: "SD kelas 1-3 (porsi kecil)", EN: "Grades 1-3 (small portion)" },
  "adminSch.fldKelas46": { ID: "SD kelas 4-6 (porsi besar)", EN: "Grades 4-6 (large portion)" },
  "adminSch.fldGuru": { ID: "Guru", EN: "Teachers" },
  "adminSch.fldDistance": { ID: "Jarak (km)", EN: "Distance (km)" },
  "adminSch.fldPic": { ID: "PIC", EN: "PIC" },
  "adminSch.fldPhone": { ID: "HP", EN: "Phone" },
  "adminSch.fldAddress": { ID: "Alamat", EN: "Address" },
  "adminSch.phId": { ID: "SCH-10", EN: "SCH-10" },
  "adminSch.phName": { ID: "SD Inpres Kobelete", EN: "SD Inpres Kobelete" },
  "adminSch.lblActive": { ID: "Aktif", EN: "Active" },
  "adminSch.btnSave": { ID: "Simpan Sekolah", EN: "Save School" },
  "adminSch.btnSaving": { ID: "Menyimpan…", EN: "Saving…" },
  "adminSch.errIdReq": { ID: "ID sekolah wajib (mis. SCH-10).", EN: "School ID is required (e.g. SCH-10)." },
  "adminSch.errNameReq": { ID: "Nama sekolah wajib.", EN: "School name is required." },
  "adminSch.confirmDel": { ID: "Hapus sekolah {id}?", EN: "Delete school {id}?" },
  "adminSch.searchLabel": { ID: "Cari ID / nama / alamat", EN: "Search ID / name / address" },
  "adminSch.searchPh": { ID: "ketik untuk filter…", EN: "type to filter…" },
  "adminSch.filteredOf": { ID: "{shown} dari {total}", EN: "{shown} of {total}" },
  "adminSch.emptyTitle": { ID: "Belum ada sekolah", EN: "No schools yet" },
  "adminSch.colId": { ID: "ID", EN: "ID" },
  "adminSch.colName": { ID: "Nama", EN: "Name" },
  "adminSch.colLevel": { ID: "Jenjang", EN: "Level" },
  "adminSch.colStudents": { ID: "Siswa / K1-3 / K4-6", EN: "Students / G1-3 / G4-6" },
  "adminSch.colGuru": { ID: "Guru", EN: "Teachers" },
  "adminSch.colDistance": { ID: "Jarak", EN: "Distance" },
  "adminSch.colPic": { ID: "PIC", EN: "PIC" },
  "adminSch.phAddress": { ID: "Alamat", EN: "Address" },
  "adminSch.btnEdit": { ID: "Edit", EN: "Edit" },
  "adminSch.btnDelete": { ID: "Hapus", EN: "Delete" },
  "adminSch.btnSaveEdit": { ID: "Simpan", EN: "Save" },
  "adminSch.btnCancelEdit": { ID: "Batal", EN: "Cancel" },
  "adminSch.required": { ID: "wajib", EN: "required" },

  // ---------------- Admin Invite (/admin/invite) ----------------
  "adminInvite.title": { ID: "Admin Undang Pengguna", EN: "Admin Invite Users" },
  "adminInvite.subtitle": {
    ID: "Buat undangan peran (Admin/Operator/Ahli Gizi/Supplier/Observer). Undangan berlaku 7 hari dan diklaim lewat magic-link pada email yang sama.",
    EN: "Create role-based invitations (Admin/Operator/Nutritionist/Supplier/Observer). Invitations are valid for 7 days and claimed via a magic-link sent to the same email."
  },
  "adminInvite.countActive": { ID: "{n} aktif", EN: "{n} active" },
  "adminInvite.countUsed": { ID: "{n} digunakan", EN: "{n} used" },
  "adminInvite.countExpired": { ID: "{n} kadaluarsa", EN: "{n} expired" },
  "adminInvite.recentTitle": { ID: "Undangan Terkini", EN: "Recent Invitations" },
  "adminInvite.recentHint": { ID: "20 undangan terbaru | urut dari paling baru", EN: "20 latest invitations | sorted by most recent" },
  "adminInvite.emptyTitle": { ID: "Belum ada undangan", EN: "No invitations yet" },
  "adminInvite.emptyBody": { ID: "Buat undangan pertama Anda lewat form di atas.", EN: "Create your first invitation with the form above." },
  "adminInvite.colEmail": { ID: "Email", EN: "Email" },
  "adminInvite.colRole": { ID: "Peran", EN: "Role" },
  "adminInvite.colSupplier": { ID: "Supplier", EN: "Supplier" },
  "adminInvite.colStatus": { ID: "Status", EN: "Status" },
  "adminInvite.colExpires": { ID: "Kadaluarsa", EN: "Expires" },
  "adminInvite.badgeUsed": { ID: "DIGUNAKAN", EN: "USED" },
  "adminInvite.badgeExpired": { ID: "KADALUARSA", EN: "EXPIRED" },
  "adminInvite.badgeActive": { ID: "AKTIF", EN: "ACTIVE" },
  "adminInvite.formTitle": { ID: "Buat Undangan Baru", EN: "Create New Invitation" },
  "adminInvite.formHint": { ID: "Email yang diundang akan otomatis terhubung ke profil saat login magic link pertama.", EN: "The invited email will automatically connect to a profile upon the first magic-link login." },
  "adminInvite.fldEmail": { ID: "Email pengguna", EN: "User email" },
  "adminInvite.phEmail": { ID: "nama@instansi.go.id", EN: "name@agency.gov.id" },
  "adminInvite.fldRole": { ID: "Peran", EN: "Role" },
  "adminInvite.fldSupplier": { ID: "Supplier", EN: "Supplier" },
  "adminInvite.supRequired": { ID: "wajib", EN: "required" },
  "adminInvite.supIgnore": { ID: "abaikan", EN: "ignore" },
  "adminInvite.optPickSup": { ID: "— pilih supplier —", EN: "— choose supplier —" },
  "adminInvite.btnSend": { ID: "Buat Undangan →", EN: "Create Invitation →" },
  "adminInvite.btnSending": { ID: "Mengirim…", EN: "Sending…" },
  "adminInvite.badge7Days": { ID: "Berlaku 7 hari, sekali klaim", EN: "Valid 7 days, one-time claim" },
  "adminInvite.okTitle": { ID: "Undangan dibuat", EN: "Invitation created" },
  "adminInvite.okMsg": { ID: "Undangan dibuat untuk {email}. Minta user login via magic link di halaman /login — sistem akan cocokkan email dengan undangan ini.", EN: "Invitation created for {email}. Ask the user to log in via magic link on the /login page — the system will match the email with this invitation." },
  "adminInvite.tokenLabel": { ID: "Token", EN: "Token" },
  "adminInvite.errTitle": { ID: "Gagal buat undangan", EN: "Failed to create invitation" },
  "adminInvite.roleAdmin": { ID: "Admin", EN: "Admin" },
  "adminInvite.roleAdminDesc": { ID: "Full akses semua modul", EN: "Full access to all modules" },
  "adminInvite.roleOperator": { ID: "Operator", EN: "Operator" },
  "adminInvite.roleOperatorDesc": { ID: "Stok, PO, GRN, invoice, receipt", EN: "Stock, PO, GRN, invoice, receipt" },
  "adminInvite.roleNutri": { ID: "Ahli Gizi", EN: "Nutritionist" },
  "adminInvite.roleNutriDesc": { ID: "Menu master, BOM, kalender", EN: "Menu master, BOM, calendar" },
  "adminInvite.roleSupplier": { ID: "Supplier", EN: "Supplier" },
  "adminInvite.roleSupplierDesc": { ID: "Read PO/GRN/invoice miliknya", EN: "Read own PO/GRN/invoice" },
  "adminInvite.roleObserver": { ID: "Observer", EN: "Observer" },
  "adminInvite.roleObserverDesc": { ID: "Read-only (WFP, auditor)", EN: "Read-only (WFP, auditor)" },

  // ---------------- Suppliers (/suppliers) ----------------
  "suppliers.title": { ID: "Supplier & Vendor Matrix", EN: "Supplier & Vendor Matrix" },
  "suppliers.subtitle": {
    ID: "{n} supplier | {signed} signed | {awaiting} awaiting | {rejected} rejected | rata-rata skor",
    EN: "{n} suppliers | {signed} signed | {awaiting} awaiting | {rejected} rejected | avg score"
  },
  "suppliers.kpiSigned": { ID: "Signed LTA", EN: "Signed LTA" },
  "suppliers.kpiSignedSub": { ID: "siap operasional", EN: "ready to operate" },
  "suppliers.kpiAwaiting": { ID: "Awaiting", EN: "Awaiting" },
  "suppliers.kpiAwaitingSub": { ID: "menunggu teken", EN: "awaiting signature" },
  "suppliers.kpiRejected": { ID: "Rejected", EN: "Rejected" },
  "suppliers.kpiRejectedSub": { ID: "skor < 70", EN: "score < 70" },
  "suppliers.kpiReadiness": { ID: "Onboarding Readiness", EN: "Onboarding Readiness" },
  "suppliers.kpiReadinessSub": { ID: "{done}/{total} done | {overdue} overdue", EN: "{done}/{total} done | {overdue} overdue" },
  "suppliers.cardsTitle": { ID: "Daftar Vendor", EN: "Vendor List" },
  "suppliers.cardsHint": {
    ID: "Klik kartu untuk rincian, harga, sertifikasi & histori transaksi.",
    EN: "Click a card for details, pricing, certifications & transaction history."
  },
  "suppliers.cardScore": { ID: "Score", EN: "Score" },
  "suppliers.cardPic": { ID: "PIC", EN: "PIC" },
  "suppliers.cardTel": { ID: "Tel", EN: "Tel" },
  "suppliers.cardEmail": { ID: "Email", EN: "Email" },
  "suppliers.cardCommodity": { ID: "Komoditas ({n} item)", EN: "Commodities ({n} items)" },
  "suppliers.cardInvoices": { ID: "{n} invoice", EN: "{n} invoices" },
  "suppliers.cardDetail": { ID: "Rincian", EN: "Details" },
  "suppliers.cardQuickView": { ID: "Quick view", EN: "Quick view" },
  "suppliers.rejectedTitle": { ID: "Supplier Rejected", EN: "Rejected Suppliers" },
  "suppliers.rejectedHint": {
    ID: "Supplier yang ditolak saat onboarding atau revaluasi. Klik untuk lihat alasan & dokumen.",
    EN: "Suppliers rejected during onboarding or revaluation. Click for reason & documents."
  },
  "suppliers.tableTitle": { ID: "Tabel Lengkap ({n} Supplier)", EN: "Full Table ({n} Suppliers)" },
  "suppliers.tableHint": {
    ID: "Semua supplier aktif dengan scorecard terkini, status LTA, dan kontrak berjalan.",
    EN: "All active suppliers with current scorecard, LTA status, and running contracts."
  },
  "suppliers.colId": { ID: "ID", EN: "ID" },
  "suppliers.colName": { ID: "Nama", EN: "Name" },
  "suppliers.colType": { ID: "Tipe", EN: "Type" },
  "suppliers.colPic": { ID: "PIC", EN: "PIC" },
  "suppliers.colPhone": { ID: "Telepon", EN: "Phone" },
  "suppliers.colEmail": { ID: "Email", EN: "Email" },
  "suppliers.colAddress": { ID: "Alamat", EN: "Address" },
  "suppliers.colKomoditas": { ID: "Komoditas", EN: "Commodities" },
  "suppliers.colItems": { ID: "Items", EN: "Items" },
  "suppliers.colInvoices": { ID: "Invoice", EN: "Invoices" },
  "suppliers.colNotes": { ID: "Catatan", EN: "Notes" },
  "suppliers.colAction": { ID: "Aksi", EN: "Action" },
  "suppliers.colScore": { ID: "Rating", EN: "Rating" },
  "suppliers.colStatus": { ID: "Status", EN: "Status" },
  "suppliers.colSpend": { ID: "Belanja", EN: "Spend" },
  "suppliers.statusSigned": { ID: "signed", EN: "signed" },
  "suppliers.statusAwaiting": { ID: "awaiting", EN: "awaiting" },
  "suppliers.statusDraft": { ID: "draft", EN: "draft" },
  "suppliers.statusRejected": { ID: "rejected", EN: "rejected" },
  "suppliers.searchPh": {
    ID: "Cari nama, ID, PIC, komoditas, alamat…",
    EN: "Search name, ID, PIC, commodity, address…"
  },
  "suppliers.filterType": { ID: "Tipe", EN: "Type" },
  "suppliers.filterStatus": { ID: "Status", EN: "Status" },
  "suppliers.filterAll": { ID: "Semua", EN: "All" },
  "suppliers.sortBy": { ID: "Urutkan", EN: "Sort" },
  "suppliers.sortScoreDesc": { ID: "Skor tertinggi", EN: "Highest score" },
  "suppliers.sortScoreAsc": { ID: "Skor terendah", EN: "Lowest score" },
  "suppliers.sortNameAsc": { ID: "Nama A–Z", EN: "Name A–Z" },
  "suppliers.sortNameDesc": { ID: "Nama Z–A", EN: "Name Z–A" },
  "suppliers.sortSpendDesc": { ID: "Belanja terbanyak", EN: "Highest spend" },
  "suppliers.sortItemsDesc": { ID: "Item terbanyak", EN: "Most items" },
  "suppliers.resultCount": {
    ID: "{n} dari {total} supplier",
    EN: "{n} of {total} suppliers"
  },
  "suppliers.emptyFilter": {
    ID: "Tidak ada supplier yang cocok. Reset filter untuk lihat semua.",
    EN: "No suppliers match. Reset filters to see all."
  },
  "suppliers.reset": { ID: "Reset", EN: "Reset" },

  // ---------------- Supplier Detail (/suppliers/[id]) ----------------
  "supplierDetail.subPic": { ID: "PIC", EN: "PIC" },
  "supplierDetail.btnBack": { ID: "← Semua Supplier", EN: "← All Suppliers" },
  "supplierDetail.btnForecast": { ID: "📅 Forecast 90h", EN: "📅 Forecast 90d" },
  "supplierDetail.btnLTA": { ID: "📄 Generate LTA", EN: "📄 Generate LTA" },
  "supplierDetail.kpiTotalScore": { ID: "Total Score", EN: "Total Score" },
  "supplierDetail.kpiQuality": { ID: "Quality", EN: "Quality" },
  "supplierDetail.kpiQualitySub": { ID: "{pass} pass | {fail} fail", EN: "{pass} pass | {fail} fail" },
  "supplierDetail.kpiDelivery": { ID: "Delivery", EN: "Delivery" },
  "supplierDetail.kpiDeliverySub": { ID: "{n} GRN diterima", EN: "{n} GRN received" },
  "supplierDetail.kpiCompliance": { ID: "Compliance", EN: "Compliance" },
  "supplierDetail.kpiComplianceSub": { ID: "{n} NCR kritikal aktif", EN: "{n} critical NCR open" },
  "supplierDetail.recoRetain": { ID: "RETAIN — performa baik", EN: "RETAIN — good performance" },
  "supplierDetail.recoImprove": { ID: "IMPROVE — butuh pembinaan", EN: "IMPROVE — needs coaching" },
  "supplierDetail.recoWarning": { ID: "WARNING — resiko tinggi", EN: "WARNING — high risk" },
  "supplierDetail.recoReplace": { ID: "REPLACE — exit plan", EN: "REPLACE — exit plan" },
  "supplierDetail.secScorecard": { ID: "Scorecard Otomatis", EN: "Automatic Scorecard" },
  "supplierDetail.secScorecardHint": {
    ID: "Dihitung dari data operasional {start} → {end}. Bobot default: Q 30% | D 25% | P 20% | C 15% | R 10%.",
    EN: "Computed from operational data {start} → {end}. Default weights: Q 30% | D 25% | P 20% | C 15% | R 10%."
  },
  "supplierDetail.scoreQuality": { ID: "Quality", EN: "Quality" },
  "supplierDetail.scoreDelivery": { ID: "Delivery", EN: "Delivery" },
  "supplierDetail.scorePrice": { ID: "Price", EN: "Price" },
  "supplierDetail.scoreCompliance": { ID: "Compliance", EN: "Compliance" },
  "supplierDetail.scoreResponsiveness": { ID: "Responsiveness", EN: "Responsiveness" },
  "supplierDetail.badgeGRN": { ID: "GRN: {n}", EN: "GRN: {n}" },
  "supplierDetail.badgeQCRate": { ID: "QC Pass Rate: {pct}%", EN: "QC Pass Rate: {pct}%" },
  "supplierDetail.badgeActions": { ID: "Actions: {overdue}/{total} overdue", EN: "Actions: {overdue}/{total} overdue" },
  "supplierDetail.badgeNCR": { ID: "NCR Kritikal Open: {n}", EN: "Critical NCR Open: {n}" },
  "supplierDetail.secReval": { ID: "Re-Evaluasi Periodik", EN: "Periodic Re-Evaluation" },
  "supplierDetail.secRevalHint": {
    ID: "Simpan snapshot skor per periode. Klik 'Hitung & Simpan' untuk merekam evaluasi baru.",
    EN: "Save scorecard snapshot per period. Click 'Compute & Save' to record a new evaluation."
  },
  "supplierDetail.secGallery": { ID: "Visual QC Gallery", EN: "Visual QC Gallery" },
  "supplierDetail.secGalleryHint": {
    ID: "{n} foto dari GRN QC + NCR | 60 terbaru.",
    EN: "{n} photos from GRN QC + NCR | latest 60."
  },
  "supplierDetail.galleryEmptyTitle": { ID: "Belum ada foto QC", EN: "No QC photos yet" },
  "supplierDetail.galleryEmptyBody": {
    ID: "Foto akan muncul di sini ketika operator upload photo_url ke QC Check atau NCR.",
    EN: "Photos will appear here when operators upload photo_url to QC Check or NCR."
  },
  "supplierDetail.secItems": { ID: "Komoditas yang Dipasok", EN: "Supplied Commodities" },
  "supplierDetail.secItemsHint": { ID: "{n} item terhubung ke supplier ini.", EN: "{n} items mapped to this supplier." },
  "supplierDetail.itemsEmpty": { ID: "Belum ada mapping item.", EN: "No item mapping yet." },
  "supplierDetail.colItem": { ID: "Item", EN: "Item" },
  "supplierDetail.colMain": { ID: "Main?", EN: "Main?" },
  "supplierDetail.colPrice": { ID: "Harga (IDR)", EN: "Price (IDR)" },
  "supplierDetail.colLead": { ID: "Lead Time", EN: "Lead Time" },
  "supplierDetail.badgeMain": { ID: "utama", EN: "main" },
  "supplierDetail.badgeAlt": { ID: "alternatif", EN: "alternative" },
  "supplierDetail.leadDays": { ID: "{n} hari", EN: "{n} days" },
  "supplierDetail.secCerts": { ID: "Sertifikasi", EN: "Certifications" },
  "supplierDetail.secCertsHint": { ID: "{n} sertifikat terdaftar.", EN: "{n} certificates registered." },
  "supplierDetail.certsEmpty": { ID: "Belum ada sertifikat.", EN: "No certificates yet." },
  "supplierDetail.colCert": { ID: "Sertifikat", EN: "Certificate" },
  "supplierDetail.colValidUntil": { ID: "Berlaku Sampai", EN: "Valid Until" },
  "supplierDetail.colStatus": { ID: "Status", EN: "Status" },
  "supplierDetail.certUnlimited": { ID: "tak terbatas", EN: "unlimited" },
  "supplierDetail.certExpired": { ID: "kedaluwarsa", EN: "expired" },
  "supplierDetail.certValid": { ID: "valid", EN: "valid" },
  "reval.invalidDateRange": { ID: "Rentang tanggal tidak valid.", EN: "Invalid date range." },
  "reval.saved": { ID: "Tersimpan (#{id}).", EN: "Saved (#{id})." },
  "reval.lblPeriod": { ID: "Periode", EN: "Period" },
  "reval.lblFrom": { ID: "Dari", EN: "From" },
  "reval.lblTo": { ID: "Sampai", EN: "To" },
  "reval.lblReco": { ID: "Rekomendasi", EN: "Recommendation" },
  "reval.lblNotes": { ID: "Catatan Evaluator", EN: "Evaluator Notes" },
  "reval.notesPh": { ID: "Catatan tambahan (opsional)…", EN: "Additional notes (optional)…" },
  "reval.btnSaving": { ID: "Menyimpan…", EN: "Saving…" },
  "reval.btnSave": { ID: "Hitung & Simpan Evaluasi", EN: "Compute & Save Evaluation" },
  "reval.emptyHistory": { ID: "Belum ada riwayat evaluasi untuk supplier ini.", EN: "No evaluation history for this supplier yet." },
  "reval.recoRetain": { ID: "RETAIN — pertahankan", EN: "RETAIN — retain" },
  "reval.recoImprove": { ID: "IMPROVE — perbaikan", EN: "IMPROVE — improve" },
  "reval.recoReplace": { ID: "REPLACE — ganti", EN: "REPLACE — replace" },
  "reval.recoExit": { ID: "EXIT — putus kontrak", EN: "EXIT — terminate" },
  "reval.colPeriod": { ID: "Periode", EN: "Period" },
  "reval.colRange": { ID: "Rentang", EN: "Range" },
  "reval.colReco": { ID: "Reco", EN: "Reco" },
  "reval.colEval": { ID: "Evaluasi", EN: "Evaluated" },

  // ---------------- Actions Panel ----------------
  "actions.title": { ID: "Action Tracker (Onboarding & Follow-up)", EN: "Action Tracker (Onboarding & Follow-up)" },
  "actions.totalSuffix": { ID: "({n} total)", EN: "({n} total)" },
  "actions.filterActive": { ID: "Aktif (non-done)", EN: "Active (non-done)" },
  "actions.filterAll": { ID: "Semua status", EN: "All statuses" },
  "actions.filterAllPrio": { ID: "Semua prio", EN: "All priorities" },
  "actions.statusOpen": { ID: "Open", EN: "Open" },
  "actions.statusInProgress": { ID: "In Progress", EN: "In Progress" },
  "actions.statusBlocked": { ID: "Blocked", EN: "Blocked" },
  "actions.statusDone": { ID: "Done", EN: "Done" },
  "actions.statusCancelled": { ID: "Cancelled", EN: "Cancelled" },
  "actions.prioLow": { ID: "Low", EN: "Low" },
  "actions.prioMedium": { ID: "Medium", EN: "Medium" },
  "actions.prioHigh": { ID: "High", EN: "High" },
  "actions.prioCritical": { ID: "Critical", EN: "Critical" },
  "actions.btnClose": { ID: "× Tutup", EN: "× Close" },
  "actions.btnAdd": { ID: "+ Action", EN: "+ Action" },
  "actions.statOverdue": { ID: "Overdue", EN: "Overdue" },
  "actions.statHighCrit": { ID: "High/Crit Open", EN: "High/Crit Open" },
  "actions.emptyFilter": { ID: "Tidak ada action sesuai filter.", EN: "No actions match the filter." },
  "actions.overdueBadge": { ID: "⚠ Overdue", EN: "⚠ Overdue" },
  "actions.daysLate": { ID: "{n}d telat", EN: "{n}d late" },
  "actions.today": { ID: "hari ini", EN: "today" },
  "actions.daysLeft": { ID: "H-{n}", EN: "D-{n}" },
  "actions.owner": { ID: "owner: {name}", EN: "owner: {name}" },
  "actions.blocked": { ID: "Blocked:", EN: "Blocked:" },
  "actions.note": { ID: "Catatan:", EN: "Note:" },
  "actions.blockedReasonPrompt": { ID: "Alasan blocked:", EN: "Reason for block:" },
  "actions.quickNote": { ID: "+ catatan", EN: "+ note" },
  "actions.delete": { ID: "hapus", EN: "delete" },
  "actions.quickNotePrompt": { ID: "Catatan progress / output:", EN: "Progress / output note:" },
  "actions.deleteConfirm": { ID: "Hapus action ini? Tindakan ini tidak bisa dibatalkan.", EN: "Delete this action? This cannot be undone." },
  "actions.errUpdate": { ID: "Gagal update status.", EN: "Failed to update status." },
  "actions.errNote": { ID: "Gagal simpan catatan.", EN: "Failed to save note." },
  "actions.errDelete": { ID: "Gagal hapus.", EN: "Failed to delete." },
  "actions.errSave": { ID: "Gagal simpan.", EN: "Failed to save." },
  "actions.errTitle": { ID: "Judul wajib.", EN: "Title required." },
  "actions.newTitle": { ID: "+ Action Baru", EN: "+ New Action" },
  "actions.phTitle": { ID: "Judul action (wajib)", EN: "Action title (required)" },
  "actions.phDesc": { ID: "Deskripsi (opsional)", EN: "Description (optional)" },
  "actions.phSupplierId": { ID: "Supplier ID (cth: SUP-01)", EN: "Supplier ID (e.g., SUP-01)" },
  "actions.phScope": { ID: "Scope lain (nama supplier / komoditas)", EN: "Other scope (supplier name / commodity)" },
  "actions.phCategory": { ID: "Kategori (cth: Quality Control)", EN: "Category (e.g., Quality Control)" },
  "actions.phOwner": { ID: "Owner / PIC", EN: "Owner / PIC" },
  "actions.srcAdhoc": { ID: "Ad-hoc", EN: "Ad-hoc" },
  "actions.srcOnboarding": { ID: "Onboarding", EN: "Onboarding" },
  "actions.srcMom": { ID: "MoM Meeting", EN: "MoM Meeting" },
  "actions.srcField": { ID: "Field visit", EN: "Field visit" },
  "actions.srcAudit": { ID: "Audit", EN: "Audit" },
  "actions.btnSave": { ID: "💾 Simpan", EN: "💾 Save" },
  "actions.btnCancel": { ID: "Batal", EN: "Cancel" },

  // ---------------- Supplier Detail Modal ----------------
  "supModal.ariaDetail": { ID: "Rincian {name}", EN: "Details {name}" },
  "supModal.fullPanel": { ID: "Panel Lengkap →", EN: "Full Panel →" },
  "supModal.fullPanelTitle": { ID: "Panel lengkap: Re-evaluasi, QC gallery, LTA", EN: "Full panel: Re-evaluation, QC gallery, LTA" },
  "supModal.closeAria": { ID: "Tutup", EN: "Close" },
  "supModal.infoTitle": { ID: "Info Supplier", EN: "Supplier Info" },
  "supModal.infoStatus": { ID: "Status:", EN: "Status:" },
  "supModal.infoScore": { ID: "Score:", EN: "Score:" },
  "supModal.infoPic": { ID: "PIC:", EN: "PIC:" },
  "supModal.infoPhone": { ID: "Telepon:", EN: "Phone:" },
  "supModal.infoEmail": { ID: "Email:", EN: "Email:" },
  "supModal.infoAddress": { ID: "Alamat:", EN: "Address:" },
  "supModal.infoNotes": { ID: "Catatan:", EN: "Notes:" },
  "supModal.ratingTitle": { ID: "Rating & Sertifikasi", EN: "Rating & Certifications" },
  "supModal.ratingScoreText": { ID: "Skor {score}/100 ({stars}/5 bintang)", EN: "Score {score}/100 ({stars}/5 stars)" },
  "supModal.ratingNotYet": { ID: "Belum dinilai", EN: "Not rated yet" },
  "supModal.ratingAria": { ID: "Set rating {n} bintang", EN: "Set rating {n} stars" },
  "supModal.ratingClickToSet": { ID: "Klik untuk set", EN: "Click to set" },
  "supModal.certsTitle": { ID: "Sertifikasi", EN: "Certifications" },
  "supModal.certsEmpty": { ID: "Belum ada sertifikasi tercatat.", EN: "No certifications recorded yet." },
  "supModal.certValidUntil": { ID: "s/d {date}", EN: "until {date}" },
  "supModal.certExpired": { ID: " (kadaluarsa)", EN: " (expired)" },
  "supModal.certDelete": { ID: "Hapus", EN: "Delete" },
  "supModal.certPhName": { ID: "Nama sertifikat (cth: Halal)", EN: "Certificate name (e.g., Halal)" },
  "supModal.certPhUntil": { ID: "Berlaku s/d", EN: "Valid until" },
  "supModal.certBtnAdd": { ID: "+ Sertifikat", EN: "+ Certificate" },
  "supModal.errSaveRating": { ID: "Gagal simpan rating.", EN: "Failed to save rating." },
  "supModal.errCertName": { ID: "Nama sertifikat wajib.", EN: "Certificate name required." },
  "supModal.errSaveCert": { ID: "Gagal simpan sertifikat.", EN: "Failed to save certificate." },
  "supModal.errDeleteCert": { ID: "Hapus sertifikat ini?", EN: "Delete this certificate?" },
  "supModal.errDelete": { ID: "Gagal hapus.", EN: "Failed to delete." },
  "supModal.commodityTitle": { ID: "Daftar Komoditas & Harga", EN: "Commodity & Price List" },
  "supModal.commodityHint": { ID: "edit harga inline, tekan 💾 untuk simpan", EN: "edit price inline, press 💾 to save" },
  "supModal.commodityEmpty": {
    ID: "Supplier belum punya komoditas tercatat. Tambahkan di bawah.",
    EN: "This supplier has no commodities recorded. Add below."
  },
  "supModal.colCommodity": { ID: "Komoditas", EN: "Commodity" },
  "supModal.colUnit": { ID: "Satuan", EN: "Unit" },
  "supModal.colCurrentPrice": { ID: "Harga Saat Ini", EN: "Current Price" },
  "supModal.colHistory": { ID: "Histori", EN: "History" },
  "supModal.colAksi": { ID: "Aksi", EN: "Actions" },
  "supModal.ariaSavePrice": { ID: "Simpan harga", EN: "Save price" },
  "supModal.ariaRemoveItem": { ID: "Hapus komoditas", EN: "Remove commodity" },
  "supModal.errSavePrice": { ID: "Gagal simpan harga.", EN: "Failed to save price." },
  "supModal.confirmRemoveItem": { ID: "Hapus komoditas {code} dari supplier ini?", EN: "Remove commodity {code} from this supplier?" },
  "supModal.errChooseItem": { ID: "Pilih komoditas dulu.", EN: "Select a commodity first." },
  "supModal.errAddItem": { ID: "Gagal tambah.", EN: "Failed to add." },
  "supModal.addItemTitle": { ID: "+ Tambah Komoditas Baru", EN: "+ Add New Commodity" },
  "supModal.allCategories": { ID: "Semua kategori", EN: "All categories" },
  "supModal.chooseCommodity": { ID: "— pilih komoditas —", EN: "— choose commodity —" },
  "supModal.phPriceIdr": { ID: "Harga IDR", EN: "Price IDR" },
  "supModal.btnAdd": { ID: "+ Tambah", EN: "+ Add" },
  "supModal.actionsTitle": { ID: "Action Items — {name}", EN: "Action Items — {name}" },
  "supModal.txTitle": { ID: "Histori Transaksi", EN: "Transaction History" },
  "supModal.txHint": { ID: "20 terakhir", EN: "last 20" },
  "supModal.txEmpty": { ID: "Belum ada transaksi.", EN: "No transactions yet." },
  "supModal.txColDate": { ID: "Tanggal", EN: "Date" },
  "supModal.txColType": { ID: "Tipe", EN: "Type" },
  "supModal.txColNumber": { ID: "Nomor", EN: "Number" },
  "supModal.txColAmount": { ID: "Nilai", EN: "Amount" },
  "supModal.txColStatus": { ID: "Status", EN: "Status" },

  // ---------------- Calendar (/calendar) ----------------
  "calendar.title": { ID: "Kalender Menu", EN: "Menu Calendar" },
  "calendar.subtitle": {
    ID: "{month} | {op} hari operasional | {hol} libur | {nonOp} non-op",
    EN: "{month} | {op} operating days | {hol} holidays | {nonOp} non-op"
  },
  "calendar.unassignedWarn": { ID: "{n} belum dijadwalkan", EN: "{n} not assigned" },
  "calendar.allAssigned": { ID: "semua assigned", EN: "all assigned" },
  "calendar.statOp": { ID: "hari operasional", EN: "operating days" },
  "calendar.statHoliday": { ID: "libur", EN: "holidays" },
  "calendar.statNonOp": { ID: "non-op", EN: "non-op" },
  "calendar.headerHint": {
    ID: "Jadwal rotasi menu harian MBG.",
    EN: "Daily MBG menu rotation schedule."
  },
  "calendar.btnBOM": { ID: "🍽️ Lihat BOM", EN: "🍽️ View BOM" },
  "calendar.prevAria": { ID: "Bulan sebelumnya", EN: "Previous month" },
  "calendar.nextAria": { ID: "Bulan berikutnya", EN: "Next month" },
  "calendar.legendMenu": { ID: "Hari Menu", EN: "Menu Day" },
  "calendar.legendHoliday": { ID: "Libur Nasional", EN: "National Holiday" },
  "calendar.legendWeekend": { ID: "Weekend", EN: "Weekend" },
  "calendar.legendNonOp": { ID: "Tidak Operasional", EN: "Non-Operational" },
  "calendar.legendHint": {
    ID: "Klik tanggal untuk assign menu / tandai Tidak Operasional",
    EN: "Click a date to assign menu / mark as Non-Operational"
  },
  "calendar.holidaysTitle": { ID: "Libur Nasional Bulan Ini", EN: "National Holidays This Month" },
  "calendar.holidaysHint": { ID: "Dihitung otomatis sebagai non-operasional.", EN: "Counted automatically as non-operational." },
  "calendar.notesTitle": { ID: "Keterangan Hari Libur & Non-Operasional", EN: "Holiday & Non-Operational Notes" },
  "calendar.notesHolidaySection": { ID: "Libur Nasional", EN: "National Holidays" },
  "calendar.notesNonOpSection": { ID: "Hari Tidak Operasional", EN: "Non-Operational Days" },
  "calendar.notesEmpty": { ID: "Tidak ada libur atau hari non-operasional pada bulan ini.", EN: "No holidays or non-operational days this month." },

  // ---------------- Calendar Grid (/calendar) ----------------
  "calGrid.recipientLabel": { ID: "{n} penerima", EN: "{n} recipients" },
  "calGrid.clickToAssign": { ID: "klik untuk assign", EN: "click to assign" },
  "calGrid.readOnlyNote": {
    ID: "Mode read-only — hanya admin, operator, dan ahli gizi yang bisa mengubah jadwal.",
    EN: "Read-only mode — only admin, operator, and nutritionist can change the schedule."
  },
  "calGrid.errLoadRef": { ID: "Gagal memuat referensi.", EN: "Failed to load reference." },
  "calGrid.errLoadAtt": { ID: "Gagal memuat kehadiran.", EN: "Failed to load attendance." },
  "calGrid.errSaveMenu": { ID: "Gagal menyimpan menu.", EN: "Failed to save menu." },
  "calGrid.errClearAssign": { ID: "Gagal menghapus assignment.", EN: "Failed to clear assignment." },
  "calGrid.errReasonRequired": { ID: "Alasan non-operasional wajib diisi.", EN: "Non-operational reason is required." },
  "calGrid.errMarkNonOp": { ID: "Gagal menandai non-operasional.", EN: "Failed to mark non-operational." },
  "calGrid.errClearNonOp": { ID: "Gagal menghapus non-operasional.", EN: "Failed to clear non-operational." },
  "calGrid.errSaveAttendance": { ID: "Gagal menyimpan kehadiran.", EN: "Failed to save attendance." },
  "calGrid.modalTitlePrefix": { ID: "Atur Jadwal Menu", EN: "Set Menu Schedule" },
  "calGrid.closeAria": { ID: "Tutup", EN: "Close" },
  "calGrid.step1Title": { ID: "Operasional Hari Ini?", EN: "Operational Today?" },
  "calGrid.btnYesOp": { ID: "✅ Ya, Operasional", EN: "✅ Yes, Operational" },
  "calGrid.btnNoOp": { ID: "⛔ Tidak Operasional", EN: "⛔ Not Operational" },
  "calGrid.scheduled": { ID: "✓ Terjadwal", EN: "✓ Scheduled" },
  "calGrid.notAssignedWarn": {
    ID: "⚠ Belum dijadwalkan — pilih menu di bawah",
    EN: "⚠ Not scheduled yet — choose a menu below"
  },
  "calGrid.step2Title": { ID: "Pilih Menu ID", EN: "Choose Menu ID" },
  "calGrid.btnSetMenu": { ID: "Set Menu", EN: "Set Menu" },
  "calGrid.autoFillHint": {
    ID: "Memilih Menu ID akan otomatis mengisi kombinasi di bawah.",
    EN: "Choosing a Menu ID auto-fills the combination below."
  },
  "calGrid.step3Title": { ID: "Kombinasi Menu", EN: "Menu Combination" },
  "calGrid.loadingIngredients": { ID: "Memuat bahan…", EN: "Loading ingredients…" },
  "calGrid.labelKarbo": { ID: "🍚 Karbohidrat", EN: "🍚 Carbohydrate" },
  "calGrid.labelProtein": { ID: "🍗 Protein", EN: "🍗 Protein" },
  "calGrid.labelSayur": { ID: "🥬 Sayur", EN: "🥬 Vegetable" },
  "calGrid.labelBuah": { ID: "🍌 Buah", EN: "🍌 Fruit" },
  "calGrid.labelNote": { ID: "Catatan (opsional)", EN: "Note (optional)" },
  "calGrid.notePlaceholder": {
    ID: "cth: menu tamu, acara khusus, uji coba menu baru",
    EN: "e.g. guest menu, special event, new menu trial"
  },
  "calGrid.btnSaveCombination": { ID: "Simpan Kombinasi", EN: "Save Combination" },
  "calGrid.btnSaving": { ID: "Menyimpan…", EN: "Saving…" },
  "calGrid.btnDeleteAssign": { ID: "Hapus Assignment", EN: "Remove Assignment" },
  "calGrid.reasonLabel": { ID: "Alasan Non-Operasional", EN: "Non-Operational Reason" },
  "calGrid.reasonPlaceholder": {
    ID: "mis. Libur Nasional, UAS, Rapat Guru",
    EN: "e.g. National Holiday, Finals, Teachers' Meeting"
  },
  "calGrid.reasonHint": {
    ID: "Menandai hari ini sebagai non-op akan menghapus assignment menu jika ada.",
    EN: "Marking this day as non-op will remove any existing menu assignment."
  },
  "calGrid.btnUpdateReason": { ID: "Update Alasan", EN: "Update Reason" },
  "calGrid.btnMarkNonOp": { ID: "Tandai Non-Op", EN: "Mark Non-Op" },
  "calGrid.btnMakeOperational": { ID: "Jadikan Operasional Lagi", EN: "Make Operational Again" },
  "calGrid.defaultNonOpReason": { ID: "Tidak Operasional", EN: "Non-Operational" },
  "calGrid.titleNonOp": { ID: "Non-Op: {reason}", EN: "Non-Op: {reason}" },
  "calGrid.noneUsed": { ID: "— Tidak dipakai —", EN: "— Not used —" },
  "autoAssign.title": {
    ID: "Isi {n} hari kosong bulan ini pakai rolling M1..Mn",
    EN: "Fill {n} empty days this month with rolling M1..Mn"
  },
  "autoAssign.running": { ID: "Menjalankan…", EN: "Running…" },
  "autoAssign.btn": { ID: "⚡ Auto-assign {n} hari", EN: "⚡ Auto-assign {n} days" },
  "autoAssign.alreadyComplete": { ID: "Sudah lengkap.", EN: "Already complete." },
  "autoAssign.assigned": { ID: "{n} hari dijadwalkan.", EN: "{n} days assigned." },

  // ---------------- Price List (/price-list) ----------------
  "priceList.title": { ID: "Weekly Price List", EN: "Weekly Price List" },
  "priceList.subtitleWithPeriod": {
    ID: "Benchmarking harga mingguan Rp/kg | {period}",
    EN: "Weekly price benchmarking IDR/kg | {period}"
  },
  "priceList.subtitle": {
    ID: "Benchmarking harga mingguan Rp/kg",
    EN: "Weekly price benchmarking IDR/kg"
  },
  "priceList.migrationWarn": {
    ID: "Migrasi 0017 belum terpasang.",
    EN: "Migration 0017 is not installed."
  },
  "priceList.migrationBody": {
    ID: "di Supabase SQL Editor, lalu refresh halaman ini. Detail error:",
    EN: "in the Supabase SQL Editor, then refresh this page. Error detail:"
  },
  "priceList.migrationRun": { ID: "Jalankan", EN: "Run" },
  "priceList.shellTitle": {
    ID: "Weekly Price List — Benchmarking Supplier",
    EN: "Weekly Price List — Supplier Benchmarking"
  },
  "priceList.allCommodities": { ID: "Semua komoditas", EN: "All commodities" },
  "priceList.hint": {
    ID: "Benchmark harga mingguan Rp/kg antar supplier. Hijau = termurah, merah = termahal per baris. Period:",
    EN: "Weekly IDR/kg benchmark across suppliers. Green = cheapest, red = most expensive per row. Period:"
  },
  "priceList.saving": { ID: "💾 menyimpan...", EN: "💾 saving..." },
  "priceList.errInvalidNumber": { ID: "Nilai \"{v}\" bukan angka valid", EN: "Value \"{v}\" is not a valid number" },
  "priceList.errSave": { ID: "Gagal menyimpan", EN: "Failed to save" },
  "priceList.colCommodity": { ID: "Komoditas", EN: "Commodity" },
  "priceList.colIngredient": { ID: "Ingredient", EN: "Ingredient" },
  "priceList.colSupplier": { ID: "Supplier", EN: "Supplier" },
  "priceList.colAvg": { ID: "Avg Rp/kg", EN: "Avg IDR/kg" },
  "priceList.colMin": { ID: "Min", EN: "Min" },
  "priceList.colMax": { ID: "Max", EN: "Max" },
  "priceList.empty": {
    ID: "Belum ada data. Tambah entry lewat form atau import dari Weekly_Price_List_Template.xlsx.",
    EN: "No data yet. Add an entry via the form or import from Weekly_Price_List_Template.xlsx."
  },
  "priceList.summaryRows": { ID: "baris", EN: "rows" },
  "priceList.summaryFilled": { ID: "sel terisi", EN: "cells filled" },
  "priceList.weeksCount": { ID: "📅 {n} minggu × 6 komoditas", EN: "📅 {n} weeks × 6 commodities" },
  "priceList.legend": { ID: "🟢 termurah | 🔴 termahal per baris", EN: "🟢 cheapest | 🔴 most expensive per row" },
  "priceList.readOnly": {
    ID: "Read-only — peran Anda tidak punya akses edit.",
    EN: "Read-only — your role does not have edit access."
  },

  // ---------------- DocGen (/docgen) ----------------
  "docgen.title": { ID: "Document Generator", EN: "Document Generator" },
  "docgen.subtitle": {
    ID: "Preview & print dokumen resmi SPPG | PO | GRN | Invoice | Berita Acara",
    EN: "Preview & print official SPPG documents | PO | GRN | Invoice | Receipt Notes"
  },
  "docgen.kpiPO": { ID: "Purchase Order", EN: "Purchase Order" },
  "docgen.kpiPOSub": { ID: "Order ke supplier", EN: "Orders to suppliers" },
  "docgen.kpiGRN": { ID: "GRN", EN: "GRN" },
  "docgen.kpiGRNSub": { ID: "Berita Acara Terima", EN: "Goods Receipt Notes" },
  "docgen.kpiInvoice": { ID: "Invoice", EN: "Invoice" },
  "docgen.kpiInvoiceSub": { ID: "Tagihan supplier", EN: "Supplier invoices" },
  "docgen.kpiLTA": { ID: "Kontrak LTA", EN: "LTA Contract" },
  "docgen.kpiLTASub": { ID: "Long-Term Agreement", EN: "Long-Term Agreement" },
  "docgen.listPO": { ID: "Purchase Orders", EN: "Purchase Orders" },
  "docgen.listGRN": { ID: "Goods Receipt Notes", EN: "Goods Receipt Notes" },
  "docgen.listInvoice": { ID: "Invoice", EN: "Invoice" },
  "docgen.empty": { ID: "Belum ada dokumen.", EN: "No documents yet." },
  "docgen.print": { ID: "Print →", EN: "Print →" },
  "docgen.printBtn": { ID: "🖨️ Print / Save PDF", EN: "🖨️ Print / Save PDF" },
  "docgen.back": { ID: "← Kembali", EN: "← Back" },
  "docgen.typePO": { ID: "Purchase Order", EN: "Purchase Order" },
  "docgen.typeGRN": { ID: "Goods Receipt Note", EN: "Goods Receipt Note" },
  "docgen.typeInvoice": { ID: "Invoice", EN: "Invoice" },
  "docgen.typeBA": { ID: "Berita Acara Terima Barang", EN: "Goods Receipt Minutes" },
  "docgen.typeQT": { ID: "Quotation / RFQ", EN: "Quotation / RFQ" },
  "docgen.toSupplier": { ID: "Kepada (Supplier)", EN: "To (Supplier)" },
  "docgen.receivedFrom": { ID: "Diterima Dari", EN: "Received From" },
  "docgen.biller": { ID: "Penagih (Supplier)", EN: "Biller (Supplier)" },
  "docgen.fldDocNo": { ID: "No. Dokumen", EN: "Document No." },
  "docgen.fldInvNo": { ID: "No. Invoice", EN: "Invoice No." },
  "docgen.fldPODate": { ID: "Tanggal PO", EN: "PO Date" },
  "docgen.fldDelivery": { ID: "Delivery", EN: "Delivery" },
  "docgen.fldStatus": { ID: "Status", EN: "Status" },
  "docgen.fldTOP": { ID: "TOP", EN: "TOP" },
  "docgen.fldPayment": { ID: "Pembayaran", EN: "Payment" },
  "docgen.fldRefContract": { ID: "Ref Kontrak", EN: "Contract Ref" },
  "docgen.fldReceivedDate": { ID: "Tgl Terima", EN: "Received Date" },
  "docgen.fldRefPO": { ID: "Ref PO", EN: "PO Ref" },
  "docgen.fldQCStatus": { ID: "Status QC", EN: "QC Status" },
  "docgen.fldIssued": { ID: "Tgl Terbit", EN: "Issue Date" },
  "docgen.fldDue": { ID: "Jatuh Tempo", EN: "Due Date" },
  "docgen.itemDetailTitle": { ID: "Detail Item ({n} baris)", EN: "Item Details ({n} rows)" },
  "docgen.receivingChecklistTitle": { ID: "Checklist Penerimaan ({n} item)", EN: "Receiving Checklist ({n} items)" },
  "docgen.colNo": { ID: "No.", EN: "No." },
  "docgen.colItem": { ID: "Item", EN: "Item" },
  "docgen.colCategory": { ID: "Kategori", EN: "Category" },
  "docgen.colQty": { ID: "Qty", EN: "Qty" },
  "docgen.colUnit": { ID: "Unit", EN: "Unit" },
  "docgen.colPrice": { ID: "Harga", EN: "Price" },
  "docgen.colSubtotal": { ID: "Subtotal", EN: "Subtotal" },
  "docgen.colPoQty": { ID: "Qty PO", EN: "PO Qty" },
  "docgen.colReceiveQty": { ID: "Qty Terima", EN: "Received Qty" },
  "docgen.colQC": { ID: "QC", EN: "QC" },
  "docgen.totalPO": { ID: "Total Nilai PO", EN: "Total PO Value" },
  "docgen.totalQuotation": { ID: "Total Quotation", EN: "Quotation Total" },
  "docgen.fldQuoteDate": { ID: "Tgl Quotation", EN: "Quote Date" },
  "docgen.fldValidUntil": { ID: "Berlaku s/d", EN: "Valid Until" },
  "docgen.fldNeedDate": { ID: "Tgl Butuh", EN: "Need Date" },
  "docgen.colPriceSuggested": { ID: "Harga Saran", EN: "Suggested Price" },
  "docgen.colPriceQuoted": { ID: "Harga Final", EN: "Final Price" },
  "docgen.colQtyQuoted": { ID: "Qty Final", EN: "Final Qty" },
  "docgen.colNote": { ID: "Catatan", EN: "Note" },
  "docgen.quotationItemTitle": { ID: "Item Ditanyakan ({n} baris)", EN: "Items Requested ({n} rows)" },
  "docgen.noDetailsGRN": { ID: "Tidak ada detail (GRN tanpa PO referensi).", EN: "No details (GRN without PO reference)." },
  "docgen.qcOkReject": { ID: "☐ OK ☐ Reject", EN: "☐ OK ☐ Reject" },
  "docgen.noteLabel": { ID: "Catatan:", EN: "Note:" },
  "docgen.qcNoteLabel": { ID: "Catatan QC:", EN: "QC Note:" },
  "docgen.billAmount": { ID: "Jumlah Tagihan", EN: "Bill Amount" },
  "docgen.transferHint": {
    ID: "Harap transfer ke rekening supplier sesuai kontrak LTA | Mata uang IDR",
    EN: "Please transfer to the supplier account per the LTA contract | Currency IDR"
  },
  "docgen.to": { ID: "Kepada:", EN: "To:" },
  "docgen.orgAddress": {
    ID: "SPPG Nunumeu, Jl. Nunumeu, Kota Soe, Kabupaten Timor Tengah Selatan, Nusa Tenggara Timur",
    EN: "SPPG Nunumeu, Nunumeu St., Soe City, South Central Timor Regency, East Nusa Tenggara"
  },
  "docgen.letterhead1": { ID: "SPPG Nunumeu — MBG Soe", EN: "SPPG Nunumeu — MBG Soe" },
  "docgen.letterhead2": {
    ID: "Jl. Nunumeu, Kota Soe, Kabupaten TTS, Nusa Tenggara Timur",
    EN: "Nunumeu St., Soe City, TTS Regency, East Nusa Tenggara"
  },
  "docgen.letterhead3": {
    ID: "WFP × IFSR × FFI — 9 sekolah, 2.055 siswa + 105 guru",
    EN: "WFP × IFSR × FFI — 9 schools, 2,055 students + 105 teachers"
  },
  "docgen.printedOn": { ID: "Cetak:", EN: "Printed:" },
  "docgen.signCreatedBy": { ID: "Disusun oleh", EN: "Prepared by" },
  "docgen.signApprovedBy": { ID: "Disetujui oleh", EN: "Approved by" },
  "docgen.signReceivedBy": { ID: "Diterima oleh", EN: "Received by" },
  "docgen.signVerifiedBy": { ID: "Diverifikasi oleh", EN: "Verified by" },
  "docgen.signWitness": { ID: "Saksi", EN: "Witness" },
  "docgen.roleOperator": { ID: "Operator SPPG", EN: "SPPG Operator" },
  "docgen.roleHead": { ID: "Kepala SPPG", EN: "SPPG Head" },
  "docgen.roleSupplier": { ID: "Supplier", EN: "Supplier" },
  "docgen.roleFinance": { ID: "Finance", EN: "Finance" },
  "docgen.footer": {
    ID: "Dokumen terbit otomatis dari sistem MBG Soe Supply Chain | Auditable via ref #{no} | {who}",
    EN: "Document auto-generated from MBG Soe Supply Chain | Auditable via ref #{no} | {who}"
  },

  // ---------------- BOM Variance (/menu/variance) ----------------
  "variance.title": { ID: "BOM Variance — Plan vs Actual", EN: "BOM Variance — Plan vs Actual" },
  "variance.subtitle": {
    ID: "Periode {start} → {end} | Threshold ±{pct}%",
    EN: "Period {start} → {end} | Threshold ±{pct}%"
  },
  "variance.noGRN": { ID: "Belum ada GRN actual dalam periode ini", EN: "No actual GRN in this period yet" },
  "variance.btnBackMenu": { ID: "← Master Menu", EN: "← Menu Master" },
  "variance.btnStock": { ID: "📦 Stock →", EN: "📦 Stock →" },
  "variance.filterFrom": { ID: "Dari", EN: "From" },
  "variance.filterTo": { ID: "Sampai", EN: "To" },
  "variance.filterThreshold": { ID: "Threshold (%)", EN: "Threshold (%)" },
  "variance.filterApply": { ID: "Terapkan", EN: "Apply" },
  "variance.kpiScope": { ID: "Item dalam scope", EN: "Items in scope" },
  "variance.kpiScopeSub": {
    ID: "{over} over | {under} under | {ok} ok",
    EN: "{over} over | {under} under | {ok} ok"
  },
  "variance.kpiPlan": { ID: "Rencana", EN: "Plan" },
  "variance.kpiPlanSub": { ID: "berat bahan basah", EN: "wet ingredient weight" },
  "variance.kpiActual": { ID: "Realisasi", EN: "Actual" },
  "variance.kpiActualSub": { ID: "dari GRN ok/partial", EN: "from ok/partial GRN" },
  "variance.kpiVariance": { ID: "Variance", EN: "Variance" },
  "variance.secPerItem": { ID: "Per Item", EN: "Per Item" },
  "variance.secPerItemHint": {
    ID: "Plan dihitung dari menu_assign × gramasi tiered × porsi hadir. Actual dari GRN (status ok/partial). Flag OVER/UNDER jika |variance| > {pct}%.",
    EN: "Plan is computed from menu_assign × tiered grammage × servings attended. Actual from GRN (ok/partial status). Flag OVER/UNDER when |variance| > {pct}%."
  },
  "variance.emptyTitle": { ID: "Tidak ada data variance", EN: "No variance data" },
  "variance.emptyBody": {
    ID: "Belum ada plan/actual untuk rentang tanggal ini. Pastikan penjadwalan menu sudah dibuat dan periode meliputi hari kerja.",
    EN: "No plan/actual data for this date range yet. Make sure menu scheduling has been generated and the period covers workdays."
  },
  "variance.colFlag": { ID: "Flag", EN: "Flag" },
  "variance.colPlanKg": { ID: "Plan (kg)", EN: "Plan (kg)" },
  "variance.colActualKg": { ID: "Actual (kg)", EN: "Actual (kg)" },
  "variance.colDeltaKg": { ID: "Δ (kg)", EN: "Δ (kg)" },
  "variance.colDeltaPct": { ID: "Δ (%)", EN: "Δ (%)" },
  "variance.secPerMenu": { ID: "Per Menu", EN: "Per Menu" },
  "variance.secPerMenuHint": {
    ID: "Breakdown rencana per menu: jumlah hari tersajikan, total porsi, total kg bahan, dan perkiraan cost bahan.",
    EN: "Plan breakdown per menu: days served, total servings, total ingredient kg, and estimated ingredient cost."
  },
  "variance.emptyMenu": { ID: "Belum ada menu aktif dalam rentang tanggal.", EN: "No active menu in the date range." },
  "variance.colDays": { ID: "Hari", EN: "Days" },
  "variance.colPorsi": { ID: "Porsi", EN: "Servings" },
  "variance.colTotalBahan": { ID: "Total Bahan", EN: "Total Ingredient" },
  "variance.colCostBahan": { ID: "Cost Bahan", EN: "Ingredient Cost" },
  "variance.footer": {
    ID: "BOM Variance | basis tiered gramasi 4 age-band | fallback grams_per_porsi | go-live 4 Mei 2026",
    EN: "BOM Variance | tiered 4-age-band grammage | grams_per_porsi fallback | go-live 4 May 2026"
  },

  // ---------------- Supplier Forecast (/supplier/forecast) ----------------
  "supForecast.incompleteTitle": { ID: "Profil supplier belum lengkap", EN: "Supplier profile incomplete" },
  "supForecast.incompleteBody": {
    ID: "Akun supplier kamu belum ditautkan ke record supplier. Hubungi admin SPPG.",
    EN: "Your supplier account is not linked to a supplier record yet. Contact the SPPG admin."
  },

  // ---------------- Procurement sub-pages ----------------
  "prNew.title": { ID: "Buat Purchase Requisition", EN: "Create Purchase Requisition" },
  "prNew.subtitle": {
    ID: "Agregasi kebutuhan tanggal tertentu → bagi ke beberapa supplier (qty absolut) → otomatis membuat quotation per supplier.",
    EN: "Aggregate requirements for a given date → split across several suppliers (absolute qty) → automatically create a quotation per supplier."
  },
  "prNew.fldNeedDate": { ID: "Tanggal Butuh Barang", EN: "Needed By" },
  "prNew.fldNeedDateHint": { ID: "Sistem mengisi otomatis item & qty dari kebutuhan menu tanggal tsb.", EN: "The system auto-fills items & qty from the menu requirements for that date." },
  "prNew.fldNotes": { ID: "Catatan (opsional)", EN: "Notes (optional)" },
  "prNew.phNotes": { ID: "mis. butuh untuk minggu 1 Mei", EN: "e.g. needed for week of 1 May" },
  "prNew.helper": {
    ID: "Setelah PR dibuat, kamu bisa membagi tiap item ke beberapa supplier dengan qty absolut, lalu membuat quotation per supplier sekali klik.",
    EN: "Once a PR is created, you can split each item across several suppliers with absolute qty, then create a quotation per supplier in one click."
  },
  "prNew.btnCreate": { ID: "📋 Buat PR & Muat Kebutuhan", EN: "📋 Create PR & Load Requirements" },
  "prNew.creating": { ID: "Membuat…", EN: "Creating…" },

  // ---------------- PR Detail (/procurement/requisition/[no]) ----------------
  "prDetail.title": { ID: "Purchase Requisition #{no}", EN: "Purchase Requisition #{no}" },
  "prDetail.subNeed": { ID: "butuh {date}", EN: "needed {date}" },
  "prDetail.subItems": { ID: "{n} item", EN: "{n} items" },
  "prDetail.subAlloc": { ID: "{n} alokasi", EN: "{n} allocations" },
  "prDetail.notesTitle": { ID: "Catatan", EN: "Notes" },
  "prDetail.notesHint": { ID: "Dari pembuat PR", EN: "From the PR creator" },
  "prDetail.splitTitle": { ID: "Split Allocation ({n} item)", EN: "Split Allocation ({n} items)" },
  "prDetail.splitHint": {
    ID: "Qty absolut per supplier. Gap = qty_total − sum(planned). Kalau supplier balas qty < planned, tambah alokasi baru ke supplier cadangan untuk tutup gap.",
    EN: "Absolute qty per supplier. Gap = qty_total − sum(planned). If a supplier responds with qty < planned, add a new allocation to a backup supplier to close the gap."
  },
  "prDetail.splitEmpty": {
    ID: "PR ini belum punya item. Mungkin tanggal butuh tidak punya menu assigned.",
    EN: "This PR has no items yet. The needed date may not have any menu assigned."
  },
  "prDetail.qtTitle": { ID: "Quotations ({n})", EN: "Quotations ({n})" },
  "prDetail.qtHint": {
    ID: "Quotation yang sudah dispawn dari PR ini. Klik detail untuk isi harga final & convert ke PO.",
    EN: "Quotations spawned from this PR. Click detail to fill in final price & convert to PO."
  },
  "prDetail.qtEmptyWrite": {
    ID: "Belum ada quotation dispawn. Tambah alokasi dulu, lalu klik 'Generate Quotations'.",
    EN: "No quotations spawned yet. Add allocations first, then click 'Generate Quotations'."
  },
  "prDetail.qtEmpty": { ID: "Belum ada quotation.", EN: "No quotations yet." },
  "prDetail.colNo": { ID: "No", EN: "No" },
  "prDetail.colSupplier": { ID: "Supplier", EN: "Supplier" },
  "prDetail.colStatus": { ID: "Status", EN: "Status" },
  "prDetail.colValue": { ID: "Nilai", EN: "Amount" },
  "prDetail.colPo": { ID: "PO", EN: "PO" },
  "prDetail.linkDetail": { ID: "Detail →", EN: "Detail →" },
  "prActions.confirm": { ID: "Generate quotation untuk {n} alokasi yang belum dispawn?", EN: "Generate quotations for {n} allocations not yet spawned?" },
  "prActions.noneSpawned": { ID: "Tidak ada alokasi baru yang bisa dispawn.", EN: "No new allocations can be spawned." },
  "prActions.done": { ID: "✅ {n} quotation dispawn:\n{list}", EN: "✅ {n} quotation(s) spawned:\n{list}" },
  "prActions.btnGen": { ID: "🚀 Generate Quotations ({n})", EN: "🚀 Generate Quotations ({n})" },
  "prActions.processing": { ID: "Memproses…", EN: "Processing…" },
  "prAlloc.errPickSup": { ID: "Pilih supplier.", EN: "Pick a supplier." },
  "prAlloc.errQty": { ID: "Qty harus > 0.", EN: "Qty must be > 0." },
  "prAlloc.confirmDel": { ID: "Hapus alokasi ini?", EN: "Delete this allocation?" },
  "prAlloc.colNo": { ID: "No.", EN: "No." },
  "prAlloc.colItem": { ID: "Item", EN: "Item" },
  "prAlloc.colQtyTotal": { ID: "Qty Total", EN: "Qty Total" },
  "prAlloc.colPlanned": { ID: "Planned", EN: "Planned" },
  "prAlloc.colQuoted": { ID: "Quoted", EN: "Quoted" },
  "prAlloc.colPo": { ID: "PO", EN: "PO" },
  "prAlloc.colGap": { ID: "Gap", EN: "Gap" },
  "prAlloc.colAlloc": { ID: "Alokasi Supplier", EN: "Supplier Allocation" },
  "prAlloc.optPickSup": { ID: "— Supplier —", EN: "— Supplier —" },
  "prAlloc.phQty": { ID: "Qty", EN: "Qty" },
  "prAlloc.phNote": { ID: "Catatan (opsional)", EN: "Notes (optional)" },
  "prAlloc.btnSave": { ID: "Simpan", EN: "Save" },
  "prAlloc.btnCancel": { ID: "Batal", EN: "Cancel" },
  "prAlloc.btnAdd": { ID: "+ Alokasi supplier", EN: "+ Supplier allocation" },
  "prAlloc.gapLbl": { ID: "(gap {qty} {unit})", EN: "(gap {qty} {unit})" },
  "prAlloc.btnEditInline": { ID: "ubah", EN: "edit" },
  "prAlloc.btnDelInline": { ID: "hapus", EN: "delete" },
  "prAlloc.btnOk": { ID: "OK", EN: "OK" },
  "prAlloc.btnCancelInline": { ID: "batal", EN: "cancel" },
  "prAlloc.locked": { ID: "(terkunci — quotation sudah dispawn)", EN: "(locked — quotation already spawned)" },
  "qtNew.title": { ID: "Buat Quotation Baru", EN: "Create New Quotation" },
  "qtNew.subtitle": {
    ID: "Draft harga ke supplier | isi manual atau seed dari tanggal menu | export .xlsx untuk ditandatangani supplier.",
    EN: "Price draft to supplier | fill manually or seed from a menu date | export .xlsx for supplier signature."
  },
  "qtNew.optPickSup": { ID: "— Pilih supplier —", EN: "— Pick a supplier —" },
  "qtNew.step2Desc": {
    ID: "Otomatis mengisi item & qty dari kebutuhan menu tanggal tertentu. Harga saran = harga PO terakhir atau harga katalog sebagai cadangan.",
    EN: "Auto-fills items & qty from menu demand on a given date. Suggested price = last PO price or catalog price as fallback."
  },
  "qtNew.fldMenuDate": { ID: "Tanggal Menu", EN: "Menu Date" },
  "qtNew.btnSeed": { ID: "🌱 Seed dari tanggal ini", EN: "🌱 Seed from this date" },
  "qtNew.btnSeeding": { ID: "Mengambil…", EN: "Fetching…" },
  "qtNew.btnResetRows": { ID: "Reset Rows", EN: "Reset Rows" },
  "qtNew.errNoDemand": {
    ID: "Tidak ada kebutuhan untuk tanggal tsb (menu belum assigned / non-op).",
    EN: "No demand for that date (menu not assigned / non-op)."
  },
  "qtNew.errMinRow": {
    ID: "Minimal satu baris item dengan qty > 0.",
    EN: "At least one item row with qty > 0."
  },
  "qtNew.errFail": { ID: "Gagal buat quotation.", EN: "Failed to create quotation." },
  "qtNew.errRowFail": {
    ID: "Quotation {no} dibuat tapi rows gagal: {msg}",
    EN: "Quotation {no} created but rows failed: {msg}"
  },
  "qtNew.btnAddRow": { ID: "+ Tambah Baris", EN: "+ Add Row" },
  "qtNew.colNo": { ID: "No.", EN: "No." },
  "qtNew.colItem": { ID: "Item", EN: "Item" },
  "qtNew.colQty": { ID: "Qty", EN: "Qty" },
  "qtNew.colUnit": { ID: "Unit", EN: "Unit" },
  "qtNew.colPriceSug": { ID: "Harga Saran (IDR)", EN: "Suggested Price (IDR)" },
  "qtNew.colSubtotal": { ID: "Subtotal", EN: "Subtotal" },
  "qtNew.colNote": { ID: "Catatan", EN: "Note" },
  "qtNew.optPickItem": { ID: "— pilih item —", EN: "— pick item —" },
  "qtNew.phPriceSug": { ID: "(kosong=supplier isi)", EN: "(blank = supplier fills)" },
  "qtNew.btnDelete": { ID: "Hapus", EN: "Delete" },
  "qtNew.totalSug": { ID: "Total saran", EN: "Suggested total" },
  "qtNew.btnSave": { ID: "💾 Simpan Draft Quotation", EN: "💾 Save Draft Quotation" },
  "qtNew.btnSaving": { ID: "Menyimpan…", EN: "Saving…" },
  "qtNew.step1SeedTitle": {
    ID: "1. Seed dari Menu",
    EN: "1. Seed from Menu"
  },
  "qtNew.step2ItemsTitle": {
    ID: "2. Item yang Diminta",
    EN: "2. Requested Items"
  },
  "qtNew.colSupplier": { ID: "Supplier", EN: "Supplier" },
  "qtNew.optgrpMatch": {
    ID: "Supplier penyedia item ini",
    EN: "Suppliers that carry this item"
  },
  "qtNew.optgrpOther": {
    ID: "Supplier lain",
    EN: "Other suppliers"
  },
  "qtNew.errRowNoSup": {
    ID: "Ada baris tanpa supplier — pilih supplier di tiap baris sebelum simpan.",
    EN: "Some rows have no supplier — pick a supplier per row before saving."
  },
  "qtNew.helperSubmitNew": {
    ID: "Isi item dulu. Draft quotation akan dibuat per supplier, lalu .xlsx terunduh otomatis.",
    EN: "Add items first. One draft quotation per supplier will be created, then .xlsx auto-downloads."
  },
  "qtNew.helperGroup": {
    ID: "{n} supplier akan menerima 1 file .xlsx masing-masing.",
    EN: "{n} suppliers will each receive 1 .xlsx file."
  },
  "qtNew.btnSaveMulti": {
    ID: "💾 Simpan + Unduh {n} File",
    EN: "💾 Save + Download {n} Files"
  },
  "qtNew.fldMenuPick": { ID: "Pilih Menu (opsional)", EN: "Pick Menu (optional)" },
  "qtNew.optMenuAuto": {
    ID: "Auto — ikut menu terjadwal tanggal ini",
    EN: "Auto — follow menu scheduled for this date"
  },
  "qtNew.previewLoading": { ID: "Mengecek menu terjadwal…", EN: "Checking scheduled menu…" },
  "qtNew.previewAssigned": { ID: "Menu terjadwal", EN: "Scheduled menu" },
  "qtNew.previewOverride": { ID: "Override menu", EN: "Menu override" },
  "qtNew.previewCustom": {
    ID: "Custom menu (ditetapkan ahli gizi untuk tanggal ini)",
    EN: "Custom menu (set by nutritionist for this date)"
  },
  "qtNew.previewNone": { ID: "belum di-assign", EN: "not yet assigned" },
  "qtNew.previewNoneHint": {
    ID: "Tanggal ini belum punya menu terjadwal. Pilih menu manual di dropdown di atas untuk tetap seed items.",
    EN: "No menu scheduled for this date. Pick a menu above to seed items manually."
  },

  // ---------------- Quotation detail ----------------
  "qtDetail.title": { ID: "Quotation #{no}", EN: "Quotation #{no}" },
  "qtDetail.subNeed": { ID: "butuh {date}", EN: "need {date}" },
  "qtDetail.infoTitle": { ID: "Info", EN: "Info" },
  "qtDetail.infoHint": { ID: "Supplier & tanggal", EN: "Supplier & dates" },
  "qtDetail.lblSupplier": { ID: "Supplier", EN: "Supplier" },
  "qtDetail.lblContact": { ID: "Kontak", EN: "Contact" },
  "qtDetail.lblDates": { ID: "Tanggal", EN: "Dates" },
  "qtDetail.lblTotal": { ID: "Total", EN: "Total" },
  "qtDetail.dateQuote": { ID: "Quotation: {date}", EN: "Quotation: {date}" },
  "qtDetail.dateValid": { ID: "Valid s/d: {date}", EN: "Valid until: {date}" },
  "qtDetail.dateNeed": { ID: "Butuh: {date}", EN: "Need: {date}" },
  "qtDetail.itemsTitle": { ID: "Item ({n} baris)", EN: "Items ({n} rows)" },
  "qtDetail.itemsHint": {
    ID: "Qty & harga final (dari supplier) akan overwrite qty & harga saran saat convert ke PO.",
    EN: "Final qty & price (from supplier) will overwrite suggested qty & price when converting to PO."
  },
  "qtDetail.itemsEmpty": { ID: "Belum ada baris.", EN: "No rows yet." },
  "qtDetail.colNo": { ID: "No.", EN: "No." },
  "qtDetail.colItem": { ID: "Item", EN: "Item" },
  "qtDetail.colQty": { ID: "Qty", EN: "Qty" },
  "qtDetail.colUnit": { ID: "Unit", EN: "Unit" },
  "qtDetail.colSuggest": { ID: "Saran IDR", EN: "Suggested IDR" },
  "qtDetail.colFinalQty": { ID: "Final Qty", EN: "Final Qty" },
  "qtDetail.colFinalPrice": { ID: "Final IDR", EN: "Final IDR" },
  "qtDetail.colSubtotal": { ID: "Subtotal", EN: "Subtotal" },
  "qtDetail.colNote": { ID: "Catatan", EN: "Note" },
  "qtDetail.total": { ID: "TOTAL", EN: "TOTAL" },
  "qtDetail.actionsTitle": { ID: "Aksi", EN: "Actions" },
  "qtDetail.actionsHint": { ID: "Kelola status & export dokumen", EN: "Manage status & export documents" },
  "qtDetail.btnXlsx": { ID: "📥 Download .xlsx", EN: "📥 Download .xlsx" },
  "qtDetail.btnPrint": { ID: "🖨 Print Preview", EN: "🖨 Print Preview" },

  // ---------------- Quotation actions ----------------
  "qtActions.confirmConvert": {
    ID: "Convert {no} menjadi PO? Aksi ini tidak bisa diundo.",
    EN: "Convert {no} into a PO? This action cannot be undone."
  },
  "qtActions.convertSuccess": { ID: "✅ Sukses. PO baru: {po}", EN: "✅ Success. New PO: {po}" },
  "qtActions.convertedLbl": { ID: "✓ Sudah diubah ke", EN: "✓ Converted to" },
  "qtActions.btnMarkSent": { ID: "📤 Tandai Terkirim", EN: "📤 Mark as Sent" },
  "qtActions.btnMarkResponded": { ID: "✍ Tandai Sudah Dibalas", EN: "✍ Mark as Responded" },
  "qtActions.btnAccept": { ID: "✅ Terima", EN: "✅ Accept" },
  "qtActions.btnReject": { ID: "Tolak", EN: "Reject" },
  "qtActions.btnConvertPo": { ID: "🔄 Convert ke PO", EN: "🔄 Convert to PO" },

  // ---------------- Supplier Forecast ----------------
  "fcst.profileIncomplete": {
    ID: "Profil supplier belum lengkap",
    EN: "Supplier profile incomplete"
  },
  "fcst.profileHelp": {
    ID: "Akun supplier kamu belum ditautkan ke record supplier. Hubungi admin SPPG.",
    EN: "Your supplier account is not yet linked to a supplier record. Contact the SPPG admin."
  },
  "fcst.title": { ID: "Forecast Kebutuhan 90 Hari", EN: "90-Day Demand Forecast" },
  "fcst.subtitlePreview": {
    ID: "Preview kebutuhan per supplier (staff mode). Pilih supplier dulu.",
    EN: "Per-supplier demand preview (staff mode). Pick a supplier first."
  },
  "fcst.backSuppliers": { ID: "← Suppliers", EN: "← Suppliers" },
  "fcst.backDashboard": { ID: "← Dashboard", EN: "← Dashboard" },
  "fcst.backPickSup": { ID: "← Pilih supplier lain", EN: "← Pick a different supplier" },
  "fcst.pickSupTitle": { ID: "Pilih Supplier", EN: "Pick Supplier" },
  "fcst.pickSupHint": {
    ID: "Pilih supplier untuk generate forecast kebutuhan pengadaan berdasarkan kontrak & histori.",
    EN: "Pick a supplier to generate procurement demand forecast based on contracts & history."
  },
  "fcst.noActiveSup": { ID: "Belum ada supplier aktif.", EN: "No active suppliers yet." },
  "fcst.noForecastTitle": { ID: "Belum ada forecast", EN: "No forecast yet" },
  "fcst.noForecastMsg": {
    ID: "Supplier belum ditautkan ke item manapun di katalog, atau tidak ada menu assigned/cycle untuk 90 hari ke depan. Hubungi admin SPPG kalau ini tidak sesuai.",
    EN: "The supplier is not linked to any catalog item, or there is no assigned/cycle menu for the next 90 days. Contact the SPPG admin if this seems wrong."
  },
  "fcst.subPic": { ID: "PIC: {pic}", EN: "PIC: {pic}" },
  "fcst.subHelp": { ID: "hanya item yang Anda supply", EN: "only items you supply" },
  "fcst.tabWeekly": { ID: "Mingguan ({n})", EN: "Weekly ({n})" },
  "fcst.tabDaily": { ID: "Harian ({n})", EN: "Daily ({n})" },
  "fcst.tabMonthly": { ID: "Bulanan ({n})", EN: "Monthly ({n})" },
  "fcst.meta": {
    ID: "{items} komoditas | {days} hari | rentang 90 hari",
    EN: "{items} commodities | {days} days | 90-day range"
  },
  "fcst.export": { ID: "📥 Export .xlsx", EN: "📥 Export .xlsx" },
  "fcst.staffPreview": {
    ID: "⚠ Staff-preview mode — supplier akan lihat view ini sendiri tanpa harga/data supplier lain.",
    EN: "⚠ Staff-preview mode — the supplier will see this view themselves, without prices/data from other suppliers."
  },
  "fcst.badgeAssigned": { ID: "assigned", EN: "assigned" },
  "fcst.badgeCustom": { ID: "custom", EN: "custom" },
  "fcst.badgeCycle": { ID: "cycle (estimasi)", EN: "cycle (estimated)" },
  "fcst.legendTitle": { ID: "Legenda sumber data:", EN: "Data source legend:" },
  "fcst.legendAssigned": {
    ID: "= menu sudah dijadwalkan oleh operator",
    EN: "= menu already assigned by operator"
  },
  "fcst.legendCustom": {
    ID: "= menu custom tanggal itu",
    EN: "= custom menu on that date"
  },
  "fcst.legendCycle": {
    ID: "= estimasi berdasarkan rotasi cycle default (bisa berubah kalau operator override).",
    EN: "= estimate based on default cycle rotation (may change if operator overrides)."
  },
  "fcst.colDate": { ID: "Tanggal", EN: "Date" },
  "fcst.colItem": { ID: "Item", EN: "Item" },
  "fcst.weekFrom": { ID: "dari {date}", EN: "from {date}" },
  "fcst.weekStartHint": { ID: "Mulai {date}", EN: "Starts {date}" },
  "fcst.colTotal90": { ID: "Total 90d", EN: "90d Total" },
  "fcst.emptyDaily": { ID: "Tidak ada data harian.", EN: "No daily data." },
  "fcst.emptyWeekly": { ID: "Tidak ada data mingguan.", EN: "No weekly data." },
  "fcst.emptyMonthly": { ID: "Tidak ada data bulanan.", EN: "No monthly data." },
  "fcst.monthMeta": {
    ID: "{items} item | {days} hari operasional",
    EN: "{items} items | {days} operational days"
  },

  // ---------------- Transaction Log component ----------------
  "tx.title": { ID: "Transaksi Rantai Pasok", EN: "Supply Chain Transactions" },
  "tx.hint": {
    ID: "50 transaksi terbaru lintas PO, GRN, invoice, dan pembayaran. Filter tanggal atau tipe untuk persempit.",
    EN: "Latest 50 transactions across POs, GRNs, invoices, and payments. Filter by date or type to narrow down."
  },
  "tx.filterDate": { ID: "Filter tanggal:", EN: "Filter date:" },
  "tx.allTypes": { ID: "Semua", EN: "All" },
  "tx.typePO": { ID: "PO", EN: "PO" },
  "tx.typeGRN": { ID: "GR", EN: "GR" },
  "tx.typeInvoice": { ID: "Invoice", EN: "Invoice" },
  "tx.typePayment": { ID: "Payment", EN: "Payment" },
  "tx.typeAdjustment": { ID: "Adjustment", EN: "Adjustment" },
  "tx.typeReceipt": { ID: "Receipt", EN: "Receipt" },
  "tx.colDate": { ID: "Tanggal", EN: "Date" },
  "tx.colType": { ID: "Tipe", EN: "Type" },
  "tx.colRef": { ID: "Referensi", EN: "Reference" },
  "tx.colSupplier": { ID: "Supplier", EN: "Supplier" },
  "tx.colAmount": { ID: "Nilai", EN: "Amount" },
  "tx.colDescription": { ID: "Keterangan", EN: "Description" },
  "tx.totalShown": { ID: "Total ditampilkan", EN: "Total shown" },
  "tx.grandTotal": { ID: "GRAND TOTAL", EN: "GRAND TOTAL" },
  "tx.nRows": { ID: "{n} baris", EN: "{n} rows" },
  "tx.empty": { ID: "Belum ada transaksi yang cocok.", EN: "No matching transactions." },
  "tx.colAction": { ID: "Aksi", EN: "Action" },
  "tx.detailOpen": { ID: "Lihat rincian transaksi", EN: "View transaction details" },
  "tx.detailClose": { ID: "Tutup", EN: "Close" },
  "tx.detailTitle": { ID: "Rincian Transaksi", EN: "Transaction Details" },
  "tx.detailLoading": { ID: "Memuat rincian…", EN: "Loading details…" },
  "tx.detailEmpty": {
    ID: "Data rinci tidak ditemukan untuk transaksi ini.",
    EN: "No detailed record found for this transaction."
  },
  "tx.detailError": {
    ID: "Gagal memuat rincian. Coba lagi.",
    EN: "Failed to load details. Please try again."
  },
  "tx.detailSummary": { ID: "Ringkasan", EN: "Summary" },
  "tx.detailLineItems": { ID: "Rincian Barang", EN: "Line Items" },
  "tx.detailSupplier": { ID: "Supplier", EN: "Supplier" },
  "tx.detailDate": { ID: "Tanggal", EN: "Date" },
  "tx.detailRef": { ID: "No. Referensi", EN: "Reference No." },
  "tx.detailAmount": { ID: "Nilai", EN: "Amount" },
  "tx.detailStatus": { ID: "Status", EN: "Status" },
  "tx.detailDueDate": { ID: "Jatuh Tempo", EN: "Due Date" },
  "tx.detailDeliveryDate": { ID: "Tgl. Pengiriman", EN: "Delivery Date" },
  "tx.detailPoNo": { ID: "PO Terkait", EN: "Linked PO" },
  "tx.detailInvoiceNo": { ID: "Invoice Terkait", EN: "Linked Invoice" },
  "tx.detailInvoiceTotal": { ID: "Total Invoice", EN: "Invoice Total" },
  "tx.detailMethod": { ID: "Metode", EN: "Method" },
  "tx.detailPayReference": { ID: "No. Bukti", EN: "Proof No." },
  "tx.detailContract": { ID: "No. Kontrak", EN: "Contract No." },
  "tx.detailPayMethod": { ID: "Metode Bayar", EN: "Payment Method" },
  "tx.detailTop": { ID: "Termin (TOP)", EN: "Term (TOP)" },
  "tx.detailQcNote": { ID: "Catatan QC", EN: "QC Note" },
  "tx.detailNote": { ID: "Catatan", EN: "Note" },
  "tx.detailDescription": { ID: "Keterangan", EN: "Description" },
  "tx.detailSource": { ID: "Sumber", EN: "Source" },
  "tx.detailPeriod": { ID: "Periode", EN: "Period" },
  "tx.detailLineNo": { ID: "No.", EN: "No." },
  "tx.detailItem": { ID: "Barang", EN: "Item" },
  "tx.detailQty": { ID: "Qty", EN: "Qty" },
  "tx.detailQtyOrdered": { ID: "Qty Pesan", EN: "Qty Ordered" },
  "tx.detailQtyReceived": { ID: "Qty Terima", EN: "Qty Received" },
  "tx.detailQtyRejected": { ID: "Qty Ditolak", EN: "Qty Rejected" },
  "tx.detailUnit": { ID: "Satuan", EN: "Unit" },
  "tx.detailPrice": { ID: "Harga", EN: "Price" },
  "tx.detailSubtotal": { ID: "Subtotal", EN: "Subtotal" },
  "tx.detailTotal": { ID: "TOTAL", EN: "TOTAL" }
} as const satisfies Record<string, Pair>;

export type LangKey = keyof typeof LANG_KEYS;

export function t(key: LangKey, lang: Lang): string {
  const entry = LANG_KEYS[key];
  if (!entry) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] Missing key: ${String(key)}`);
    }
    return String(key);
  }
  return entry[lang] ?? entry.ID ?? String(key);
}

/**
 * Translate + interpolate `{name}` placeholders.
 *   ti("dashboard.shortageToday", "EN", { n: 3 }) → "3 shortages today"
 */
export function ti(
  key: LangKey,
  lang: Lang,
  vars: Record<string, string | number>
): string {
  return t(key, lang).replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : ""
  );
}

// -------- Locale-aware date/number formatters --------

export function numberLocale(lang: Lang): string {
  return lang === "EN" ? "en-US" : "id-ID";
}

export function formatNumber(
  n: number | null | undefined,
  lang: Lang,
  opts: Intl.NumberFormatOptions = {}
): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return v.toLocaleString(numberLocale(lang), opts);
}

// Shared month/day arrays for both locales.
export const MONTHS = {
  long: {
    ID: [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ],
    EN: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
  },
  short: {
    ID: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
    EN: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  }
} as const;

export const DAYS = {
  long: {
    ID: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
    EN: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  },
  short: {
    ID: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
    EN: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  }
} as const;

// Day-of-week header for calendar grid (Mon..Sun)
export const DOW_HEAD = {
  ID: ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"],
  EN: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
} as const;
