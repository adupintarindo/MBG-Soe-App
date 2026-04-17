// ============================================================================
// Database types · Hand-authored dari 0001_schema.sql
// Regenerate setelah migrasi perubahan dengan:
//   pnpm db:types   (butuh supabase CLI + linked project)
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: Database["public"]["Enums"]["user_role"];
          supplier_id: string | null;
          phone: string | null;
          active: boolean;
          created_at: string;
          invited_by: string | null;
          last_login_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          supplier_id?: string | null;
          phone?: string | null;
          active?: boolean;
          invited_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      invites: {
        Row: {
          id: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          supplier_id: string | null;
          token: string;
          created_by: string | null;
          created_at: string;
          expires_at: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          supplier_id?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invites"]["Insert"]>;
      };
      items: {
        Row: {
          code: string;
          name_en: string | null;
          unit: string;
          category: Database["public"]["Enums"]["item_category"];
          price_idr: number;
          vol_weekly: number | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          name_en?: string | null;
          unit: string;
          category: Database["public"]["Enums"]["item_category"];
          price_idr?: number;
          vol_weekly?: number | null;
          notes?: string | null;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["items"]["Insert"]>;
      };
      menus: {
        Row: {
          id: number;
          name: string;
          name_en: string | null;
          cycle_day: number | null;
          active: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id: number;
          name: string;
          name_en?: string | null;
          cycle_day?: number | null;
          active?: boolean;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["menus"]["Insert"]>;
      };
      menu_bom: {
        Row: { menu_id: number; item_code: string; grams_per_porsi: number };
        Insert: { menu_id: number; item_code: string; grams_per_porsi: number };
        Update: Partial<Database["public"]["Tables"]["menu_bom"]["Insert"]>;
      };
      schools: {
        Row: {
          id: string;
          name: string;
          level: Database["public"]["Enums"]["school_level"];
          students: number;
          kelas13: number;
          kelas46: number;
          guru: number;
          distance_km: number | null;
          pic: string | null;
          phone: string | null;
          address: string | null;
          active: boolean;
        };
        Insert: {
          id: string;
          name: string;
          level: Database["public"]["Enums"]["school_level"];
          students?: number;
          kelas13?: number;
          kelas46?: number;
          guru?: number;
          distance_km?: number | null;
          pic?: string | null;
          phone?: string | null;
          address?: string | null;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["schools"]["Insert"]>;
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          type: Database["public"]["Enums"]["supplier_type"];
          commodity: string | null;
          pic: string | null;
          phone: string | null;
          address: string | null;
          email: string | null;
          notes: string | null;
          score: number | null;
          status: Database["public"]["Enums"]["supplier_status"];
          active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          type: Database["public"]["Enums"]["supplier_type"];
          commodity?: string | null;
          pic?: string | null;
          phone?: string | null;
          address?: string | null;
          email?: string | null;
          notes?: string | null;
          score?: number | null;
          status?: Database["public"]["Enums"]["supplier_status"];
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
      };
      supplier_items: {
        Row: {
          supplier_id: string;
          item_code: string;
          is_main: boolean;
          price_idr: number | null;
          lead_time_days: number | null;
        };
        Insert: {
          supplier_id: string;
          item_code: string;
          is_main?: boolean;
          price_idr?: number | null;
          lead_time_days?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["supplier_items"]["Insert"]
        >;
      };
      menu_assign: {
        Row: {
          assign_date: string;
          menu_id: number;
          note: string | null;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          assign_date: string;
          menu_id: number;
          note?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["menu_assign"]["Insert"]
        >;
      };
      custom_menus: {
        Row: {
          menu_date: string;
          karbo: Json;
          protein: Json;
          sayur: Json;
          buah: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          menu_date: string;
          karbo?: Json;
          protein?: Json;
          sayur?: Json;
          buah?: Json;
        };
        Update: Partial<
          Database["public"]["Tables"]["custom_menus"]["Insert"]
        >;
      };
      non_op_days: {
        Row: { op_date: string; reason: string; created_by: string | null; created_at: string };
        Insert: { op_date: string; reason: string };
        Update: Partial<Database["public"]["Tables"]["non_op_days"]["Insert"]>;
      };
      stock: {
        Row: {
          item_code: string;
          qty: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: { item_code: string; qty?: number };
        Update: Partial<Database["public"]["Tables"]["stock"]["Insert"]>;
      };
      stock_moves: {
        Row: {
          id: number;
          item_code: string;
          delta: number;
          reason: Database["public"]["Enums"]["move_reason"];
          ref_doc: string | null;
          ref_no: string | null;
          note: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          item_code: string;
          delta: number;
          reason: Database["public"]["Enums"]["move_reason"];
          ref_doc?: string | null;
          ref_no?: string | null;
          note?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["stock_moves"]["Insert"]
        >;
      };
      purchase_orders: {
        Row: {
          no: string;
          po_date: string;
          supplier_id: string;
          delivery_date: string | null;
          total: number;
          status: Database["public"]["Enums"]["po_status"];
          ref_contract: string | null;
          pay_method: string | null;
          top: string | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          no: string;
          po_date: string;
          supplier_id: string;
          delivery_date?: string | null;
          total?: number;
          status?: Database["public"]["Enums"]["po_status"];
        };
        Update: Partial<
          Database["public"]["Tables"]["purchase_orders"]["Insert"]
        >;
      };
      po_rows: {
        Row: {
          po_no: string;
          line_no: number;
          item_code: string;
          qty: number;
          unit: string;
          price: number;
          subtotal: number;
        };
        Insert: {
          po_no: string;
          line_no: number;
          item_code: string;
          qty: number;
          unit: string;
          price: number;
        };
        Update: Partial<Database["public"]["Tables"]["po_rows"]["Insert"]>;
      };
      grns: {
        Row: {
          no: string;
          po_no: string | null;
          grn_date: string;
          status: Database["public"]["Enums"]["grn_status"];
          qc_note: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          no: string;
          grn_date: string;
          po_no?: string | null;
          status?: Database["public"]["Enums"]["grn_status"];
          qc_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["grns"]["Insert"]>;
      };
      invoices: {
        Row: {
          no: string;
          po_no: string | null;
          inv_date: string;
          supplier_id: string;
          total: number;
          due_date: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          created_at: string;
        };
        Insert: {
          no: string;
          inv_date: string;
          supplier_id: string;
          total: number;
          po_no?: string | null;
          due_date?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      receipts: {
        Row: {
          id: string;
          ref: string;
          note: string | null;
          photo_url: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: { ref: string; note?: string | null; photo_url?: string | null };
        Update: Partial<Database["public"]["Tables"]["receipts"]["Insert"]>;
      };
      transactions: {
        Row: {
          id: number;
          tx_date: string;
          tx_type: Database["public"]["Enums"]["tx_type"];
          ref_no: string | null;
          supplier_id: string | null;
          amount: number | null;
          description: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          tx_date: string;
          tx_type: Database["public"]["Enums"]["tx_type"];
          ref_no?: string | null;
          supplier_id?: string | null;
          amount?: number | null;
          description?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["transactions"]["Insert"]
        >;
      };
      settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: { key: string; value: Json };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      porsi_counts: {
        Args: { p_date: string };
        Returns: {
          kecil: number;
          besar: number;
          guru: number;
          total: number;
          operasional: boolean;
        }[];
      };
      porsi_effective: {
        Args: { p_date: string };
        Returns: number;
      };
      requirement_for_date: {
        Args: { p_date: string };
        Returns: {
          item_code: string;
          qty: number;
          unit: string;
          category: Database["public"]["Enums"]["item_category"];
          price_idr: number;
        }[];
      };
      stock_shortage_for_date: {
        Args: { p_date: string };
        Returns: {
          item_code: string;
          required: number;
          on_hand: number;
          gap: number;
          unit: string;
        }[];
      };
      upcoming_shortages: {
        Args: { p_horizon: number };
        Returns: {
          op_date: string;
          short_items: number;
          total_gap_kg: number;
        }[];
      };
      create_invite: {
        Args: {
          p_email: string;
          p_role: Database["public"]["Enums"]["user_role"];
          p_supplier_id?: string | null;
        };
        Returns: string;
      };
      current_role: {
        Args: Record<string, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      current_supplier_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: "admin" | "operator" | "ahli_gizi" | "supplier" | "viewer";
      item_category:
        | "BERAS"
        | "HEWANI"
        | "NABATI"
        | "SAYUR_HIJAU"
        | "SAYUR"
        | "UMBI"
        | "BUMBU"
        | "REMPAH"
        | "BUAH"
        | "SEMBAKO"
        | "LAIN";
      school_level: "PAUD/TK" | "SD" | "SMP" | "SMA" | "SMK";
      supplier_type:
        | "BUMN"
        | "PT"
        | "CV"
        | "UD"
        | "KOPERASI"
        | "POKTAN"
        | "TOKO"
        | "KIOS"
        | "INFORMAL";
      supplier_status: "signed" | "awaiting" | "rejected" | "draft";
      move_reason:
        | "receipt"
        | "consumption"
        | "adjustment"
        | "waste"
        | "transfer_in"
        | "transfer_out"
        | "opening";
      po_status:
        | "draft"
        | "sent"
        | "confirmed"
        | "delivered"
        | "closed"
        | "cancelled";
      grn_status: "pending" | "ok" | "partial" | "rejected";
      invoice_status: "issued" | "paid" | "overdue" | "cancelled";
      tx_type:
        | "po"
        | "grn"
        | "invoice"
        | "payment"
        | "adjustment"
        | "receipt";
    };
    CompositeTypes: Record<string, never>;
  };
}
