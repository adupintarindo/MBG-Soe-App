// Lightweight i18n dictionary for the global Nav + shared chrome.
// Other pages can import LANG[lang][key] directly.

export type Lang = "ID" | "EN";

export const LANG_KEYS = {
  // Brand
  appTitle: { ID: "Supply Chain MBG", EN: "MBG Supply Chain" },
  brandSub: { ID: "SPPG Nunumeu · Kota Soe", EN: "SPPG Nunumeu · Soe City" },
  brandRegion: {
    ID: "Timor Tengah Selatan · Nusa Tenggara Timur",
    EN: "South Central Timor · East Nusa Tenggara"
  },
  // Status chip
  statusOperasional: { ID: "Operasional", EN: "Operational" },
  statusOutOfHours: { ID: "Tidak Operasional", EN: "Outside Hours" },
  statusWeekend: { ID: "Akhir Pekan", EN: "Weekend" },
  statusHoliday: { ID: "Libur", EN: "Holiday" },
  statusMenuPrefix: { ID: "Menu", EN: "Menu" },
  // Buttons
  signOut: { ID: "Keluar", EN: "Sign Out" },
  themeLight: { ID: "Mode terang", EN: "Light mode" },
  themeDark: { ID: "Mode gelap", EN: "Dark mode" },
  // Tabs
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
  tabAdmin: { ID: "Admin", EN: "Admin" }
} as const;

export type LangKey = keyof typeof LANG_KEYS;

export function t(key: LangKey, lang: Lang): string {
  return LANG_KEYS[key][lang];
}
