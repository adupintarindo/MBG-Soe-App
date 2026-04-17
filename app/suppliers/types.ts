export interface SupplierRow {
  id: string;
  name: string;
  type: string;
  commodity: string | null;
  pic: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  notes: string | null;
  score: number | string | null;
  status: string;
  active: boolean;
}

export interface SupItemLink {
  supplier_id: string;
  item_code: string;
  is_main: boolean;
  price_idr: number | string | null;
  lead_time_days: number | null;
}

export interface InvoiceTx {
  no: string;
  supplier_id: string;
  inv_date: string;
  total: number | string;
  status: string;
  po_no: string | null;
}

export interface PoTx {
  no: string;
  supplier_id: string;
  po_date: string;
  total: number | string;
  status: string;
}

export interface ItemCatalog {
  code: string;
  name_en: string;
  unit: string;
  category: string;
}

export interface SupplierCert {
  id: number;
  supplier_id: string;
  name: string;
  valid_until: string | null;
  created_at: string;
}
