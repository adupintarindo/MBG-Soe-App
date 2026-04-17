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
  brandSub: { ID: "SPPG Nunumeu · Kota Soe", EN: "SPPG Nunumeu · Soe City" },
  brandRegion: {
    ID: "Timor Tengah Selatan · Nusa Tenggara Timur",
    EN: "South Central Timor · East Nusa Tenggara"
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
  tabSchools: { ID: "Sekolah", EN: "Schools" },
  tabMenu: { ID: "Master Menu", EN: "Menu Master" },
  tabCalendar: { ID: "Kalender Menu", EN: "Menu Calendar" },
  tabPlanning: { ID: "Rencana Kebutuhan", EN: "Planning" },
  tabStock: { ID: "Kartu Stok", EN: "Stock Card" },
  tabProcurement: { ID: "Pengadaan", EN: "Procurement" },
  tabSuppliers: { ID: "Supplier", EN: "Suppliers" },
  tabPriceList: { ID: "Price List", EN: "Price List" },
  tabDocgen: { ID: "Dokumen", EN: "Documents" },
  tabSOP: { ID: "SOP", EN: "SOP" },
  tabData: { ID: "Data Master", EN: "Master Data" },
  tabAdmin: { ID: "Admin", EN: "Admin" },
  tabForecast: { ID: "Forecast 90h", EN: "Forecast 90d" },
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
  "common.status": { ID: "Status", EN: "Status" },
  "common.note": { ID: "Catatan", EN: "Notes" },
  "common.item": { ID: "Item", EN: "Item" },
  "common.items": { ID: "item", EN: "items" },
  "common.unit": { ID: "Unit", EN: "Unit" },
  "common.qty": { ID: "Qty", EN: "Qty" },
  "common.total": { ID: "Total", EN: "Total" },
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

  // ---------------- Dashboard (/dashboard) ----------------
  "dashboard.notActiveTitle": { ID: "Akun belum aktif", EN: "Account not yet active" },
  "dashboard.notActiveBody": {
    ID: "sudah masuk ke sistem, tapi admin belum meng-aktifkan profil Anda. Hubungi admin untuk diverifikasi.",
    EN: "has signed in, but an administrator has not activated your profile yet. Contact an admin to verify."
  },
  "dashboard.shortageToday": { ID: "{n} shortage hari ini", EN: "{n} shortages today" },
  "dashboard.kpiStudents": { ID: "Siswa (Total)", EN: "Students (Total)" },
  "dashboard.kpiStudentsSub": { ID: "{n} sekolah aktif", EN: "{n} active schools" },
  "dashboard.kpiSchoolsActive": { ID: "Sekolah Aktif", EN: "Active Schools" },
  "dashboard.kpiSchoolsSub": { ID: "SPPG Nunumeu", EN: "SPPG Nunumeu" },
  "dashboard.kpiMenuToday": { ID: "Menu Hari Ini", EN: "Today's Menu" },
  "dashboard.kpiMenuNotSet": { ID: "Belum ditetapkan", EN: "Not yet set" },
  "dashboard.kpiMenuSub": {
    ID: "{porsi} porsi · {kg}",
    EN: "{porsi} servings · {kg}"
  },
  "dashboard.kpiSuppliersActive": { ID: "Supplier Aktif", EN: "Active Suppliers" },
  "dashboard.kpiSuppliersSub": { ID: "BUMN + UMKM + Poktan", EN: "SOE + SMEs + Farmer Groups" },
  "dashboard.volumeTitle": {
    ID: "🌾 Volume Kebutuhan Bahan · {range} · {total}",
    EN: "🌾 Ingredient Requirements Volume · {range} · {total}"
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
    ID: "Pastikan menu sudah di-assign ke tanggal di horizon ini.",
    EN: "Make sure menus have been assigned to dates within this horizon."
  },
  "dashboard.tblNo": { ID: "No.", EN: "No." },
  "dashboard.tblCommodity": { ID: "Komoditas", EN: "Commodity" },
  "dashboard.tblTotalKg": { ID: "Total (kg)", EN: "Total (kg)" },
  "dashboard.planningTitle": { ID: "🔔 10 Hari Ke Depan · Planning", EN: "🔔 Next 10 Days · Planning" },
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
  "dashboard.stockAlertTitle": { ID: "⚠️ Alert Stok · Hari Ini", EN: "⚠️ Stock Alert · Today" },
  "dashboard.stockAlertHintOk": { ID: "Semua kebutuhan tercover.", EN: "All requirements covered." },
  "dashboard.stockAlertHintBad": { ID: "{n} item · gap {gap}", EN: "{n} items · gap {gap}" },
  "dashboard.stockAlertEmpty": {
    ID: "Tidak ada kekurangan untuk hari ini.",
    EN: "No shortages for today."
  },
  "dashboard.tblItem": { ID: "Item", EN: "Item" },
  "dashboard.tblButuh": { ID: "Butuh", EN: "Needed" },
  "dashboard.tblAda": { ID: "Ada", EN: "On hand" },
  "dashboard.tblKurang": { ID: "Kurang", EN: "Short" },
  "dashboard.supplierSpendTitle": { ID: "🏪 Nilai Belanja Supplier · Bulan Ini", EN: "🏪 Supplier Spend · This Month" },
  "dashboard.supplierSpendHint": {
    ID: "Periode {start} s.d. {end} · {n} supplier bertransaksi",
    EN: "Period {start} to {end} · {n} suppliers with transactions"
  },
  "dashboard.supplierSpendEmpty": { ID: "Belum ada invoice bulan ini.", EN: "No invoices this month yet." },
  "dashboard.tblType": { ID: "Tipe", EN: "Type" },
  "dashboard.tblInvoice": { ID: "Invoice", EN: "Invoice" },
  "dashboard.tblTotalSpend": { ID: "Total Belanja", EN: "Total Spend" },
  "dashboard.forecastTitle": { ID: "🔭 Peramalan Shortage · 14 Hari Ke Depan", EN: "🔭 Shortage Forecast · Next 14 Days" },
  "dashboard.forecastEmpty": {
    ID: "Tidak ada shortage terdeteksi di horizon 14 hari.",
    EN: "No shortages detected over the 14-day horizon."
  },
  "dashboard.forecastItemsShort": { ID: "{n} item kurang", EN: "{n} items short" },
  "dashboard.forecastGap": { ID: "gap {value}", EN: "gap {value}" },
  "dashboard.footer": {
    ID: "Round 6 · Phase 1 · Next.js + Supabase · Go-live SPPG Nunumeu 4 Mei 2026",
    EN: "Round 6 · Phase 1 · Next.js + Supabase · Go-live SPPG Nunumeu 4 May 2026"
  },
  "dashboard.commodityCarbo": { ID: "Karbo", EN: "Carbs" },
  "dashboard.commodityFruit": { ID: "Buah", EN: "Fruit" },
  "dashboard.commodityProtein": { ID: "Protein", EN: "Protein" },
  "dashboard.commoditySeasoning": { ID: "Bumbu", EN: "Seasoning" },
  "dashboard.commodityVeg": { ID: "Sayur", EN: "Vegetables" },

  // ---------------- Procurement (/procurement) ----------------
  "procurement.title": {
    ID: "Pengadaan · PR · Quotation · PO · GRN · Invoice",
    EN: "Procurement · PR · Quotation · PO · GRN · Invoice"
  },
  "procurement.subtitle": {
    ID: "{prs} PR · {qts} Quotation · {pos} PO · {grns} GRN · {invs} Invoice · outstanding",
    EN: "{prs} PR · {qts} Quotation · {pos} PO · {grns} GRN · {invs} Invoice · outstanding"
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
    ID: "{crit} critical · avg resolve {days} hari",
    EN: "{crit} critical · avg resolve {days} days"
  },
  "procurement.kpiOK": { ID: "{n} OK", EN: "{n} OK" },
  "procurement.kpiOverdue": { ID: "{n} overdue", EN: "{n} overdue" },
  "procurement.kpiDocuments": { ID: "{n} dokumen", EN: "{n} documents" },
  "procurement.secPRtitle": { ID: "📋 Purchase Requisitions · Split-Supplier", EN: "📋 Purchase Requisitions · Split-Supplier" },
  "procurement.secPRhint": {
    ID: "Agregasi kebutuhan tanggal tertentu → alokasi qty absolut ke multiple supplier → auto-generate quotation per supplier.",
    EN: "Aggregate requirements for a given date → allocate absolute qty to multiple suppliers → auto-generate a quotation per supplier."
  },
  "procurement.prEmpty": {
    ID: "Belum ada PR. Klik 'Buat PR' untuk mulai split kebutuhan ke multiple supplier.",
    EN: "No PRs yet. Click 'New PR' to start splitting requirements across suppliers."
  },
  "procurement.colPRNo": { ID: "No PR", EN: "PR No." },
  "procurement.colCreated": { ID: "Dibuat", EN: "Created" },
  "procurement.colNeeded": { ID: "Butuh", EN: "Needed" },
  "procurement.secQTtitle": { ID: "📄 Quotations · RFQ", EN: "📄 Quotations · RFQ" },
  "procurement.secQThint": {
    ID: "Draft harga ke supplier sebelum PO · export .xlsx untuk supplier tanda tangan/edit, lalu convert ke PO.",
    EN: "Price draft to supplier before PO · export .xlsx for the supplier to sign/edit, then convert to PO."
  },
  "procurement.qtEmpty": {
    ID: "Belum ada quotation. Klik 'Buat Baru' untuk mulai.",
    EN: "No quotations yet. Click 'Create New' to start."
  },
  "procurement.colValidUntil": { ID: "Berlaku s/d", EN: "Valid until" },
  "procurement.colAmount": { ID: "Nilai", EN: "Amount" },
  "procurement.colPO": { ID: "PO", EN: "PO" },
  "procurement.secPOtitle": { ID: "📝 Purchase Orders", EN: "📝 Purchase Orders" },
  "procurement.secPOhint": { ID: "50 PO terbaru", EN: "50 latest POs" },
  "procurement.poEmpty": { ID: "Belum ada PO.", EN: "No POs yet." },
  "procurement.colItems": { ID: "Items", EN: "Items" },
  "procurement.colTotalQty": { ID: "Total Qty", EN: "Total Qty" },
  "procurement.secGRNtitle": {
    ID: "📦 GRN · QC Checklist · Non-Conformance",
    EN: "📦 GRN · QC Checklist · Non-Conformance"
  },
  "procurement.secGRNhint": {
    ID: "Klik baris untuk buat pemeriksaan QC dari template · NCR dicatat per severity.",
    EN: "Click a row to create a QC check from a template · NCRs are logged per severity."
  },
  "procurement.secINVtitle": { ID: "💰 Invoice", EN: "💰 Invoices" },
  "procurement.secINVhint": { ID: "50 invoice terbaru", EN: "50 latest invoices" },
  "procurement.invEmpty": { ID: "Belum ada invoice.", EN: "No invoices yet." },
  "procurement.colInvoiceNo": { ID: "No Invoice", EN: "Invoice No." },
  "procurement.colDueDate": { ID: "Jatuh Tempo", EN: "Due Date" },
  "procurement.secReceiptsTitle": { ID: "📷 Bukti Terima (Foto)", EN: "📷 Delivery Proof (Photos)" },
  "procurement.secReceiptsHint": {
    ID: "20 terbaru · klik untuk detail di procurement system",
    EN: "20 latest · click for detail in the procurement system"
  },
  "procurement.receiptsEmpty": { ID: "Belum ada foto bukti.", EN: "No proof photos yet." },
  "procurement.noPhoto": { ID: "(tanpa foto)", EN: "(no photo)" },

  // ---------------- Stock (/stock) ----------------
  "stock.title": { ID: "Stok Gudang SPPG", EN: "SPPG Warehouse Stock" },
  "stock.subtitle": {
    ID: "{sku} SKU · {inStock} ada stok · {empty} kosong",
    EN: "{sku} SKUs · {inStock} in stock · {empty} empty"
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
    ID: "⚠️ {n} Item Kurang untuk Hari Ini",
    EN: "⚠️ {n} Items Short Today"
  },
  "stock.shortHint": {
    ID: "Kekurangan dihitung dari kebutuhan BOM hari ini vs on-hand.",
    EN: "Shortages are calculated from today's BOM requirements vs on-hand stock."
  },
  "stock.catTitle": { ID: "{cat} · {n} item", EN: "{cat} · {n} items" },
  "stock.catTotalValue": { ID: "Total nilai", EN: "Total value" },
  "stock.colHarga": { ID: "Harga", EN: "Price" },
  "stock.colNilai": { ID: "Nilai", EN: "Value" },
  "stock.colVolWeekly": { ID: "Vol Mingguan", EN: "Weekly Vol" },
  "stock.statusShort": { ID: "Kurang {gap}", EN: "Short {gap}" },
  "stock.statusEmpty": { ID: "Kosong", EN: "Empty" },
  "stock.statusLow": { ID: "Low · {w}w", EN: "Low · {w}w" },
  "stock.statusOK": { ID: "OK", EN: "OK" },
  "stock.movesTitle": { ID: "📋 50 Pergerakan Stok Terakhir", EN: "📋 Last 50 Stock Movements" },
  "stock.movesEmpty": { ID: "Belum ada pergerakan stok.", EN: "No stock movements yet." },
  "stock.colRef": { ID: "Referensi", EN: "Reference" },
  "stock.reasonReceipt": { ID: "Terima", EN: "Receipt" },
  "stock.reasonConsumption": { ID: "Konsumsi", EN: "Consumption" },
  "stock.reasonAdjustment": { ID: "Adjust", EN: "Adjust" },
  "stock.reasonWaste": { ID: "Waste", EN: "Waste" },
  "stock.reasonTransferIn": { ID: "Transfer In", EN: "Transfer In" },
  "stock.reasonTransferOut": { ID: "Transfer Out", EN: "Transfer Out" },
  "stock.reasonOpening": { ID: "Opening", EN: "Opening" },

  // ---------------- Planning (/planning) ----------------
  "planning.title": { ID: "Rencana Kebutuhan Bahan", EN: "Ingredient Requirements Plan" },
  "planning.subtitle": {
    ID: "Proyeksi 6 bulan berdasarkan menu assignment × porsi efektif × BOM",
    EN: "6-month projection based on menu assignment × effective servings × BOM"
  },
  "planning.kpiOpDays": { ID: "Hari Operasional", EN: "Operational Days" },
  "planning.kpiOpDaysSub": { ID: "30 hari ke depan", EN: "next 30 days" },
  "planning.kpiTotalPorsi": { ID: "Total Porsi", EN: "Total Servings" },
  "planning.kpiTotalPorsiSub": { ID: "akumulasi horizon", EN: "horizon total" },
  "planning.kpiTotalKg": { ID: "Total Kebutuhan", EN: "Total Required" },
  "planning.kpiTotalKgSub": { ID: "bahan basah", EN: "wet ingredients" },
  "planning.kpiEstSpend": { ID: "Estimasi Belanja", EN: "Estimated Spend" },
  "planning.kpiEstSpendSub": { ID: "6 bulan ke depan", EN: "next 6 months" },
  "planning.catDistTitle": { ID: "Distribusi Kebutuhan per Kategori (6 bulan)", EN: "Requirements Distribution by Category (6 months)" },
  "planning.matrixTitle": {
    ID: "Matriks Kebutuhan · {months} Bulan · {items} komoditas",
    EN: "Requirements Matrix · {months} Months · {items} commodities"
  },
  "planning.matrixHint": {
    ID: "Top 30 komoditas, urut dari volume terbesar.",
    EN: "Top 30 commodities, ordered by largest volume."
  },
  "planning.matrixEmpty": { ID: "Belum ada data kebutuhan.", EN: "No requirements data yet." },
  "planning.colTotalKg": { ID: "Total kg", EN: "Total kg" },
  "planning.colEstCost": { ID: "Est. Biaya", EN: "Est. Cost" },
  "planning.totalTop30": { ID: "TOTAL (TOP 30)", EN: "TOTAL (TOP 30)" },
  "planning.dailyTitle": { ID: "30 Hari ke Depan · Planning Harian", EN: "Next 30 Days · Daily Planning" },
  "planning.colPorsiEff": { ID: "Porsi Eff", EN: "Eff. Servings" },
  "planning.badgeOP": { ID: "OP", EN: "OP" },
  "planning.forecastTitle": { ID: "🔭 Forecast Shortage · 30 Hari", EN: "🔭 Shortage Forecast · 30 Days" },
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
  "planning.fcItemsShort": { ID: "{rel} · {n} item kurang", EN: "{rel} · {n} items short" },
  "planning.fcGap": { ID: "gap", EN: "gap" },

  // ---------------- Schools (/schools) ----------------
  "schools.title": { ID: "Sekolah Penerima", EN: "Recipient Schools" },
  "schools.subtitle": {
    ID: "{n} sekolah aktif · {students} siswa · {teachers} guru · porsi efektif",
    EN: "{n} active schools · {students} students · {teachers} teachers · effective servings"
  },
  "schools.studentsSuffix": { ID: "siswa", EN: "students" },
  "schools.rosterTitle": { ID: "Roster Sekolah · Breakdown Porsi", EN: "School Roster · Servings Breakdown" },
  "schools.rosterHint": {
    ID: "Porsi efektif menentukan volume BOM harian — Kecil (0.7) untuk PAUD/TK + SD kelas 1–3, Besar (1.0) untuk SD kelas 4–6 ke atas.",
    EN: "Effective servings drive daily BOM volume — Small (0.7) for PAUD/TK + SD grades 1–3, Large (1.0) for SD grades 4–6 and above."
  },
  "schools.colId": { ID: "ID", EN: "ID" },
  "schools.colName": { ID: "Nama", EN: "Name" },
  "schools.colLevel": { ID: "Jenjang", EN: "Level" },
  "schools.colStudents": { ID: "Siswa", EN: "Students" },
  "schools.colSmall": { ID: "Kecil (0.7)", EN: "Small (0.7)" },
  "schools.colLarge": { ID: "Besar (1.0)", EN: "Large (1.0)" },
  "schools.colTeachers": { ID: "Guru", EN: "Teachers" },
  "schools.colEff": { ID: "Porsi Eff.", EN: "Eff. Servings" },
  "schools.colDistance": { ID: "Jarak (km)", EN: "Distance (km)" },
  "schools.colContact": { ID: "Kontak", EN: "Contact" },
  "schools.totalLabel": { ID: "TOTAL · {n} sekolah aktif", EN: "TOTAL · {n} active schools" },
  "schools.footnote": {
    ID: "Porsi Efektif = (Kecil × 0.7) + (Besar × 1.0) + (Guru × 1.0). Kecil mencakup PAUD/TK dan SD kelas 1–3. Besar mencakup SD kelas 4–6, SMP, SMA, SMK.",
    EN: "Effective Servings = (Small × 0.7) + (Large × 1.0) + (Teachers × 1.0). Small covers PAUD/TK and SD grades 1–3. Large covers SD grades 4–6, SMP, SMA, SMK."
  },
  "schools.footnoteLabel": { ID: "Porsi Efektif", EN: "Effective Servings" },
  "schools.attTitle": {
    ID: "Perkiraan Kehadiran Siswa · 7 Hari Ke Depan",
    EN: "Expected Student Attendance · Next 7 Days"
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
  "schools.attSavedMsg": { ID: "Tersimpan · {n} baris", EN: "Saved · {n} rows" },
  "schools.attColSekolah": { ID: "Sekolah", EN: "School" },
  "schools.attColPorsi": { ID: "Porsi", EN: "Servings" },
  "schools.attColKapasitas": { ID: "Kapasitas", EN: "Capacity" },
  "schools.attGroupKecil": { ID: "Porsi Kecil · kelas 1–3", EN: "Small Servings · grades 1–3" },
  "schools.attGroupBesar": { ID: "Porsi Besar · kelas 4–6", EN: "Large Servings · grades 4–6" },
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
    ID: "Tidak ada baris yang bisa di-parse menjadi tanggal.",
    EN: "No lines could be parsed into dates."
  },
  "calParser.errNoEntries": {
    ID: "Tidak ada entri yang akan di-import.",
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
    ID: "Non-operasional tersimpan · {n} tanggal",
    EN: "Stored non-operational · {n} dates"
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
    ID: "Berhasil import {n} tanggal ({new} baru · {update} update).",
    EN: "Successfully imported {n} dates ({new} new · {update} updates)."
  },
  "calParser.msgDeleted": {
    ID: "Tanggal {date} dihapus dari non-operasional.",
    EN: "Date {date} removed from non-operational."
  },

  // ---------------- Menu Master (/menu) ----------------
  "menu.title": { ID: "Master Menu · BOM", EN: "Menu Master · BOM" },
  "menu.subtitle": {
    ID: "Siklus {n} hari · {items} komoditas · {bom} entri BOM · 2 porsi (Kecil 3-9 th / Besar 10 th+)",
    EN: "{n}-day cycle · {items} commodities · {bom} BOM entries · 2 serving sizes (Small 3-9 y / Large 10 y+)"
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
  "menu.cycleTitle": { ID: "{n} Siklus Menu · BOM per Porsi", EN: "{n}-Cycle Menu · BOM per Serving" },
  "menu.cycleHint": {
    ID: "Tiap kartu menampilkan Bill of Materials per porsi (gram bahan basah).",
    EN: "Each card shows the Bill of Materials per serving (grams of wet ingredient)."
  },
  "menu.bomEmpty": { ID: "Belum ada BOM untuk menu ini.", EN: "No BOM for this menu yet." },
  "menu.colKat": { ID: "Kat", EN: "Cat" },
  "menu.colSmall": { ID: "Kecil", EN: "Small" },
  "menu.colLarge": { ID: "Besar", EN: "Large" },
  "menu.titleSmall": { ID: "PAUD + SD 1-3 (3-9 th)", EN: "PAUD + SD 1-3 (3-9 y)" },
  "menu.titleLarge": { ID: "SD 4-6 + SMP/SMA + Guru (10 th+)", EN: "SD 4-6 + SMP/SMA + Teachers (10 y+)" },
  "menu.gramasiNote": {
    ID: "Gramasi: <b>Kecil</b> = PAUD + SD 1-3 (3-9 th) · <b>Besar</b> = SD 4-6 + SMP/SMA + Guru (10 th+)",
    EN: "Grammage: <b>Small</b> = PAUD + SD 1-3 (3-9 y) · <b>Large</b> = SD 4-6 + SMP/SMA + Teachers (10 y+)"
  },
  "menu.commodityTitle": { ID: "📦 Master Komoditas · {n} item", EN: "📦 Commodity Master · {n} items" },
  "menu.commodityHint": {
    ID: "Harga referensi · Volume mingguan · Sumber supplier",
    EN: "Reference price · Weekly volume · Supplier sources"
  },
  "menu.colPrice": { ID: "Harga (IDR)", EN: "Price (IDR)" },
  "menu.totalLabel": { ID: "Total", EN: "Total" },
  "menu.perPorsi": { ID: "/porsi", EN: "/serving" },
  "menu.footer": {
    ID: "Master Menu · Bill of Materials · Data siklus {n} hari — revisi per Go-Live 4 Mei 2026",
    EN: "Menu Master · Bill of Materials · {n}-day cycle data — revised as of Go-Live 4 May 2026"
  },

  // ---------------- Calendar (/calendar) ----------------
  "calendar.title": { ID: "Kalender Menu", EN: "Menu Calendar" },
  "calendar.subtitleOp": {
    ID: "{label} · {op} hari operasional · {hol} libur · {nonop} non-op",
    EN: "{label} · {op} operational days · {hol} holidays · {nonop} non-op"
  },
  "calendar.notAssigned": { ID: "{n} belum di-assign", EN: "{n} unassigned" },
  "calendar.allAssigned": { ID: "semua assigned", EN: "all assigned" },
  "calendar.btnLihatBOM": { ID: "🍽️ Lihat BOM", EN: "🍽️ View BOM" },
  "calendar.aria.prevMonth": { ID: "Bulan sebelumnya", EN: "Previous month" },
  "calendar.aria.nextMonth": { ID: "Bulan berikutnya", EN: "Next month" },
  "calendar.legendMenu": { ID: "Hari Menu", EN: "Menu Day" },
  "calendar.legendHoliday": { ID: "Libur Nasional", EN: "National Holiday" },
  "calendar.legendWeekend": { ID: "Weekend", EN: "Weekend" },
  "calendar.legendNonOp": { ID: "Tidak Operasional", EN: "Non-Operational" },
  "calendar.legendHint": {
    ID: "💡 Klik tanggal untuk assign menu / tandai Tidak Operasional",
    EN: "💡 Click a date to assign a menu / mark as Non-Operational"
  },
  "calendar.holidaysTitle": { ID: "Libur Nasional Bulan Ini", EN: "National Holidays This Month" },
  "calendar.holidaysHint": {
    ID: "Dihitung otomatis sebagai non-operasional.",
    EN: "Automatically counted as non-operational."
  },
  "calendar.autoAssign": { ID: "Auto-assign {n} hari", EN: "Auto-assign {n} days" },
  "calendar.autoAssigning": { ID: "Menjalankan auto-assign…", EN: "Running auto-assign…" },
  "calendar.autoAssignDone": { ID: "Selesai · {n} hari di-assign", EN: "Done · {n} days assigned" },
  "calendar.autoAssignFail": { ID: "Gagal: {msg}", EN: "Failed: {msg}" },
  "calendar.saveCombo": { ID: "Simpan Kombinasi", EN: "Save Combination" },
  "calendar.deleteAssign": { ID: "Hapus Assignment", EN: "Delete Assignment" },
  "calendar.markNonOp": { ID: "Tandai Tidak Operasional", EN: "Mark Non-Operational" },
  "calendar.unmarkNonOp": { ID: "Hapus tanda Tidak Operasional", EN: "Unmark Non-Operational" },
  "calendar.reasonPlaceholder": { ID: "Alasan (opsional)", EN: "Reason (optional)" },
  "calendar.noteLabel": { ID: "Catatan", EN: "Note" },
  "calendar.chooseMenu": { ID: "Pilih menu", EN: "Choose menu" },
  "calendar.inheritedFrom": { ID: "Mewarisi dari hari sebelumnya", EN: "Inherited from previous day" },
  "calendar.assigned": { ID: "Di-assign", EN: "Assigned" },
  "calendar.holiday": { ID: "Libur", EN: "Holiday" },
  "calendar.weekend": { ID: "Weekend", EN: "Weekend" },
  "calendar.nonOp": { ID: "Non-OP", EN: "Non-OP" },
  "calendar.today": { ID: "Hari ini", EN: "Today" },

  // ---------------- Price List (/price-list) ----------------
  "priceList.title": { ID: "Price List · Harga Komoditas", EN: "Price List · Commodity Prices" },
  "priceList.subtitle": {
    ID: "{n} komoditas · harga dari supplier aktif",
    EN: "{n} commodities · prices from active suppliers"
  },

  // ---------------- DocGen (/docgen) ----------------
  "docgen.title": { ID: "Document Generator", EN: "Document Generator" },
  "docgen.subtitle": {
    ID: "Preview & print dokumen resmi SPPG · PO · GRN · Invoice · Berita Acara",
    EN: "Preview & print official SPPG documents · PO · GRN · Invoice · Official Report"
  },
  "docgen.kpiPO": { ID: "Purchase Order", EN: "Purchase Order" },
  "docgen.kpiPOsub": { ID: "Order ke supplier", EN: "Order to supplier" },
  "docgen.kpiGRN": { ID: "GRN", EN: "GRN" },
  "docgen.kpiGRNsub": { ID: "Goods Receipt", EN: "Goods Receipt" },
  "docgen.kpiInvoice": { ID: "Invoice", EN: "Invoice" },
  "docgen.kpiInvoiceSub": { ID: "Tagihan supplier", EN: "Supplier billing" },
  "docgen.kpiLTA": { ID: "Kontrak LTA", EN: "LTA Contracts" },
  "docgen.kpiLTAsub": { ID: "Supplier signed", EN: "Signed suppliers" },
  "docgen.secPOtitle": { ID: "Purchase Orders", EN: "Purchase Orders" },
  "docgen.secGRNtitle": { ID: "Goods Receipt Notes", EN: "Goods Receipt Notes" },
  "docgen.secInvoiceTitle": { ID: "Invoice", EN: "Invoices" },
  "docgen.secLtaTitle": { ID: "Kontrak LTA", EN: "LTA Contracts" },
  "docgen.empty": { ID: "Belum ada dokumen.", EN: "No documents yet." },

  // ---------------- SOP (/sop) ----------------
  "sop.title": { ID: "Standard Operating Procedure", EN: "Standard Operating Procedure" },
  "sop.subtitle": {
    ID: "Manual SOP SPPG · referensi WHO / CODEX / BPOM / Permenkes · 90 hari eksekusi",
    EN: "SPPG SOP manual · WHO / CODEX / BPOM / Permenkes references · 90-day execution"
  },
  "sop.kpiTotal": { ID: "Total SOP", EN: "Total SOPs" },
  "sop.kpiExec": { ID: "Eksekusi 90 hari", EN: "90-day Executions" },
  "sop.kpiAvg": { ID: "Avg Completion", EN: "Avg Completion" },
  "sop.kpiRisk": { ID: "Risiko Teramati", EN: "Observed Risks" },
  "sop.tocTitle": { ID: "📑 Daftar Isi", EN: "📑 Table of Contents" },
  "sop.tocHint": { ID: "Klik untuk buka detail SOP di popup.", EN: "Click to open SOP detail in a popup." },

  // ---------------- Admin Data (/admin/data) ----------------
  "adminData.title": { ID: "Admin · Data Master", EN: "Admin · Master Data" },
  "adminData.subtitle": {
    ID: "Tambah, edit, atau reset data master & transaksi. Hanya admin yang punya akses ke modul ini.",
    EN: "Add, edit, or reset master & transaction data. Only admins can access this module."
  },
  "adminData.countItems": { ID: "{n} item", EN: "{n} items" },
  "adminData.countMenus": { ID: "{n} menu", EN: "{n} menus" },
  "adminData.countSuppliers": { ID: "{n} supplier", EN: "{n} suppliers" },
  "adminData.countSchools": { ID: "{n} sekolah", EN: "{n} schools" },

  // ---------------- Admin Invite (/admin/invite) ----------------
  "adminInvite.title": { ID: "Admin · Undang Pengguna", EN: "Admin · Invite Users" },
  "adminInvite.subtitle": {
    ID: "Buat undangan peran (Admin/Operator/Ahli Gizi/Supplier/Observer). Undangan berlaku 7 hari dan diklaim lewat magic-link pada email yang sama.",
    EN: "Create role-based invitations (Admin/Operator/Nutritionist/Supplier/Observer). Invitations are valid for 7 days and claimed via a magic-link sent to the same email."
  },
  "adminInvite.countActive": { ID: "{n} aktif", EN: "{n} active" },
  "adminInvite.countUsed": { ID: "{n} digunakan", EN: "{n} used" },
  "adminInvite.countExpired": { ID: "{n} kadaluarsa", EN: "{n} expired" },
  "adminInvite.recentTitle": { ID: "Undangan Terkini", EN: "Recent Invitations" },
  "adminInvite.recentHint": { ID: "20 undangan terbaru · urut dari paling baru", EN: "20 latest invitations · sorted by most recent" },
  "adminInvite.emptyTitle": { ID: "Belum ada undangan", EN: "No invitations yet" },
  "adminInvite.emptyBody": { ID: "Buat undangan pertama Anda lewat form di atas.", EN: "Create your first invitation with the form above." },
  "adminInvite.colEmail": { ID: "Email", EN: "Email" },
  "adminInvite.colRole": { ID: "Peran", EN: "Role" },
  "adminInvite.colSupplier": { ID: "Supplier", EN: "Supplier" },
  "adminInvite.colStatus": { ID: "Status", EN: "Status" },
  "adminInvite.colExpires": { ID: "Kadaluarsa", EN: "Expires" },

  // ---------------- Suppliers (/suppliers) ----------------
  "suppliers.title": { ID: "Supplier & Vendor Matrix", EN: "Supplier & Vendor Matrix" },
  "suppliers.subtitle": {
    ID: "{n} supplier · {signed} signed · {awaiting} awaiting · {rejected} rejected · rata-rata skor",
    EN: "{n} suppliers · {signed} signed · {awaiting} awaiting · {rejected} rejected · avg score"
  },
  "suppliers.kpiSigned": { ID: "Signed LTA", EN: "Signed LTA" },
  "suppliers.kpiSignedSub": { ID: "siap operasional", EN: "ready to operate" },
  "suppliers.kpiAwaiting": { ID: "Awaiting", EN: "Awaiting" },
  "suppliers.kpiAwaitingSub": { ID: "menunggu teken", EN: "awaiting signature" },
  "suppliers.kpiRejected": { ID: "Rejected", EN: "Rejected" },
  "suppliers.kpiRejectedSub": { ID: "skor < 70", EN: "score < 70" },
  "suppliers.kpiReadiness": { ID: "Onboarding Readiness", EN: "Onboarding Readiness" },
  "suppliers.kpiReadinessSub": { ID: "{done}/{total} done · {overdue} overdue", EN: "{done}/{total} done · {overdue} overdue" },
  "suppliers.cardsTitle": { ID: "Vendor Cards · Signed + Awaiting", EN: "Vendor Cards · Signed + Awaiting" },
  "suppliers.cardsHint": {
    ID: "Klik kartu untuk rincian, harga, sertifikasi & histori transaksi.",
    EN: "Click a card for details, pricing, certifications & transaction history."
  },
  "suppliers.cardScore": { ID: "Score", EN: "Score" },
  "suppliers.cardPic": { ID: "PIC", EN: "PIC" },
  "suppliers.cardTel": { ID: "Tel", EN: "Tel" },
  "suppliers.cardEmail": { ID: "Email", EN: "Email" },
  "suppliers.cardCommodity": { ID: "Komoditas · {n} item", EN: "Commodities · {n} items" },
  "suppliers.cardInvoices": { ID: "{n} invoice", EN: "{n} invoices" },
  "suppliers.cardDetail": { ID: "Rincian", EN: "Details" },
  "suppliers.rejectedTitle": { ID: "❌ Supplier Rejected", EN: "❌ Rejected Suppliers" },
  "suppliers.tableTitle": { ID: "Tabel Lengkap · {n} Supplier", EN: "Full Table · {n} Suppliers" },
  "suppliers.colId": { ID: "ID", EN: "ID" },
  "suppliers.colName": { ID: "Nama", EN: "Name" },
  "suppliers.colType": { ID: "Tipe", EN: "Type" },
  "suppliers.colKomoditas": { ID: "Komoditas", EN: "Commodities" },
  "suppliers.colItems": { ID: "Items", EN: "Items" },
  "suppliers.colScore": { ID: "Skor", EN: "Score" },
  "suppliers.colStatus": { ID: "Status", EN: "Status" },
  "suppliers.colSpend": { ID: "Belanja", EN: "Spend" },
  "suppliers.statusSigned": { ID: "signed", EN: "signed" },
  "suppliers.statusAwaiting": { ID: "awaiting", EN: "awaiting" },
  "suppliers.statusDraft": { ID: "draft", EN: "draft" },
  "suppliers.statusRejected": { ID: "rejected", EN: "rejected" },

  // ---------------- Supplier Detail (/suppliers/[id]) ----------------
  "supplierDetail.subPic": { ID: "PIC", EN: "PIC" },
  "supplierDetail.btnBack": { ID: "← Semua Supplier", EN: "← All Suppliers" },
  "supplierDetail.btnForecast": { ID: "📅 Forecast 90h", EN: "📅 Forecast 90d" },
  "supplierDetail.btnLTA": { ID: "📄 Generate LTA", EN: "📄 Generate LTA" },
  "supplierDetail.kpiTotalScore": { ID: "Total Score", EN: "Total Score" },
  "supplierDetail.kpiQuality": { ID: "Quality", EN: "Quality" },
  "supplierDetail.kpiQualitySub": { ID: "{pass} pass · {fail} fail", EN: "{pass} pass · {fail} fail" },
  "supplierDetail.kpiDelivery": { ID: "Delivery", EN: "Delivery" },
  "supplierDetail.kpiDeliverySub": { ID: "{n} GRN diterima", EN: "{n} GRN received" },
  "supplierDetail.kpiCompliance": { ID: "Compliance", EN: "Compliance" },
  "supplierDetail.kpiComplianceSub": { ID: "{n} NCR kritikal aktif", EN: "{n} critical NCR open" },
  "supplierDetail.recoRetain": { ID: "RETAIN — performa baik", EN: "RETAIN — good performance" },
  "supplierDetail.recoImprove": { ID: "IMPROVE — butuh pembinaan", EN: "IMPROVE — needs coaching" },
  "supplierDetail.recoWarning": { ID: "WARNING — resiko tinggi", EN: "WARNING — high risk" },
  "supplierDetail.recoReplace": { ID: "REPLACE — exit plan", EN: "REPLACE — exit plan" },
  "supplierDetail.secScorecard": { ID: "📊 Scorecard Otomatis", EN: "📊 Automatic Scorecard" },
  "supplierDetail.secScorecardHint": {
    ID: "Dihitung dari data operasional {start} → {end}. Bobot default: Q 30% · D 25% · P 20% · C 15% · R 10%.",
    EN: "Computed from operational data {start} → {end}. Default weights: Q 30% · D 25% · P 20% · C 15% · R 10%."
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
  "supplierDetail.secReval": { ID: "🔁 Re-Evaluasi Periodik", EN: "🔁 Periodic Re-Evaluation" },
  "supplierDetail.secRevalHint": {
    ID: "Simpan snapshot skor per periode. Klik 'Hitung & Simpan' untuk merekam evaluasi baru.",
    EN: "Save scorecard snapshot per period. Click 'Compute & Save' to record a new evaluation."
  },
  "supplierDetail.secGallery": { ID: "🖼️ Visual QC Gallery", EN: "🖼️ Visual QC Gallery" },
  "supplierDetail.secGalleryHint": {
    ID: "{n} foto dari GRN QC + NCR · 60 terbaru.",
    EN: "{n} photos from GRN QC + NCR · latest 60."
  },
  "supplierDetail.galleryEmptyTitle": { ID: "Belum ada foto QC", EN: "No QC photos yet" },
  "supplierDetail.galleryEmptyBody": {
    ID: "Foto akan muncul di sini ketika operator upload photo_url ke QC Check atau NCR.",
    EN: "Photos will appear here when operators upload photo_url to QC Check or NCR."
  },
  "supplierDetail.secItems": { ID: "📦 Komoditas yang Dipasok", EN: "📦 Supplied Commodities" },
  "supplierDetail.secItemsHint": { ID: "{n} item di-map ke supplier ini.", EN: "{n} items mapped to this supplier." },
  "supplierDetail.itemsEmpty": { ID: "Belum ada mapping item.", EN: "No item mapping yet." },
  "supplierDetail.colItem": { ID: "Item", EN: "Item" },
  "supplierDetail.colMain": { ID: "Main?", EN: "Main?" },
  "supplierDetail.colPrice": { ID: "Harga (IDR)", EN: "Price (IDR)" },
  "supplierDetail.colLead": { ID: "Lead Time", EN: "Lead Time" },
  "supplierDetail.badgeMain": { ID: "utama", EN: "main" },
  "supplierDetail.badgeAlt": { ID: "alternatif", EN: "alternative" },
  "supplierDetail.leadDays": { ID: "{n} hari", EN: "{n} days" },
  "supplierDetail.secCerts": { ID: "📜 Sertifikasi", EN: "📜 Certifications" },
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
  "actions.title": { ID: "📋 Action Tracker · Onboarding & Follow-up", EN: "📋 Action Tracker · Onboarding & Follow-up" },
  "actions.totalSuffix": { ID: "· {n} total", EN: "· {n} total" },
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
  "supModal.infoTitle": { ID: "🏢 Info Supplier", EN: "🏢 Supplier Info" },
  "supModal.infoStatus": { ID: "Status:", EN: "Status:" },
  "supModal.infoScore": { ID: "Score:", EN: "Score:" },
  "supModal.infoPic": { ID: "PIC:", EN: "PIC:" },
  "supModal.infoPhone": { ID: "Telepon:", EN: "Phone:" },
  "supModal.infoEmail": { ID: "Email:", EN: "Email:" },
  "supModal.infoAddress": { ID: "Alamat:", EN: "Address:" },
  "supModal.infoNotes": { ID: "Catatan:", EN: "Notes:" },
  "supModal.ratingTitle": { ID: "⭐ Rating & Sertifikasi", EN: "⭐ Rating & Certifications" },
  "supModal.ratingScoreText": { ID: "Skor {score} / 100 · {stars}/5 bintang", EN: "Score {score} / 100 · {stars}/5 stars" },
  "supModal.ratingNotYet": { ID: "Belum dinilai", EN: "Not rated yet" },
  "supModal.ratingAria": { ID: "Set rating {n} bintang", EN: "Set rating {n} stars" },
  "supModal.ratingClickToSet": { ID: "Klik untuk set", EN: "Click to set" },
  "supModal.certsTitle": { ID: "📜 Sertifikasi", EN: "📜 Certifications" },
  "supModal.certsEmpty": { ID: "Belum ada sertifikasi tercatat.", EN: "No certifications recorded yet." },
  "supModal.certValidUntil": { ID: "s/d {date}", EN: "until {date}" },
  "supModal.certExpired": { ID: " · kadaluarsa", EN: " · expired" },
  "supModal.certDelete": { ID: "Hapus", EN: "Delete" },
  "supModal.certPhName": { ID: "Nama sertifikat (cth: Halal)", EN: "Certificate name (e.g., Halal)" },
  "supModal.certPhUntil": { ID: "Berlaku s/d", EN: "Valid until" },
  "supModal.certBtnAdd": { ID: "+ Sertifikat", EN: "+ Certificate" },
  "supModal.errSaveRating": { ID: "Gagal simpan rating.", EN: "Failed to save rating." },
  "supModal.errCertName": { ID: "Nama sertifikat wajib.", EN: "Certificate name required." },
  "supModal.errSaveCert": { ID: "Gagal simpan sertifikat.", EN: "Failed to save certificate." },
  "supModal.errDeleteCert": { ID: "Hapus sertifikat ini?", EN: "Delete this certificate?" },
  "supModal.errDelete": { ID: "Gagal hapus.", EN: "Failed to delete." },
  "supModal.commodityTitle": { ID: "💰 Daftar Komoditas & Harga", EN: "💰 Commodity & Price List" },
  "supModal.commodityHint": { ID: "· edit harga inline, tekan 💾 untuk simpan", EN: "· edit price inline, press 💾 to save" },
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
  "supModal.actionsTitle": { ID: "📋 Action Items · {name}", EN: "📋 Action Items · {name}" },
  "supModal.txTitle": { ID: "📋 Histori Transaksi", EN: "📋 Transaction History" },
  "supModal.txHint": { ID: "· 20 terakhir", EN: "· last 20" },
  "supModal.txEmpty": { ID: "Belum ada transaksi.", EN: "No transactions yet." },
  "supModal.txColDate": { ID: "Tanggal", EN: "Date" },
  "supModal.txColType": { ID: "Tipe", EN: "Type" },
  "supModal.txColNumber": { ID: "Nomor", EN: "Number" },
  "supModal.txColAmount": { ID: "Nilai", EN: "Amount" },
  "supModal.txColStatus": { ID: "Status", EN: "Status" },

  // ---------------- Calendar (/calendar) ----------------
  "calendar.title": { ID: "Kalender Menu", EN: "Menu Calendar" },
  "calendar.subtitle": {
    ID: "{month} · {op} hari operasional · {hol} libur · {nonOp} non-op",
    EN: "{month} · {op} operating days · {hol} holidays · {nonOp} non-op"
  },
  "calendar.unassignedWarn": { ID: "{n} belum di-assign", EN: "{n} not assigned" },
  "calendar.allAssigned": { ID: "semua assigned", EN: "all assigned" },
  "calendar.btnBOM": { ID: "🍽️ Lihat BOM", EN: "🍽️ View BOM" },
  "calendar.prevAria": { ID: "Bulan sebelumnya", EN: "Previous month" },
  "calendar.nextAria": { ID: "Bulan berikutnya", EN: "Next month" },
  "calendar.legendMenu": { ID: "Hari Menu", EN: "Menu Day" },
  "calendar.legendHoliday": { ID: "Libur Nasional", EN: "National Holiday" },
  "calendar.legendWeekend": { ID: "Weekend", EN: "Weekend" },
  "calendar.legendNonOp": { ID: "Tidak Operasional", EN: "Non-Operational" },
  "calendar.legendHint": {
    ID: "💡 Klik tanggal untuk assign menu / tandai Tidak Operasional",
    EN: "💡 Click a date to assign menu / mark as Non-Operational"
  },
  "calendar.holidaysTitle": { ID: "Libur Nasional Bulan Ini", EN: "National Holidays This Month" },
  "calendar.holidaysHint": { ID: "Dihitung otomatis sebagai non-operasional.", EN: "Counted automatically as non-operational." },

  // ---------------- Calendar Grid (/calendar) ----------------
  "calGrid.recipientLabel": { ID: "{n} penerima", EN: "{n} recipients" },
  "calGrid.clickToAssign": { ID: "klik untuk assign", EN: "click to assign" },
  "calGrid.readOnlyNote": {
    ID: "Mode read-only · hanya admin, operator, dan ahli gizi yang bisa mengubah jadwal.",
    EN: "Read-only mode · only admin, operator, and nutritionist can change the schedule."
  },
  "calGrid.errLoadRef": { ID: "Gagal memuat referensi.", EN: "Failed to load reference." },
  "calGrid.errLoadAtt": { ID: "Gagal memuat kehadiran.", EN: "Failed to load attendance." },
  "calGrid.errSaveMenu": { ID: "Gagal menyimpan menu.", EN: "Failed to save menu." },
  "calGrid.errClearAssign": { ID: "Gagal menghapus assignment.", EN: "Failed to clear assignment." },
  "calGrid.errReasonRequired": { ID: "Alasan non-operasional wajib diisi.", EN: "Non-operational reason is required." },
  "calGrid.errMarkNonOp": { ID: "Gagal menandai non-operasional.", EN: "Failed to mark non-operational." },
  "calGrid.errClearNonOp": { ID: "Gagal menghapus non-operasional.", EN: "Failed to clear non-operational." },
  "calGrid.errSaveAttendance": { ID: "Gagal menyimpan kehadiran.", EN: "Failed to save attendance." },
  "calGrid.modalTitlePrefix": { ID: "📆 Atur Jadwal Menu", EN: "📆 Set Menu Schedule" },
  "calGrid.closeAria": { ID: "Tutup", EN: "Close" },
  "calGrid.step1Title": { ID: "Operasional Hari Ini?", EN: "Operational Today?" },
  "calGrid.btnYesOp": { ID: "✅ Ya, Operasional", EN: "✅ Yes, Operational" },
  "calGrid.btnNoOp": { ID: "⛔ Tidak Operasional", EN: "⛔ Not Operational" },
  "calGrid.scheduled": { ID: "✓ Terjadwal", EN: "✓ Scheduled" },
  "calGrid.notAssignedWarn": {
    ID: "⚠ Belum di-assign · pilih menu di bawah",
    EN: "⚠ Not assigned yet · choose a menu below"
  },
  "calGrid.step2Title": { ID: "📋 Pilih Menu ID", EN: "📋 Choose Menu ID" },
  "calGrid.btnSetMenu": { ID: "Set Menu", EN: "Set Menu" },
  "calGrid.autoFillHint": {
    ID: "💡 Memilih Menu ID akan otomatis mengisi kombinasi di bawah.",
    EN: "💡 Choosing a Menu ID auto-fills the combination below."
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
  "autoAssign.assigned": { ID: "{n} hari di-assign.", EN: "{n} days assigned." },

  // ---------------- Price List (/price-list) ----------------
  "priceList.title": { ID: "Weekly Price List", EN: "Weekly Price List" },
  "priceList.subtitleWithPeriod": {
    ID: "Benchmarking harga mingguan Rp/kg · {period}",
    EN: "Weekly price benchmarking IDR/kg · {period}"
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
    ID: "Weekly Price List · Benchmarking Supplier",
    EN: "Weekly Price List · Supplier Benchmarking"
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
  "priceList.legend": { ID: "🟢 termurah · 🔴 termahal per baris", EN: "🟢 cheapest · 🔴 most expensive per row" },
  "priceList.readOnly": {
    ID: "Read-only — peran Anda tidak punya akses edit.",
    EN: "Read-only — your role does not have edit access."
  },

  // ---------------- DocGen (/docgen) ----------------
  "docgen.title": { ID: "Document Generator", EN: "Document Generator" },
  "docgen.subtitle": {
    ID: "Preview & print dokumen resmi SPPG · PO · GRN · Invoice · Berita Acara",
    EN: "Preview & print official SPPG documents · PO · GRN · Invoice · Receipt Notes"
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

  // ---------------- BOM Variance (/menu/variance) ----------------
  "variance.title": { ID: "BOM Variance · Plan vs Actual", EN: "BOM Variance · Plan vs Actual" },
  "variance.subtitle": {
    ID: "Periode {start} → {end} · Threshold ±{pct}%",
    EN: "Period {start} → {end} · Threshold ±{pct}%"
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
    ID: "{over} over · {under} under · {ok} ok",
    EN: "{over} over · {under} under · {ok} ok"
  },
  "variance.kpiPlan": { ID: "Rencana", EN: "Plan" },
  "variance.kpiPlanSub": { ID: "berat bahan basah", EN: "wet ingredient weight" },
  "variance.kpiActual": { ID: "Realisasi", EN: "Actual" },
  "variance.kpiActualSub": { ID: "dari GRN ok/partial", EN: "from ok/partial GRN" },
  "variance.kpiVariance": { ID: "Variance", EN: "Variance" },
  "variance.secPerItem": { ID: "📋 Per Item", EN: "📋 Per Item" },
  "variance.secPerItemHint": {
    ID: "Plan dihitung dari menu_assign × gramasi tiered × porsi hadir. Actual dari GRN (status ok/partial). Flag OVER/UNDER jika |variance| > {pct}%.",
    EN: "Plan is computed from menu_assign × tiered grammage × servings attended. Actual from GRN (ok/partial status). Flag OVER/UNDER when |variance| > {pct}%."
  },
  "variance.emptyTitle": { ID: "Tidak ada data variance", EN: "No variance data" },
  "variance.emptyBody": {
    ID: "Belum ada plan/actual untuk rentang tanggal ini. Pastikan menu_assign sudah ter-generate dan periode meliputi hari kerja.",
    EN: "No plan/actual data for this date range yet. Make sure menu_assign has been generated and the period covers workdays."
  },
  "variance.colFlag": { ID: "Flag", EN: "Flag" },
  "variance.colPlanKg": { ID: "Plan (kg)", EN: "Plan (kg)" },
  "variance.colActualKg": { ID: "Actual (kg)", EN: "Actual (kg)" },
  "variance.colDeltaKg": { ID: "Δ (kg)", EN: "Δ (kg)" },
  "variance.colDeltaPct": { ID: "Δ (%)", EN: "Δ (%)" },
  "variance.secPerMenu": { ID: "🍽️ Per Menu", EN: "🍽️ Per Menu" },
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
    ID: "BOM Variance · basis tiered gramasi 4 age-band · fallback grams_per_porsi · go-live 4 Mei 2026",
    EN: "BOM Variance · tiered 4-age-band grammage · grams_per_porsi fallback · go-live 4 May 2026"
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
    ID: "Agregasi kebutuhan tanggal tertentu → split ke multiple supplier (qty absolut) → auto-generate quotation per supplier.",
    EN: "Aggregate requirements for a given date → split across multiple suppliers (absolute qty) → auto-generate a quotation per supplier."
  },
  "qtNew.title": { ID: "Buat Quotation Baru", EN: "Create New Quotation" },
  "qtNew.subtitle": {
    ID: "Draft harga ke supplier sebelum PO · export untuk supplier tanda tangan, lalu convert ke PO.",
    EN: "Price draft to supplier before PO · export for supplier signature, then convert to PO."
  },

  // ---------------- Transaction Log component ----------------
  "tx.title": { ID: "📦 Transaksi Rantai Pasok · 50 Terakhir", EN: "📦 Supply Chain Transactions · Last 50" },
  "tx.filterDate": { ID: "Filter tanggal:", EN: "Filter date:" },
  "tx.allTypes": { ID: "Semua tipe", EN: "All types" },
  "tx.typePO": { ID: "Purchase Order", EN: "Purchase Order" },
  "tx.typeGRN": { ID: "Goods Receipt", EN: "Goods Receipt" },
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
  "tx.nRows": { ID: "{n} baris", EN: "{n} rows" },
  "tx.empty": { ID: "Belum ada transaksi yang cocok.", EN: "No matching transactions." }
} as const satisfies Record<string, Pair>;

export type LangKey = keyof typeof LANG_KEYS;

export function t(key: LangKey, lang: Lang): string {
  return LANG_KEYS[key][lang];
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
  n: number,
  lang: Lang,
  opts: Intl.NumberFormatOptions = {}
): string {
  return n.toLocaleString(numberLocale(lang), opts);
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
