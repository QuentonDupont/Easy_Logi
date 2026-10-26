/**
 * MINIMAL hand-written Supabase types, covering the tables the Phase 0 console touches.
 * Replace the whole file with the generated output once the schema is applied:
 *
 *   supabase gen types typescript --local > packages/shared/src/database.types.ts
 *
 * Keep the generated version in sync with db/migrations. Do not hand-edit after generating.
 */

export type OrderStatusEnum =
  | "requested"
  | "fitment_in_progress"
  | "matched"
  | "rfq_sent"
  | "quoted"
  | "po_issued"
  | "deposit_paid"
  | "in_production"
  | "qc_pending"
  | "qc_passed"
  | "balance_paid"
  | "at_consolidation"
  | "in_transit"
  | "at_port_durban"
  | "at_port_maputo"
  | "in_transit_road"
  | "customs_clearance"
  | "cleared"
  | "delivered"
  | "fit_confirmed"
  | "closed"
  | "on_hold"
  | "disputed"
  | "cancelled";

export type UserRoleEnum = "ops_admin" | "importer_admin" | "importer_member" | "buyer";
export type CountryEnum = "SZ" | "ZA";
/** A business (importer / workshop / fleet) or an individual buying for themselves. */
export type AccountTypeEnum = "business" | "individual";

type Timestamps = { created_at: string; updated_at: string };

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: { id: string; name: string; country: CountryEnum; account_type: AccountTypeEnum } & Timestamps;
        Insert: {
          id?: string;
          name: string;
          country: CountryEnum;
          account_type?: AccountTypeEnum;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organisations"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          full_name: string | null;
          role: UserRoleEnum;
        } & Timestamps;
        Insert: {
          id: string;
          org_id: string;
          email: string;
          full_name?: string | null;
          role?: UserRoleEnum;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      buyers: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          phone: string | null;
          whatsapp: string | null;
          country: CountryEnum;
        } & Timestamps;
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          phone?: string | null;
          whatsapp?: string | null;
          country: CountryEnum;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["buyers"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          org_id: string;
          buyer_id: string | null;
          request_id: string | null;
          reference: string;
          status: OrderStatusEnum;
          summary: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          org_id: string;
          buyer_id?: string | null;
          request_id?: string | null;
          reference: string;
          status?: OrderStatusEnum;
          summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_status_changes: {
        Row: {
          id: string;
          org_id: string;
          order_id: string;
          from_status: OrderStatusEnum;
          to_status: OrderStatusEnum;
          role: UserRoleEnum | null;
          actor_user_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          order_id: string;
          from_status: OrderStatusEnum;
          to_status: OrderStatusEnum;
          role?: UserRoleEnum | null;
          actor_user_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_status_changes"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          order_id: string | null;
          payload: Record<string, unknown>;
          dedupe_key: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          order_id?: string | null;
          payload?: Record<string, unknown>;
          dedupe_key?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_org_id: { Args: Record<string, never>; Returns: string };
      is_ops_admin: { Args: Record<string, never>; Returns: boolean };
      // pgmq public wrappers (migration 20261011090007); callable only by service_role.
      queue_send: { Args: { queue_name: string; msg: Record<string, unknown> }; Returns: number };
      queue_read: {
        Args: { queue_name: string; vt: number; qty: number };
        Returns: { msg_id: number; read_ct: number; message: Record<string, unknown> }[];
      };
      queue_delete: { Args: { queue_name: string; msg_id: number }; Returns: boolean };
      queue_archive: { Args: { queue_name: string; msg_id: number }; Returns: boolean };
      // The only path allowed to change orders.status (migrations 20261011090008, 20261026090002).
      // service_role only — call it through lib/supabase/admin.ts after the status machine + gate.
      change_order_status: {
        Args: {
          p_order_id: string;
          p_to: OrderStatusEnum;
          p_role: UserRoleEnum;
          p_note: string | null;
          p_actor?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      order_status: OrderStatusEnum;
      user_role: UserRoleEnum;
      country: CountryEnum;
    };
    CompositeTypes: Record<string, never>;
  };
}
