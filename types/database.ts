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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      menu_bom: {
        Row: {
          menu_id: number;
          item_code: string;
          grams_per_porsi: number;
          grams_paud: number;
          grams_sd13: number;
          grams_sd46: number;
          grams_smp: number;
        };
        Insert: {
          menu_id: number;
          item_code: string;
          grams_per_porsi: number;
          grams_paud?: number;
          grams_sd13?: number;
          grams_sd46?: number;
          grams_smp?: number;
        };
        Update: Partial<Database["public"]["Tables"]["menu_bom"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
      };
      school_attendance: {
        Row: {
          school_id: string;
          att_date: string;
          qty: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          school_id: string;
          att_date: string;
          qty: number;
          updated_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["school_attendance"]["Insert"]
        >;
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      supplier_certs: {
        Row: {
          id: number;
          supplier_id: string;
          name: string;
          valid_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          supplier_id: string;
          name: string;
          valid_until?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["supplier_certs"]["Insert"]
        >;
        Relationships: [];
      };
      qc_checklist_templates: {
        Row: {
          id: number;
          category: Database["public"]["Enums"]["item_category"];
          item_code: string | null;
          checkpoint: string;
          expected: string | null;
          is_critical: boolean;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          category: Database["public"]["Enums"]["item_category"];
          item_code?: string | null;
          checkpoint: string;
          expected?: string | null;
          is_critical?: boolean;
          sort_order?: number;
          active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["qc_checklist_templates"]["Insert"]
        >;
        Relationships: [];
      };
      grn_qc_checks: {
        Row: {
          id: number;
          grn_no: string;
          item_code: string | null;
          checkpoint: string;
          is_critical: boolean;
          result: Database["public"]["Enums"]["qc_result"];
          note: string | null;
          photo_url: string | null;
          checked_by: string | null;
          checked_at: string;
        };
        Insert: {
          id?: number;
          grn_no: string;
          item_code?: string | null;
          checkpoint: string;
          is_critical?: boolean;
          result?: Database["public"]["Enums"]["qc_result"];
          note?: string | null;
          photo_url?: string | null;
          checked_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["grn_qc_checks"]["Insert"]
        >;
        Relationships: [];
      };
      non_conformance_log: {
        Row: {
          id: number;
          ncr_no: string | null;
          grn_no: string | null;
          supplier_id: string | null;
          item_code: string | null;
          severity: Database["public"]["Enums"]["ncr_severity"];
          status: Database["public"]["Enums"]["ncr_status"];
          issue: string;
          root_cause: string | null;
          corrective_action: string | null;
          qty_affected: number | null;
          unit: string | null;
          cost_impact_idr: number | null;
          reported_at: string;
          reported_by: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          photo_url: string | null;
          linked_action_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          ncr_no?: string | null;
          grn_no?: string | null;
          supplier_id?: string | null;
          item_code?: string | null;
          severity?: Database["public"]["Enums"]["ncr_severity"];
          status?: Database["public"]["Enums"]["ncr_status"];
          issue: string;
          root_cause?: string | null;
          corrective_action?: string | null;
          qty_affected?: number | null;
          unit?: string | null;
          cost_impact_idr?: number | null;
          reported_by?: string | null;
          photo_url?: string | null;
          linked_action_id?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["non_conformance_log"]["Insert"]
        >;
        Relationships: [];
      };
      supplier_actions: {
        Row: {
          id: number;
          supplier_id: string | null;
          related_scope: string | null;
          title: string;
          description: string | null;
          category: string | null;
          priority: Database["public"]["Enums"]["action_priority"];
          status: Database["public"]["Enums"]["action_status"];
          owner: string;
          owner_user_id: string | null;
          target_date: string | null;
          done_at: string | null;
          done_by: string | null;
          blocked_reason: string | null;
          output_notes: string | null;
          source: Database["public"]["Enums"]["action_source"];
          source_ref: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          supplier_id?: string | null;
          related_scope?: string | null;
          title: string;
          description?: string | null;
          category?: string | null;
          priority?: Database["public"]["Enums"]["action_priority"];
          status?: Database["public"]["Enums"]["action_status"];
          owner?: string;
          owner_user_id?: string | null;
          target_date?: string | null;
          done_at?: string | null;
          done_by?: string | null;
          blocked_reason?: string | null;
          output_notes?: string | null;
          source?: Database["public"]["Enums"]["action_source"];
          source_ref?: string | null;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["supplier_actions"]["Insert"]
        >;
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      non_op_days: {
        Row: { op_date: string; reason: string; created_by: string | null; created_at: string };
        Insert: { op_date: string; reason: string };
        Update: Partial<Database["public"]["Tables"]["non_op_days"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      quotations: {
        Row: {
          no: string;
          supplier_id: string;
          quote_date: string;
          valid_until: string | null;
          need_date: string | null;
          status: Database["public"]["Enums"]["quotation_status"];
          total: number;
          notes: string | null;
          converted_po_no: string | null;
          created_at: string;
          created_by: string | null;
          responded_at: string | null;
          responded_by: string | null;
        };
        Insert: {
          no?: string;
          supplier_id: string;
          quote_date?: string;
          valid_until?: string | null;
          need_date?: string | null;
          status?: Database["public"]["Enums"]["quotation_status"];
          total?: number;
          notes?: string | null;
          converted_po_no?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["quotations"]["Insert"]>;
        Relationships: [];
      };
      quotation_rows: {
        Row: {
          qt_no: string;
          line_no: number;
          item_code: string;
          qty: number;
          unit: string;
          price_suggested: number | null;
          price_quoted: number | null;
          qty_quoted: number | null;
          note: string | null;
          subtotal: number;
        };
        Insert: {
          qt_no: string;
          line_no: number;
          item_code: string;
          qty: number;
          unit: string;
          price_suggested?: number | null;
          price_quoted?: number | null;
          qty_quoted?: number | null;
          note?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["quotation_rows"]["Insert"]
        >;
        Relationships: [];
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
      porsi_counts_tiered: {
        Args: { p_date: string };
        Returns: {
          paud: number;
          sd13: number;
          sd46: number;
          smp_plus: number;
          total: number;
          operasional: boolean;
        }[];
      };
      bom_variance: {
        Args: {
          p_start: string;
          p_end: string;
          p_threshold_pct?: number;
        };
        Returns: {
          item_code: string;
          name_en: string | null;
          unit: string;
          category: Database["public"]["Enums"]["item_category"];
          plan_kg: number;
          actual_kg: number;
          variance_kg: number;
          variance_pct: number | null;
          flag: string;
        }[];
      };
      bom_variance_summary: {
        Args: {
          p_start: string;
          p_end: string;
          p_threshold_pct?: number;
        };
        Returns: {
          total_items: number;
          over_cnt: number;
          under_cnt: number;
          ok_cnt: number;
          total_plan_kg: number;
          total_actual_kg: number;
          total_variance_kg: number;
          total_variance_pct: number | null;
        }[];
      };
      bom_variance_by_menu: {
        Args: { p_start: string; p_end: string };
        Returns: {
          menu_id: number;
          menu_name: string;
          days_served: number;
          plan_porsi: number;
          plan_kg_total: number;
          plan_cost_idr: number;
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
      admin_reset_transactional: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_reset_stock: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_reset_master: {
        Args: Record<string, never>;
        Returns: Json;
      };
      monthly_requirements: {
        Args: { p_start: string; p_months?: number };
        Returns: {
          item_code: string;
          month: string;
          qty_kg: number;
        }[];
      };
      top_suppliers_by_spend: {
        Args: { p_start: string; p_end: string; p_limit?: number };
        Returns: {
          supplier_id: string;
          supplier_name: string;
          supplier_type: Database["public"]["Enums"]["supplier_type"];
          total_spend: number;
          invoice_count: number;
        }[];
      };
      daily_planning: {
        Args: { p_horizon?: number };
        Returns: {
          op_date: string;
          menu_id: number | null;
          menu_name: string | null;
          porsi_total: number;
          porsi_eff: number;
          total_kg: number;
          short_items: number;
          operasional: boolean;
        }[];
      };
      dashboard_kpis: {
        Args: Record<string, never>;
        Returns: {
          students_total: number;
          schools_active: number;
          menu_today_id: number | null;
          menu_today_name: string | null;
          suppliers_active: number;
        }[];
      };
      list_supplier_actions: {
        Args: {
          p_supplier_id?: string | null;
          p_status?: Database["public"]["Enums"]["action_status"] | null;
          p_source?: Database["public"]["Enums"]["action_source"] | null;
        };
        Returns: {
          id: number;
          supplier_id: string | null;
          supplier_name: string | null;
          related_scope: string | null;
          title: string;
          description: string | null;
          category: string | null;
          priority: Database["public"]["Enums"]["action_priority"];
          status: Database["public"]["Enums"]["action_status"];
          owner: string;
          target_date: string | null;
          done_at: string | null;
          blocked_reason: string | null;
          output_notes: string | null;
          source: Database["public"]["Enums"]["action_source"];
          source_ref: string | null;
          days_to_target: number | null;
          is_overdue: boolean;
          created_at: string;
          updated_at: string;
        }[];
      };
      update_action_status: {
        Args: {
          p_id: number;
          p_status: Database["public"]["Enums"]["action_status"];
          p_notes?: string | null;
          p_blocked_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["supplier_actions"]["Row"];
      };
      action_readiness_snapshot: {
        Args: Record<string, never>;
        Returns: {
          total: number;
          open_cnt: number;
          in_progress_cnt: number;
          blocked_cnt: number;
          done_cnt: number;
          cancelled_cnt: number;
          overdue_cnt: number;
          high_priority_open: number;
          readiness_pct: number;
        }[];
      };
      overdue_actions: {
        Args: Record<string, never>;
        Returns: {
          id: number;
          supplier_id: string | null;
          supplier_name: string | null;
          related_scope: string | null;
          title: string;
          priority: Database["public"]["Enums"]["action_priority"];
          status: Database["public"]["Enums"]["action_status"];
          target_date: string;
          days_late: number;
          owner: string;
        }[];
      };
      qc_template_for_item: {
        Args: { p_item: string };
        Returns: {
          id: number;
          category: Database["public"]["Enums"]["item_category"];
          checkpoint: string;
          expected: string | null;
          is_critical: boolean;
          sort_order: number;
        }[];
      };
      grn_qc_summary: {
        Args: { p_grn_no: string };
        Returns: {
          total: number;
          pass: number;
          minor: number;
          major: number;
          critical: number;
          fail_total: number;
          has_critical: boolean;
        }[];
      };
      ncr_open_snapshot: {
        Args: Record<string, never>;
        Returns: {
          total: number;
          open_cnt: number;
          in_progress_cnt: number;
          resolved_cnt: number;
          critical_open: number;
          avg_resolve_days: number | null;
        }[];
      };
      quotation_seed_from_date: {
        Args: { p_date: string };
        Returns: {
          item_code: string;
          qty: number;
          unit: string;
          price_suggested: number | null;
        }[];
      };
      convert_quotation_to_po: {
        Args: { p_qt_no: string };
        Returns: string;
      };
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
      action_status:
        | "open"
        | "in_progress"
        | "blocked"
        | "done"
        | "cancelled";
      action_priority: "low" | "medium" | "high" | "critical";
      action_source: "onboarding" | "mom" | "field" | "audit" | "ad_hoc";
      qc_result: "pass" | "minor" | "major" | "critical" | "na";
      ncr_severity: "minor" | "major" | "critical";
      ncr_status: "open" | "in_progress" | "resolved" | "waived";
      quotation_status:
        | "draft"
        | "sent"
        | "responded"
        | "accepted"
        | "converted"
        | "rejected"
        | "expired";
    };
    CompositeTypes: Record<string, never>;
  };
}
