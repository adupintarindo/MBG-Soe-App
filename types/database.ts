export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      custom_menus: {
        Row: {
          buah: Json
          created_at: string
          created_by: string | null
          karbo: Json
          menu_date: string
          protein: Json
          sayur: Json
        }
        Insert: {
          buah?: Json
          created_at?: string
          created_by?: string | null
          karbo?: Json
          menu_date: string
          protein?: Json
          sayur?: Json
        }
        Update: {
          buah?: Json
          created_at?: string
          created_by?: string | null
          karbo?: Json
          menu_date?: string
          protein?: Json
          sayur?: Json
        }
        Relationships: []
      }
      grn_qc_checks: {
        Row: {
          checked_at: string
          checked_by: string | null
          checkpoint: string
          grn_no: string
          id: number
          is_critical: boolean
          item_code: string | null
          note: string | null
          photo_url: string | null
          result: Database["public"]["Enums"]["qc_result"]
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          checkpoint: string
          grn_no: string
          id?: number
          is_critical?: boolean
          item_code?: string | null
          note?: string | null
          photo_url?: string | null
          result?: Database["public"]["Enums"]["qc_result"]
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          checkpoint?: string
          grn_no?: string
          id?: number
          is_critical?: boolean
          item_code?: string | null
          note?: string | null
          photo_url?: string | null
          result?: Database["public"]["Enums"]["qc_result"]
        }
        Relationships: [
          {
            foreignKeyName: "grn_qc_checks_grn_no_fkey"
            columns: ["grn_no"]
            isOneToOne: false
            referencedRelation: "grns"
            referencedColumns: ["no"]
          },
          {
            foreignKeyName: "grn_qc_checks_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
        ]
      }
      grn_rows: {
        Row: {
          created_at: string
          created_by: string | null
          grn_no: string
          item_code: string
          line_no: number
          note: string | null
          qty_ordered: number
          qty_received: number
          qty_rejected: number
          unit: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grn_no: string
          item_code: string
          line_no: number
          note?: string | null
          qty_ordered?: number
          qty_received?: number
          qty_rejected?: number
          unit: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grn_no?: string
          item_code?: string
          line_no?: number
          note?: string | null
          qty_ordered?: number
          qty_received?: number
          qty_rejected?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "grn_rows_grn_no_fkey"
            columns: ["grn_no"]
            isOneToOne: false
            referencedRelation: "grns"
            referencedColumns: ["no"]
          },
          {
            foreignKeyName: "grn_rows_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
        ]
      }
      grns: {
        Row: {
          created_at: string
          created_by: string | null
          grn_date: string
          no: string
          po_no: string | null
          qc_note: string | null
          status: Database["public"]["Enums"]["grn_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grn_date: string
          no: string
          po_no?: string | null
          qc_note?: string | null
          status?: Database["public"]["Enums"]["grn_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grn_date?: string
          no?: string
          po_no?: string | null
          qc_note?: string | null
          status?: Database["public"]["Enums"]["grn_status"]
        }
        Relationships: [
          {
            foreignKeyName: "grns_po_no_fkey"
            columns: ["po_no"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["no"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          supplier_id: string | null
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          supplier_id?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          supplier_id?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          due_date: string | null
          inv_date: string
          no: string
          po_no: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          supplier_id: string
          total: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          inv_date: string
          no: string
          po_no?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          supplier_id: string
          total: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          inv_date?: string
          no?: string
          po_no?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          supplier_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_po_no_fkey"
            columns: ["po_no"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["no"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["item_category"]
          code: string
          created_at: string
          name_en: string | null
          notes: string | null
          price_idr: number
          unit: string
          updated_at: string
          vol_weekly: number | null
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["item_category"]
          code: string
          created_at?: string
          name_en?: string | null
          notes?: string | null
          price_idr?: number
          unit: string
          updated_at?: string
          vol_weekly?: number | null
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["item_category"]
          code?: string
          created_at?: string
          name_en?: string | null
          notes?: string | null
          price_idr?: number
          unit?: string
          updated_at?: string
          vol_weekly?: number | null
        }
        Relationships: []
      }
      menu_assign: {
        Row: {
          assign_date: string
          assigned_at: string
          assigned_by: string | null
          menu_id: number
          note: string | null
        }
        Insert: {
          assign_date: string
          assigned_at?: string
          assigned_by?: string | null
          menu_id: number
          note?: string | null
        }
        Update: {
          assign_date?: string
          assigned_at?: string
          assigned_by?: string | null
          menu_id?: number
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_assign_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_bom: {
        Row: {
          grams_paud: number
          grams_per_porsi: number
          grams_sd13: number
          grams_sd46: number
          grams_smp: number
          item_code: string
          menu_id: number
        }
        Insert: {
          grams_paud?: number
          grams_per_porsi: number
          grams_sd13?: number
          grams_sd46?: number
          grams_smp?: number
          item_code: string
          menu_id: number
        }
        Update: {
          grams_paud?: number
          grams_per_porsi?: number
          grams_sd13?: number
          grams_sd46?: number
          grams_smp?: number
          item_code?: string
          menu_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_bom_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "menu_bom_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          active: boolean
          created_at: string
          cycle_day: number | null
          id: number
          name: string
          name_en: string | null
          notes: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          cycle_day?: number | null
          id: number
          name: string
          name_en?: string | null
          notes?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          cycle_day?: number | null
          id?: number
          name?: string
          name_en?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      non_conformance_log: {
        Row: {
          corrective_action: string | null
          cost_impact_idr: number | null
          created_at: string
          grn_no: string | null
          id: number
          issue: string
          item_code: string | null
          linked_action_id: number | null
          ncr_no: string | null
          photo_url: string | null
          qty_affected: number | null
          reported_at: string
          reported_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          severity: Database["public"]["Enums"]["ncr_severity"]
          status: Database["public"]["Enums"]["ncr_status"]
          supplier_id: string | null
          unit: string | null
        }
        Insert: {
          corrective_action?: string | null
          cost_impact_idr?: number | null
          created_at?: string
          grn_no?: string | null
          id?: number
          issue: string
          item_code?: string | null
          linked_action_id?: number | null
          ncr_no?: string | null
          photo_url?: string | null
          qty_affected?: number | null
          reported_at?: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["ncr_severity"]
          status?: Database["public"]["Enums"]["ncr_status"]
          supplier_id?: string | null
          unit?: string | null
        }
        Update: {
          corrective_action?: string | null
          cost_impact_idr?: number | null
          created_at?: string
          grn_no?: string | null
          id?: number
          issue?: string
          item_code?: string | null
          linked_action_id?: number | null
          ncr_no?: string | null
          photo_url?: string | null
          qty_affected?: number | null
          reported_at?: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["ncr_severity"]
          status?: Database["public"]["Enums"]["ncr_status"]
          supplier_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "non_conformance_log_grn_no_fkey"
            columns: ["grn_no"]
            isOneToOne: false
            referencedRelation: "grns"
            referencedColumns: ["no"]
          },
          {
            foreignKeyName: "non_conformance_log_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "non_conformance_log_linked_action_id_fkey"
            columns: ["linked_action_id"]
            isOneToOne: false
            referencedRelation: "supplier_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformance_log_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      non_op_days: {
        Row: {
          created_at: string
          created_by: string | null
          op_date: string
          reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          op_date: string
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          op_date?: string
          reason?: string
        }
        Relationships: []
      }
      po_rows: {
        Row: {
          item_code: string
          line_no: number
          po_no: string
          price: number
          qty: number
          subtotal: number | null
          unit: string
        }
        Insert: {
          item_code: string
          line_no: number
          po_no: string
          price: number
          qty: number
          subtotal?: number | null
          unit: string
        }
        Update: {
          item_code?: string
          line_no?: number
          po_no?: string
          price?: number
          qty?: number
          subtotal?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_rows_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "po_rows_po_no_fkey"
            columns: ["po_no"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["no"]
          },
        ]
      }
      pr_allocations: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          line_no: number
          note: string | null
          pr_no: string
          qty_planned: number
          quotation_no: string | null
          supplier_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: number
          line_no: number
          note?: string | null
          pr_no: string
          qty_planned: number
          quotation_no?: string | null
          supplier_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: number
          line_no?: number
          note?: string | null
          pr_no?: string
          qty_planned?: number
          quotation_no?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_allocations_pr_no_line_no_fkey"
            columns: ["pr_no", "line_no"]
            isOneToOne: false
            referencedRelation: "pr_rows"
            referencedColumns: ["pr_no", "line_no"]
          },
          {
            foreignKeyName: "pr_allocations_quotation_no_fkey"
            columns: ["quotation_no"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["no"]
          },
          {
            foreignKeyName: "pr_allocations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_rows: {
        Row: {
          item_code: string
          line_no: number
          note: string | null
          pr_no: string
          qty_total: number
          unit: string
        }
        Insert: {
          item_code: string
          line_no: number
          note?: string | null
          pr_no: string
          qty_total: number
          unit: string
        }
        Update: {
          item_code?: string
          line_no?: number
          note?: string | null
          pr_no?: string
          qty_total?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_rows_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "pr_rows_pr_no_fkey"
            columns: ["pr_no"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["no"]
          },
        ]
      }
      price_periods: {
        Row: {
          active: boolean
          created_at: string
          end_date: string
          id: number
          name: string
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_date: string
          id?: number
          name: string
          notes?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          end_date?: string
          id?: number
          name?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_weeks: {
        Row: {
          created_at: string
          end_date: string
          id: number
          label: string
          period_id: number
          start_date: string
          week_no: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: number
          label: string
          period_id: number
          start_date: string
          week_no: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: number
          label?: string
          period_id?: number
          start_date?: string
          week_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_weeks_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "price_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string | null
          id: string
          invited_by: string | null
          last_login_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          supplier_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          invited_by?: string | null
          last_login_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          supplier_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          last_login_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_date: string | null
          no: string
          notes: string | null
          pay_method: string | null
          po_date: string
          ref_contract: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          top: string | null
          total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          no: string
          notes?: string | null
          pay_method?: string | null
          po_date: string
          ref_contract?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          top?: string | null
          total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          no?: string
          notes?: string | null
          pay_method?: string | null
          po_date?: string
          ref_contract?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
          top?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requisitions: {
        Row: {
          created_at: string
          created_by: string | null
          need_date: string
          no: string
          notes: string | null
          status: Database["public"]["Enums"]["pr_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          need_date: string
          no: string
          notes?: string | null
          status?: Database["public"]["Enums"]["pr_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          need_date?: string
          no?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["pr_status"]
        }
        Relationships: []
      }
      qc_checklist_templates: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["item_category"]
          checkpoint: string
          created_at: string
          expected: string | null
          id: number
          is_critical: boolean
          item_code: string | null
          sort_order: number
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["item_category"]
          checkpoint: string
          created_at?: string
          expected?: string | null
          id?: number
          is_critical?: boolean
          item_code?: string | null
          sort_order?: number
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["item_category"]
          checkpoint?: string
          created_at?: string
          expected?: string | null
          id?: number
          is_critical?: boolean
          item_code?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "qc_checklist_templates_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
        ]
      }
      quotation_rows: {
        Row: {
          item_code: string
          line_no: number
          note: string | null
          price_quoted: number | null
          price_suggested: number | null
          qt_no: string
          qty: number
          qty_quoted: number | null
          subtotal: number | null
          unit: string
        }
        Insert: {
          item_code: string
          line_no: number
          note?: string | null
          price_quoted?: number | null
          price_suggested?: number | null
          qt_no: string
          qty: number
          qty_quoted?: number | null
          subtotal?: number | null
          unit: string
        }
        Update: {
          item_code?: string
          line_no?: number
          note?: string | null
          price_quoted?: number | null
          price_suggested?: number | null
          qt_no?: string
          qty?: number
          qty_quoted?: number | null
          subtotal?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_rows_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quotation_rows_qt_no_fkey"
            columns: ["qt_no"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["no"]
          },
        ]
      }
      quotations: {
        Row: {
          converted_po_no: string | null
          created_at: string
          created_by: string | null
          need_date: string | null
          no: string
          notes: string | null
          pr_no: string | null
          quote_date: string
          responded_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["quotation_status"]
          supplier_id: string
          total: number
          valid_until: string | null
        }
        Insert: {
          converted_po_no?: string | null
          created_at?: string
          created_by?: string | null
          need_date?: string | null
          no: string
          notes?: string | null
          pr_no?: string | null
          quote_date?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          supplier_id: string
          total?: number
          valid_until?: string | null
        }
        Update: {
          converted_po_no?: string | null
          created_at?: string
          created_by?: string | null
          need_date?: string | null
          no?: string
          notes?: string | null
          pr_no?: string | null
          quote_date?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          supplier_id?: string
          total?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_converted_po_no_fkey"
            columns: ["converted_po_no"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["no"]
          },
          {
            foreignKeyName: "quotations_pr_no_fkey"
            columns: ["pr_no"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["no"]
          },
          {
            foreignKeyName: "quotations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          photo_url: string | null
          ref: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          photo_url?: string | null
          ref: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          photo_url?: string | null
          ref?: string
        }
        Relationships: []
      }
      school_attendance: {
        Row: {
          att_date: string
          qty: number
          school_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          att_date: string
          qty: number
          school_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          att_date?: string
          qty?: number
          school_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          active: boolean
          address: string | null
          distance_km: number | null
          guru: number
          id: string
          kelas13: number
          kelas46: number
          level: Database["public"]["Enums"]["school_level"]
          name: string
          phone: string | null
          pic: string | null
          students: number
        }
        Insert: {
          active?: boolean
          address?: string | null
          distance_km?: number | null
          guru?: number
          id: string
          kelas13?: number
          kelas46?: number
          level: Database["public"]["Enums"]["school_level"]
          name: string
          phone?: string | null
          pic?: string | null
          students?: number
        }
        Update: {
          active?: boolean
          address?: string | null
          distance_km?: number | null
          guru?: number
          id?: string
          kelas13?: number
          kelas46?: number
          level?: Database["public"]["Enums"]["school_level"]
          name?: string
          phone?: string | null
          pic?: string | null
          students?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      sop_runs: {
        Row: {
          created_at: string
          created_by: string | null
          evaluator: string | null
          id: number
          notes: string | null
          risks_flagged: string[]
          run_date: string
          sop_category: string
          sop_id: string
          sop_title: string
          steps_checked: number
          steps_total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evaluator?: string | null
          id?: never
          notes?: string | null
          risks_flagged?: string[]
          run_date?: string
          sop_category: string
          sop_id: string
          sop_title: string
          steps_checked?: number
          steps_total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evaluator?: string | null
          id?: never
          notes?: string | null
          risks_flagged?: string[]
          run_date?: string
          sop_category?: string
          sop_id?: string
          sop_title?: string
          steps_checked?: number
          steps_total?: number
        }
        Relationships: []
      }
      stock: {
        Row: {
          item_code: string
          qty: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          item_code: string
          qty?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          item_code?: string
          qty?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
        ]
      }
      stock_moves: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: number
          item_code: string
          note: string | null
          reason: Database["public"]["Enums"]["move_reason"]
          ref_doc: string | null
          ref_no: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: number
          item_code: string
          note?: string | null
          reason: Database["public"]["Enums"]["move_reason"]
          ref_doc?: string | null
          ref_no?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: number
          item_code?: string
          note?: string | null
          reason?: Database["public"]["Enums"]["move_reason"]
          ref_doc?: string | null
          ref_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_moves_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
        ]
      }
      supplier_actions: {
        Row: {
          blocked_reason: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          done_at: string | null
          done_by: string | null
          id: number
          output_notes: string | null
          owner: string
          owner_user_id: string | null
          priority: Database["public"]["Enums"]["action_priority"]
          related_scope: string | null
          source: Database["public"]["Enums"]["action_source"]
          source_ref: string | null
          status: Database["public"]["Enums"]["action_status"]
          supplier_id: string | null
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          done_at?: string | null
          done_by?: string | null
          id?: number
          output_notes?: string | null
          owner?: string
          owner_user_id?: string | null
          priority?: Database["public"]["Enums"]["action_priority"]
          related_scope?: string | null
          source?: Database["public"]["Enums"]["action_source"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          supplier_id?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          done_at?: string | null
          done_by?: string | null
          id?: number
          output_notes?: string | null
          owner?: string
          owner_user_id?: string | null
          priority?: Database["public"]["Enums"]["action_priority"]
          related_scope?: string | null
          source?: Database["public"]["Enums"]["action_source"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          supplier_id?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_actions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_certs: {
        Row: {
          created_at: string
          id: number
          name: string
          supplier_id: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          supplier_id: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          supplier_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_certs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_items: {
        Row: {
          is_main: boolean
          item_code: string
          lead_time_days: number | null
          price_idr: number | null
          supplier_id: string
        }
        Insert: {
          is_main?: boolean
          item_code: string
          lead_time_days?: number | null
          price_idr?: number | null
          supplier_id: string
        }
        Update: {
          is_main?: boolean
          item_code?: string
          lead_time_days?: number | null
          price_idr?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_items_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "supplier_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_prices: {
        Row: {
          commodity: Database["public"]["Enums"]["price_commodity"]
          created_at: string
          created_by: string | null
          id: number
          ingredient_name: string
          item_code: string | null
          notes: string | null
          price_per_item: number | null
          price_per_kg: number | null
          supplier_id: string
          unit: string | null
          updated_at: string
          week_id: number
        }
        Insert: {
          commodity: Database["public"]["Enums"]["price_commodity"]
          created_at?: string
          created_by?: string | null
          id?: number
          ingredient_name: string
          item_code?: string | null
          notes?: string | null
          price_per_item?: number | null
          price_per_kg?: number | null
          supplier_id: string
          unit?: string | null
          updated_at?: string
          week_id: number
        }
        Update: {
          commodity?: Database["public"]["Enums"]["price_commodity"]
          created_at?: string
          created_by?: string | null
          id?: number
          ingredient_name?: string
          item_code?: string | null
          notes?: string | null
          price_per_item?: number | null
          price_per_kg?: number | null
          supplier_id?: string
          unit?: string | null
          updated_at?: string
          week_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_prices_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_prices_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "price_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_reval: {
        Row: {
          compliance_score: number
          delivery_score: number
          evaluated_at: string
          evaluator: string | null
          id: number
          notes: string | null
          period: Database["public"]["Enums"]["reval_period"]
          period_end: string
          period_start: string
          price_score: number
          quality_score: number
          recommendation: string | null
          responsiveness_score: number
          supplier_id: string
          total_score: number | null
          w_compliance: number
          w_delivery: number
          w_price: number
          w_quality: number
          w_responsiveness: number
        }
        Insert: {
          compliance_score?: number
          delivery_score?: number
          evaluated_at?: string
          evaluator?: string | null
          id?: number
          notes?: string | null
          period?: Database["public"]["Enums"]["reval_period"]
          period_end: string
          period_start: string
          price_score?: number
          quality_score?: number
          recommendation?: string | null
          responsiveness_score?: number
          supplier_id: string
          total_score?: number | null
          w_compliance?: number
          w_delivery?: number
          w_price?: number
          w_quality?: number
          w_responsiveness?: number
        }
        Update: {
          compliance_score?: number
          delivery_score?: number
          evaluated_at?: string
          evaluator?: string | null
          id?: number
          notes?: string | null
          period?: Database["public"]["Enums"]["reval_period"]
          period_end?: string
          period_start?: string
          price_score?: number
          quality_score?: number
          recommendation?: string | null
          responsiveness_score?: number
          supplier_id?: string
          total_score?: number | null
          w_compliance?: number
          w_delivery?: number
          w_price?: number
          w_quality?: number
          w_responsiveness?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_reval_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          commodity: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          pic: string | null
          score: number | null
          status: Database["public"]["Enums"]["supplier_status"]
          type: Database["public"]["Enums"]["supplier_type"]
        }
        Insert: {
          active?: boolean
          address?: string | null
          commodity?: string | null
          created_at?: string
          email?: string | null
          id: string
          name: string
          notes?: string | null
          phone?: string | null
          pic?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["supplier_status"]
          type: Database["public"]["Enums"]["supplier_type"]
        }
        Update: {
          active?: boolean
          address?: string | null
          commodity?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pic?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["supplier_status"]
          type?: Database["public"]["Enums"]["supplier_type"]
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: number
          ref_no: string | null
          supplier_id: string | null
          tx_date: string
          tx_type: Database["public"]["Enums"]["tx_type"]
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          ref_no?: string | null
          supplier_id?: string | null
          tx_date: string
          tx_type: Database["public"]["Enums"]["tx_type"]
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          ref_no?: string | null
          supplier_id?: string | null
          tx_date?: string
          tx_type?: Database["public"]["Enums"]["tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_batches: {
        Row: {
          id: number
          item_code: string
          grn_no: string | null
          supplier_id: string | null
          batch_code: string | null
          qty_received: number
          qty_remaining: number
          unit: string
          received_date: string
          expiry_date: string | null
          note: string | null
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          item_code: string
          grn_no?: string | null
          supplier_id?: string | null
          batch_code?: string | null
          qty_received: number
          qty_remaining: number
          unit: string
          received_date: string
          expiry_date?: string | null
          note?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          item_code?: string
          grn_no?: string | null
          supplier_id?: string | null
          batch_code?: string | null
          qty_received?: number
          qty_remaining?: number
          unit?: string
          received_date?: string
          expiry_date?: string | null
          note?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          no: string
          invoice_no: string | null
          supplier_id: string | null
          pay_date: string
          amount: number
          method: Database["public"]["Enums"]["payment_method"]
          reference: string | null
          bukti_url: string | null
          note: string | null
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          no: string
          invoice_no?: string | null
          supplier_id?: string | null
          pay_date: string
          amount: number
          method?: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
          bukti_url?: string | null
          note?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          no?: string
          invoice_no?: string | null
          supplier_id?: string | null
          pay_date?: string
          amount?: number
          method?: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
          bukti_url?: string | null
          note?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cash_receipts: {
        Row: {
          no: string
          receipt_date: string
          source: Database["public"]["Enums"]["cash_source"]
          source_name: string | null
          amount: number
          period: string | null
          reference: string | null
          bukti_url: string | null
          note: string | null
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          no: string
          receipt_date: string
          source: Database["public"]["Enums"]["cash_source"]
          source_name?: string | null
          amount: number
          period?: string | null
          reference?: string | null
          bukti_url?: string | null
          note?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          no?: string
          receipt_date?: string
          source?: Database["public"]["Enums"]["cash_source"]
          source_name?: string | null
          amount?: number
          period?: string | null
          reference?: string | null
          bukti_url?: string | null
          note?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          no: string
          delivery_date: string
          menu_id: number | null
          driver_name: string | null
          vehicle: string | null
          dispatched_at: string | null
          completed_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          total_porsi_planned: number
          total_porsi_delivered: number
          note: string | null
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          no: string
          delivery_date: string
          menu_id?: number | null
          driver_name?: string | null
          vehicle?: string | null
          dispatched_at?: string | null
          completed_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          total_porsi_planned?: number
          total_porsi_delivered?: number
          note?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          no?: string
          delivery_date?: string
          menu_id?: number | null
          driver_name?: string | null
          vehicle?: string | null
          dispatched_at?: string | null
          completed_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          total_porsi_planned?: number
          total_porsi_delivered?: number
          note?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_stops: {
        Row: {
          id: number
          delivery_no: string
          stop_order: number
          school_id: string
          porsi_planned: number
          porsi_delivered: number
          arrival_at: string | null
          temperature_c: number | null
          receiver_name: string | null
          signature_url: string | null
          photo_url: string | null
          note: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          created_at: string
        }
        Insert: {
          id?: number
          delivery_no: string
          stop_order: number
          school_id: string
          porsi_planned?: number
          porsi_delivered?: number
          arrival_at?: string | null
          temperature_c?: number | null
          receiver_name?: string | null
          signature_url?: string | null
          photo_url?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          created_at?: string
        }
        Update: {
          id?: number
          delivery_no?: string
          stop_order?: number
          school_id?: string
          porsi_planned?: number
          porsi_delivered?: number
          arrival_at?: string | null
          temperature_c?: number | null
          receiver_name?: string | null
          signature_url?: string | null
          photo_url?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          created_at?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          id: number
          ts: string
          actor_id: string | null
          actor_email: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          table_name: string
          row_pk: string | null
          action: Database["public"]["Enums"]["audit_action"]
          diff: Json
          request_id: string | null
          user_agent: string | null
          ip: string | null
        }
        Insert: {
          id?: number
          ts?: string
          actor_id?: string | null
          actor_email?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          table_name: string
          row_pk?: string | null
          action: Database["public"]["Enums"]["audit_action"]
          diff: Json
          request_id?: string | null
          user_agent?: string | null
          ip?: string | null
        }
        Update: {
          id?: number
          ts?: string
          actor_id?: string | null
          actor_email?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          table_name?: string
          row_pk?: string | null
          action?: Database["public"]["Enums"]["audit_action"]
          diff?: Json
          request_id?: string | null
          user_agent?: string | null
          ip?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: number
          period: string
          source: Database["public"]["Enums"]["cash_source"]
          source_name: string | null
          amount_idr: number
          allocation: Json
          target_cost_per_portion: number | null
          note: string | null
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          period: string
          source: Database["public"]["Enums"]["cash_source"]
          source_name?: string | null
          amount_idr: number
          allocation?: Json
          target_cost_per_portion?: number | null
          note?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          period?: string
          source?: Database["public"]["Enums"]["cash_source"]
          source_name?: string | null
          amount_idr?: number
          allocation?: Json
          target_cost_per_portion?: number | null
          note?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      po_acknowledgements: {
        Row: {
          po_no: string
          decision: Database["public"]["Enums"]["po_ack_decision"]
          decided_at: string | null
          decided_by: string | null
          supplier_id: string | null
          note: string | null
          alt_delivery_date: string | null
          updated_at: string
        }
        Insert: {
          po_no: string
          decision?: Database["public"]["Enums"]["po_ack_decision"]
          decided_at?: string | null
          decided_by?: string | null
          supplier_id?: string | null
          note?: string | null
          alt_delivery_date?: string | null
          updated_at?: string
        }
        Update: {
          po_no?: string
          decision?: Database["public"]["Enums"]["po_ack_decision"]
          decided_at?: string | null
          decided_by?: string | null
          supplier_id?: string | null
          note?: string | null
          alt_delivery_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      supplier_messages: {
        Row: {
          id: number
          po_no: string | null
          supplier_id: string
          sender_id: string | null
          sender_role: Database["public"]["Enums"]["user_role"] | null
          body: string
          attachment_url: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: number
          po_no?: string | null
          supplier_id: string
          sender_id?: string | null
          sender_role?: Database["public"]["Enums"]["user_role"] | null
          body: string
          attachment_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          po_no?: string | null
          supplier_id?: string
          sender_id?: string | null
          sender_role?: Database["public"]["Enums"]["user_role"] | null
          body?: string
          attachment_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      invoice_uploads: {
        Row: {
          id: number
          po_no: string | null
          grn_no: string | null
          supplier_id: string
          invoice_no_supplier: string | null
          total: number
          file_url: string
          status: Database["public"]["Enums"]["invoice_upload_status"]
          approved_invoice_no: string | null
          rejected_reason: string | null
          uploaded_at: string
          uploaded_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: number
          po_no?: string | null
          grn_no?: string | null
          supplier_id: string
          invoice_no_supplier?: string | null
          total: number
          file_url: string
          status?: Database["public"]["Enums"]["invoice_upload_status"]
          approved_invoice_no?: string | null
          rejected_reason?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: number
          po_no?: string | null
          grn_no?: string | null
          supplier_id?: string
          invoice_no_supplier?: string | null
          total?: number
          file_url?: string
          status?: Database["public"]["Enums"]["invoice_upload_status"]
          approved_invoice_no?: string | null
          rejected_reason?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_price_list_matrix: {
        Row: {
          avg_per_kg: number | null
          commodity: Database["public"]["Enums"]["price_commodity"] | null
          ingredient_name: string | null
          item_code: string | null
          max_per_kg: number | null
          min_per_kg: number | null
          period_id: number | null
          period_name: string | null
          supplier_id: string | null
          supplier_name: string | null
          w1: number | null
          w10: number | null
          w11: number | null
          w12: number | null
          w2: number | null
          w3: number | null
          w4: number | null
          w5: number | null
          w6: number | null
          w7: number | null
          w8: number | null
          w9: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_weeks_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "price_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_prices_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stock_on_hand_by_item: {
        Row: {
          item_code: string | null
          unit: string | null
          qty_batches: number | null
          qty_aggregate: number | null
          active_batches: number | null
          nearest_expiry: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      action_readiness_snapshot: {
        Args: never
        Returns: {
          blocked_cnt: number
          cancelled_cnt: number
          done_cnt: number
          high_priority_open: number
          in_progress_cnt: number
          open_cnt: number
          overdue_cnt: number
          readiness_pct: number
          total: number
        }[]
      }
      admin_reset_master: { Args: never; Returns: Json }
      admin_reset_stock: { Args: never; Returns: Json }
      admin_reset_transactional: { Args: never; Returns: Json }
      bom_variance: {
        Args: { p_end: string; p_start: string; p_threshold_pct?: number }
        Returns: {
          actual_kg: number
          category: Database["public"]["Enums"]["item_category"]
          flag: string
          item_code: string
          name_en: string
          plan_kg: number
          unit: string
          variance_kg: number
          variance_pct: number
        }[]
      }
      bom_variance_by_menu: {
        Args: { p_end: string; p_start: string }
        Returns: {
          days_served: number
          menu_id: number
          menu_name: string
          plan_cost_idr: number
          plan_kg_total: number
          plan_porsi: number
        }[]
      }
      bom_variance_summary: {
        Args: { p_end: string; p_start: string; p_threshold_pct?: number }
        Returns: {
          ok_cnt: number
          over_cnt: number
          total_actual_kg: number
          total_items: number
          total_plan_kg: number
          total_variance_kg: number
          total_variance_pct: number
          under_cnt: number
        }[]
      }
      convert_quotation_to_po: { Args: { p_qt_no: string }; Returns: string }
      create_invite: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_supplier_id?: string
        }
        Returns: string
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_supplier_id: { Args: never; Returns: string }
      daily_planning: {
        Args: { p_horizon?: number }
        Returns: {
          menu_id: number
          menu_name: string
          op_date: string
          operasional: boolean
          porsi_eff: number
          porsi_total: number
          short_items: number
          total_kg: number
        }[]
      }
      dashboard_kpis: {
        Args: never
        Returns: {
          menu_today_id: number
          menu_today_name: string
          schools_active: number
          students_total: number
          suppliers_active: number
        }[]
      }
      grn_qc_summary: {
        Args: { p_grn_no: string }
        Returns: {
          critical: number
          fail_total: number
          has_critical: boolean
          major: number
          minor: number
          pass: number
          total: number
        }[]
      }
      import_price_list_json: {
        Args: { p_payload: Json; p_period_id: number }
        Returns: {
          cells_upserted: number
          rows_processed: number
          suppliers_missing: string[]
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      list_sop_runs: {
        Args: { p_limit?: number; p_sop_id?: string }
        Returns: {
          created_at: string
          evaluator: string
          id: number
          notes: string
          risks_flagged: string[]
          run_date: string
          sop_category: string
          sop_id: string
          sop_title: string
          steps_checked: number
          steps_total: number
        }[]
      }
      list_supplier_actions: {
        Args: {
          p_source?: Database["public"]["Enums"]["action_source"]
          p_status?: Database["public"]["Enums"]["action_status"]
          p_supplier_id?: string
        }
        Returns: {
          blocked_reason: string
          category: string
          created_at: string
          days_to_target: number
          description: string
          done_at: string
          id: number
          is_overdue: boolean
          output_notes: string
          owner: string
          priority: Database["public"]["Enums"]["action_priority"]
          related_scope: string
          source: Database["public"]["Enums"]["action_source"]
          source_ref: string
          status: Database["public"]["Enums"]["action_status"]
          supplier_id: string
          supplier_name: string
          target_date: string
          title: string
          updated_at: string
        }[]
      }
      list_supplier_reval: {
        Args: { p_supplier_id: string }
        Returns: {
          compliance_score: number
          delivery_score: number
          evaluated_at: string
          evaluator: string | null
          id: number
          notes: string | null
          period: Database["public"]["Enums"]["reval_period"]
          period_end: string
          period_start: string
          price_score: number
          quality_score: number
          recommendation: string | null
          responsiveness_score: number
          supplier_id: string
          total_score: number | null
          w_compliance: number
          w_delivery: number
          w_price: number
          w_quality: number
          w_responsiveness: number
        }[]
        SetofOptions: {
          from: "*"
          to: "supplier_reval"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      log_sop_run: {
        Args: {
          p_notes?: string
          p_risks_flagged: string[]
          p_run_date?: string
          p_sop_category: string
          p_sop_id: string
          p_sop_title: string
          p_steps_checked: number
          p_steps_total: number
        }
        Returns: number
      }
      monthly_requirements: {
        Args: { p_months?: number; p_start: string }
        Returns: {
          item_code: string
          month: string
          qty_kg: number
        }[]
      }
      ncr_open_snapshot: {
        Args: never
        Returns: {
          avg_resolve_days: number
          critical_open: number
          in_progress_cnt: number
          open_cnt: number
          resolved_cnt: number
          total: number
        }[]
      }
      overdue_actions: {
        Args: never
        Returns: {
          days_late: number
          id: number
          owner: string
          priority: Database["public"]["Enums"]["action_priority"]
          related_scope: string
          status: Database["public"]["Enums"]["action_status"]
          supplier_id: string
          supplier_name: string
          target_date: string
          title: string
        }[]
      }
      porsi_counts: {
        Args: { p_date: string }
        Returns: {
          besar: number
          guru: number
          kecil: number
          operasional: boolean
          total: number
        }[]
      }
      porsi_counts_tiered: {
        Args: { p_date: string }
        Returns: {
          operasional: boolean
          paud: number
          sd13: number
          sd46: number
          smp_plus: number
          total: number
        }[]
      }
      porsi_effective: { Args: { p_date: string }; Returns: number }
      pr_allocation_summary: {
        Args: { p_pr_no: string }
        Returns: {
          gap: number
          item_code: string
          line_no: number
          qty_planned_sum: number
          qty_po_sum: number
          qty_quoted_sum: number
          qty_total: number
          unit: string
        }[]
      }
      pr_generate_quotations: { Args: { p_pr_no: string }; Returns: string[] }
      pr_seed_from_date: {
        Args: { p_need_date: string; p_notes?: string }
        Returns: string
      }
      price_list_latest_benchmark: {
        Args: { p_period_id: number }
        Returns: {
          commodity: Database["public"]["Enums"]["price_commodity"]
          ingredient_name: string
          latest_week_no: number
          max_per_kg: number
          median_per_kg: number
          min_per_kg: number
          supplier_cnt: number
        }[]
      }
      qc_template_for_item: {
        Args: { p_item: string }
        Returns: {
          category: Database["public"]["Enums"]["item_category"]
          checkpoint: string
          expected: string
          id: number
          is_critical: boolean
          sort_order: number
        }[]
      }
      quotation_seed_from_date: {
        Args: { p_date: string }
        Returns: {
          item_code: string
          price_suggested: number
          qty: number
          unit: string
        }[]
      }
      requirement_for_date: {
        Args: { p_date: string }
        Returns: {
          category: Database["public"]["Enums"]["item_category"]
          item_code: string
          price_idr: number
          qty: number
          unit: string
        }[]
      }
      requirement_for_date_projected: {
        Args: { p_date: string }
        Returns: {
          category: Database["public"]["Enums"]["item_category"]
          item_code: string
          qty: number
          source: string
          unit: string
        }[]
      }
      save_supplier_reval: {
        Args: {
          p_end: string
          p_notes?: string
          p_period: Database["public"]["Enums"]["reval_period"]
          p_recommendation?: string
          p_start: string
          p_supplier_id: string
        }
        Returns: number
      }
      sop_compliance_summary: {
        Args: { p_end?: string; p_start?: string }
        Returns: {
          avg_completion: number
          last_run: string
          run_count: number
          sop_category: string
          sop_id: string
          sop_title: string
          total_risks: number
        }[]
      }
      stock_shortage_for_date: {
        Args: { p_date: string }
        Returns: {
          gap: number
          item_code: string
          on_hand: number
          required: number
          unit: string
        }[]
      }
      supplier_forecast_90d: {
        Args: { p_horizon_days?: number; p_supplier_id?: string }
        Returns: {
          category: Database["public"]["Enums"]["item_category"]
          item_code: string
          item_name: string
          op_date: string
          qty: number
          source: string
          unit: string
        }[]
      }
      supplier_forecast_monthly: {
        Args: { p_months?: number; p_supplier_id?: string }
        Returns: {
          category: Database["public"]["Enums"]["item_category"]
          days_count: number
          item_code: string
          item_name: string
          month: string
          qty_total: number
          unit: string
        }[]
      }
      supplier_qc_gallery: {
        Args: { p_limit?: number; p_supplier_id: string }
        Returns: {
          captured_at: string
          item_code: string
          note: string
          photo_url: string
          ref_id: string
          result: string
          source: string
        }[]
      }
      supplier_scorecard_auto: {
        Args: { p_end: string; p_start: string; p_supplier_id: string }
        Returns: {
          actions_overdue: number
          actions_total: number
          compliance_score: number
          delivery_score: number
          grn_count: number
          ncr_critical_open: number
          price_score: number
          qc_fail: number
          qc_pass: number
          quality_score: number
          responsiveness_score: number
          total_score: number
        }[]
      }
      top_suppliers_by_spend: {
        Args: { p_end: string; p_limit?: number; p_start: string }
        Returns: {
          invoice_count: number
          supplier_id: string
          supplier_name: string
          supplier_type: Database["public"]["Enums"]["supplier_type"]
          total_spend: number
        }[]
      }
      upcoming_shortages: {
        Args: { p_horizon?: number }
        Returns: {
          op_date: string
          short_items: number
          total_gap_kg: number
        }[]
      }
      update_action_status: {
        Args: {
          p_blocked_reason?: string
          p_id: number
          p_notes?: string
          p_status: Database["public"]["Enums"]["action_status"]
        }
        Returns: {
          blocked_reason: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          done_at: string | null
          done_by: string | null
          id: number
          output_notes: string | null
          owner: string
          owner_user_id: string | null
          priority: Database["public"]["Enums"]["action_priority"]
          related_scope: string | null
          source: Database["public"]["Enums"]["action_source"]
          source_ref: string | null
          status: Database["public"]["Enums"]["action_status"]
          supplier_id: string | null
          target_date: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "supplier_actions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_supplier_price: {
        Args: {
          p_commodity: Database["public"]["Enums"]["price_commodity"]
          p_ingredient_name: string
          p_item_code?: string
          p_notes?: string
          p_price_per_item?: number
          p_price_per_kg?: number
          p_supplier_id: string
          p_unit?: string
          p_week_id: number
        }
        Returns: {
          commodity: Database["public"]["Enums"]["price_commodity"]
          created_at: string
          created_by: string | null
          id: number
          ingredient_name: string
          item_code: string | null
          notes: string | null
          price_per_item: number | null
          price_per_kg: number | null
          supplier_id: string
          unit: string | null
          updated_at: string
          week_id: number
        }
        SetofOptions: {
          from: "*"
          to: "supplier_prices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      stock_consume_fifo: {
        Args: {
          p_item_code: string
          p_qty: number
          p_ref_doc?: string
          p_ref_no?: string | null
          p_note?: string | null
        }
        Returns: {
          batch_id: number
          consumed: number
          remaining_after: number
        }[]
      }
      expiring_batches: {
        Args: { p_days?: number }
        Returns: {
          id: number
          item_code: string
          item_name: string | null
          grn_no: string | null
          supplier_id: string | null
          supplier_name: string | null
          qty_remaining: number
          unit: string
          expiry_date: string
          days_left: number
          status: string
        }[]
      }
      outstanding_by_supplier: {
        Args: never
        Returns: {
          supplier_id: string
          supplier_name: string
          invoice_count: number
          invoice_total: number
          paid_total: number
          outstanding: number
          oldest_due: string | null
        }[]
      }
      monthly_cashflow: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          period: string
          cash_in: number
          cash_out: number
          net: number
          cumulative: number
        }[]
      }
      payment_summary_by_invoice: {
        Args: { p_invoice_no: string }
        Returns: {
          invoice_no: string
          invoice_total: number
          paid: number
          outstanding: number
          payment_count: number
          last_payment_date: string | null
        }[]
      }
      delivery_generate_for_date: {
        Args: { p_date: string }
        Returns: string
      }
      daily_delivery_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          delivery_date: string
          delivery_no: string
          status: string
          stops_total: number
          stops_delivered: number
          porsi_planned: number
          porsi_delivered: number
          fulfilment_pct: number | null
        }[]
      }
      list_audit: {
        Args: {
          p_table?: string | null
          p_actor?: string | null
          p_action?: Database["public"]["Enums"]["audit_action"] | null
          p_from?: string
          p_to?: string
          p_limit?: number
        }
        Returns: Database["public"]["Tables"]["audit_events"]["Row"][]
      }
      budget_burn: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          period: string
          budget_total: number
          spent_po: number
          spent_invoice: number
          spent_paid: number
          burn_pct: number | null
          remaining: number
        }[]
      }
      cost_per_portion_daily: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          op_date: string
          total_porsi: number
          spent_po: number
          cost_per_portion: number | null
          target: number | null
        }[]
      }
      supplier_po_inbox: {
        Args: { p_limit?: number }
        Returns: {
          po_no: string
          po_date: string
          delivery_date: string | null
          total: number
          po_status: Database["public"]["Enums"]["po_status"]
          ack_decision: Database["public"]["Enums"]["po_ack_decision"]
          ack_at: string | null
          grn_status: Database["public"]["Enums"]["grn_status"] | null
          invoice_status: Database["public"]["Enums"]["invoice_status"] | null
          unread_msg: number
        }[]
      }
      supplier_payment_status: {
        Args: never
        Returns: {
          invoice_no: string
          po_no: string | null
          inv_date: string
          due_date: string | null
          total: number
          paid: number
          outstanding: number
          status: Database["public"]["Enums"]["invoice_status"]
        }[]
      }
      global_search: {
        Args: { p_query: string; p_limit?: number }
        Returns: {
          kind: string
          id: string
          title: string
          subtitle: string
          url: string
          score: number
        }[]
      }
    }
    Enums: {
      action_priority: "low" | "medium" | "high" | "critical"
      action_source: "onboarding" | "mom" | "field" | "audit" | "ad_hoc"
      action_status: "open" | "in_progress" | "blocked" | "done" | "cancelled"
      audit_action: "INSERT" | "UPDATE" | "DELETE"
      cash_source:
        | "dinas"
        | "wfp"
        | "ifsr"
        | "ffi"
        | "donor_swasta"
        | "lainnya"
      delivery_status:
        | "planned"
        | "dispatched"
        | "delivered"
        | "partial"
        | "cancelled"
      grn_status: "pending" | "ok" | "partial" | "rejected"
      invoice_status: "issued" | "paid" | "overdue" | "cancelled"
      invoice_upload_status: "pending" | "approved" | "rejected"
      payment_method:
        | "transfer"
        | "tunai"
        | "cek"
        | "giro"
        | "virtual_account"
        | "qris"
        | "lainnya"
      po_ack_decision: "accepted" | "rejected" | "partial" | "pending"
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
        | "LAIN"
      move_reason:
        | "receipt"
        | "consumption"
        | "adjustment"
        | "waste"
        | "transfer_in"
        | "transfer_out"
        | "opening"
      ncr_severity: "minor" | "major" | "critical"
      ncr_status: "open" | "in_progress" | "resolved" | "waived"
      po_status:
        | "draft"
        | "sent"
        | "confirmed"
        | "delivered"
        | "closed"
        | "cancelled"
      pr_status:
        | "draft"
        | "allocated"
        | "quotations_issued"
        | "completed"
        | "cancelled"
      price_commodity:
        | "BERAS"
        | "SAYURAN"
        | "BUAH"
        | "PROTEIN_HEWANI"
        | "PROTEIN_NABATI"
        | "BUMBU_KERING"
        | "MINYAK"
      qc_result: "pass" | "minor" | "major" | "critical" | "na"
      quotation_status:
        | "draft"
        | "sent"
        | "responded"
        | "accepted"
        | "converted"
        | "rejected"
        | "expired"
      reval_period: "quarterly" | "semester" | "annual" | "ad_hoc"
      school_level: "PAUD/TK" | "SD" | "SMP" | "SMA" | "SMK"
      supplier_status: "signed" | "awaiting" | "rejected" | "draft"
      supplier_type:
        | "BUMN"
        | "PT"
        | "CV"
        | "UD"
        | "KOPERASI"
        | "POKTAN"
        | "TOKO"
        | "KIOS"
        | "INFORMAL"
      tx_type: "po" | "grn" | "invoice" | "payment" | "adjustment" | "receipt"
      user_role: "admin" | "operator" | "ahli_gizi" | "supplier" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_priority: ["low", "medium", "high", "critical"],
      action_source: ["onboarding", "mom", "field", "audit", "ad_hoc"],
      action_status: ["open", "in_progress", "blocked", "done", "cancelled"],
      grn_status: ["pending", "ok", "partial", "rejected"],
      invoice_status: ["issued", "paid", "overdue", "cancelled"],
      item_category: [
        "BERAS",
        "HEWANI",
        "NABATI",
        "SAYUR_HIJAU",
        "SAYUR",
        "UMBI",
        "BUMBU",
        "REMPAH",
        "BUAH",
        "SEMBAKO",
        "LAIN",
      ],
      move_reason: [
        "receipt",
        "consumption",
        "adjustment",
        "waste",
        "transfer_in",
        "transfer_out",
        "opening",
      ],
      ncr_severity: ["minor", "major", "critical"],
      ncr_status: ["open", "in_progress", "resolved", "waived"],
      po_status: [
        "draft",
        "sent",
        "confirmed",
        "delivered",
        "closed",
        "cancelled",
      ],
      pr_status: [
        "draft",
        "allocated",
        "quotations_issued",
        "completed",
        "cancelled",
      ],
      price_commodity: [
        "BERAS",
        "SAYURAN",
        "BUAH",
        "PROTEIN_HEWANI",
        "PROTEIN_NABATI",
        "BUMBU_KERING",
        "MINYAK",
      ],
      qc_result: ["pass", "minor", "major", "critical", "na"],
      quotation_status: [
        "draft",
        "sent",
        "responded",
        "accepted",
        "converted",
        "rejected",
        "expired",
      ],
      reval_period: ["quarterly", "semester", "annual", "ad_hoc"],
      school_level: ["PAUD/TK", "SD", "SMP", "SMA", "SMK"],
      supplier_status: ["signed", "awaiting", "rejected", "draft"],
      supplier_type: [
        "BUMN",
        "PT",
        "CV",
        "UD",
        "KOPERASI",
        "POKTAN",
        "TOKO",
        "KIOS",
        "INFORMAL",
      ],
      tx_type: ["po", "grn", "invoice", "payment", "adjustment", "receipt"],
      user_role: ["admin", "operator", "ahli_gizi", "supplier", "viewer"],
    },
  },
} as const
