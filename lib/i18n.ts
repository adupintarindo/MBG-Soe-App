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

  // ---------------- BOM Variance (/menu/variance) ----------------
  "variance.title": { ID: "BOM Variance · Plan vs Actual", EN: "BOM Variance · Plan vs Actual" },
  "variance.subtitle": {
    ID: "Periode {start} → {end} · Threshold ±{pct}%",
    EN: "Period {start} → {end} · Threshold ±{pct}%"
  },
  "variance.noGRN": { ID: "Belum ada GRN actual dalam periode ini", EN: "No actual GRN in this period yet" },

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
