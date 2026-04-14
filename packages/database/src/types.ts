export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_templates: {
        Row: {
          created_at: string
          default_tools: Json
          default_voice: Json
          description: string
          editable_fields_schema: Json
          id: string
          is_active: boolean
          locked_prompt_core: string
          name: string
          updated_at: string
          version: number
          vertical: string
        }
        Insert: {
          created_at?: string
          default_tools?: Json
          default_voice?: Json
          description: string
          editable_fields_schema?: Json
          id?: string
          is_active?: boolean
          locked_prompt_core: string
          name: string
          updated_at?: string
          version?: number
          vertical: string
        }
        Update: {
          created_at?: string
          default_tools?: Json
          default_voice?: Json
          description?: string
          editable_fields_schema?: Json
          id?: string
          is_active?: boolean
          locked_prompt_core?: string
          name?: string
          updated_at?: string
          version?: number
          vertical?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          llm_model: string | null
          name: string
          system_prompt: string | null
          tenant_id: string
          voice_id: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          llm_model?: string | null
          name: string
          system_prompt?: string | null
          tenant_id: string
          voice_id?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          llm_model?: string | null
          name?: string
          system_prompt?: string | null
          tenant_id?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      call_tool_events: {
        Row: {
          call_id: string
          created_at: string
          duration_ms: number | null
          id: string
          input: Json | null
          output: Json | null
          tool_name: string
        }
        Insert: {
          call_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          input?: Json | null
          output?: Json | null
          tool_name: string
        }
        Update: {
          call_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          input?: Json | null
          output?: Json | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_tool_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_id: string
          caller_number: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          outcome: Database["public"]["Enums"]["call_outcome"] | null
          recording_url: string | null
          started_at: string
          status: Database["public"]["Enums"]["call_status"]
          summary: string | null
          tenant_id: string
          transcript: string | null
        }
        Insert: {
          agent_id: string
          caller_number?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          recording_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
          summary?: string | null
          tenant_id: string
          transcript?: string | null
        }
        Update: {
          agent_id?: string
          caller_number?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          recording_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
          summary?: string | null
          tenant_id?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json | null
          credentials: Json | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["integration_type"]
        }
        Insert: {
          config?: Json | null
          credentials?: Json | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["integration_type"]
        }
        Update: {
          config?: Json | null
          credentials?: Json | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["integration_type"]
        }
        Relationships: [
          {
            foreignKeyName: "integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          agent_id: string
          id: string
          is_active: boolean
          number: string
          tenant_id: string
          twilio_sid: string | null
        }
        Insert: {
          agent_id: string
          id?: string
          is_active?: boolean
          number: string
          tenant_id: string
          twilio_sid?: string | null
        }
        Update: {
          agent_id?: string
          id?: string
          is_active?: boolean
          number?: string
          tenant_id?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_numbers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding: Json | null
          created_at: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subdomain: string
        }
        Insert: {
          branding?: Json | null
          created_at?: string
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain: string
        }
        Update: {
          branding?: Json | null
          created_at?: string
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string
        }
        Relationships: []
      }
      usage_records: {
        Row: {
          id: string
          minutes_included: number
          minutes_used: number
          overage_minutes: number
          period_end: string
          period_start: string
          stripe_usage_record_id: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          minutes_included?: number
          minutes_used?: number
          overage_minutes?: number
          period_end: string
          period_start: string
          stripe_usage_record_id?: string | null
          tenant_id: string
        }
        Update: {
          id?: string
          minutes_included?: number
          minutes_used?: number
          overage_minutes?: number
          period_end?: string
          period_start?: string
          stripe_usage_record_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      call_outcome:
        | "scheduled"
        | "callback_requested"
        | "unqualified"
        | "info_only"
      call_status: "completed" | "missed" | "failed"
      integration_type:
        | "google_calendar"
        | "mls_idx"
        | "crm"
        | "calendly"
        | "outlook"
        | "acuity"
      plan_tier: "starter" | "professional" | "growth" | "agency"
      user_role: "super_admin" | "client_admin" | "team_member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

