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
      audit_log: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          agent_id: string
          call_id: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          scheduled_at: string
          showing_address: string
          status: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
        }
        Insert: {
          agent_id: string
          call_id?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          id?: string
          scheduled_at: string
          showing_address: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
        }
        Update: {
          agent_id?: string
          call_id?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          scheduled_at?: string
          showing_address?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
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
          idempotency_key: string | null
          input: Json | null
          output: Json | null
          status: string | null
          tool_name: string
        }
        Insert: {
          call_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          idempotency_key?: string | null
          input?: Json | null
          output?: Json | null
          status?: string | null
          tool_name: string
        }
        Update: {
          call_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          idempotency_key?: string | null
          input?: Json | null
          output?: Json | null
          status?: string | null
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
          consent_given: boolean
          consent_state: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          outcome: Database["public"]["Enums"]["call_outcome"] | null
          recording_expires_at: string | null
          recording_url: string | null
          started_at: string
          status: Database["public"]["Enums"]["call_status"]
          summary: string | null
          tenant_id: string
          transcript: string | null
          twilio_call_sid: string | null
          vapi_call_id: string | null
        }
        Insert: {
          agent_id: string
          caller_number?: string | null
          consent_given?: boolean
          consent_state?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          recording_expires_at?: string | null
          recording_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
          summary?: string | null
          tenant_id: string
          transcript?: string | null
          twilio_call_sid?: string | null
          vapi_call_id?: string | null
        }
        Update: {
          agent_id?: string
          caller_number?: string | null
          consent_given?: boolean
          consent_state?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          recording_expires_at?: string | null
          recording_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
          summary?: string | null
          tenant_id?: string
          transcript?: string | null
          twilio_call_sid?: string | null
          vapi_call_id?: string | null
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
          market_id: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["integration_type"]
        }
        Insert: {
          config?: Json | null
          credentials?: Json | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          market_id?: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["integration_type"]
        }
        Update: {
          config?: Json | null
          credentials?: Json | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          market_id?: string | null
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
      leads: {
        Row: {
          agent_id: string | null
          area_of_interest: string | null
          baths: number | null
          beds: number | null
          budget_max: number | null
          budget_min: number | null
          call_id: string | null
          created_at: string
          crm_external_id: string | null
          crm_sync_state: Database["public"]["Enums"]["crm_sync_state"]
          email: string | null
          financing_status: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tenant_id: string
          timeline: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          area_of_interest?: string | null
          baths?: number | null
          beds?: number | null
          budget_max?: number | null
          budget_min?: number | null
          call_id?: string | null
          created_at?: string
          crm_external_id?: string | null
          crm_sync_state?: Database["public"]["Enums"]["crm_sync_state"]
          email?: string | null
          financing_status?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id: string
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          area_of_interest?: string | null
          baths?: number | null
          beds?: number | null
          budget_max?: number | null
          budget_min?: number | null
          call_id?: string | null
          created_at?: string
          crm_external_id?: string | null
          crm_sync_state?: Database["public"]["Enums"]["crm_sync_state"]
          email?: string | null
          financing_status?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id?: string
          timeline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string
          bathrooms: number | null
          bedrooms: number | null
          id: string
          integration_id: string
          mls_id: string
          originating_system_name: string
          price: number | null
          raw_data: Json | null
          sqft: number | null
          status: string
          synced_at: string
          tenant_id: string
        }
        Insert: {
          address: string
          bathrooms?: number | null
          bedrooms?: number | null
          id?: string
          integration_id: string
          mls_id: string
          originating_system_name?: string
          price?: number | null
          raw_data?: Json | null
          sqft?: number | null
          status?: string
          synced_at?: string
          tenant_id: string
        }
        Update: {
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          id?: string
          integration_id?: string
          mls_id?: string
          originating_system_name?: string
          price?: number | null
          raw_data?: Json | null
          sqft?: number | null
          status?: string
          synced_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          daily_digest_email: boolean
          id: string
          missed_call_email: boolean
          tenant_id: string
          updated_at: string
          user_id: string
          weekly_report_email: boolean
        }
        Insert: {
          daily_digest_email?: boolean
          id?: string
          missed_call_email?: boolean
          tenant_id: string
          updated_at?: string
          user_id: string
          weekly_report_email?: boolean
        }
        Update: {
          daily_digest_email?: boolean
          id?: string
          missed_call_email?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
          weekly_report_email?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_steps: {
        Row: {
          completed_at: string
          id: string
          step: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          step: string
          tenant_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          step?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_tenant_id_fkey"
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
          created_at: string
          id: string
          is_active: boolean
          number: string
          tenant_id: string
          twilio_sid: string | null
          vapi_phone_id: string | null
          vapi_sync_error: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          number: string
          tenant_id: string
          twilio_sid?: string | null
          vapi_phone_id?: string | null
          vapi_sync_error?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          number?: string
          tenant_id?: string
          twilio_sid?: string | null
          vapi_phone_id?: string | null
          vapi_sync_error?: string | null
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
      sms_outbox: {
        Row: {
          body: string
          call_id: string | null
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          sent_at: string | null
          sms_type: string
          status: string
          tenant_id: string
          to_phone: string
          twilio_sid: string | null
        }
        Insert: {
          body: string
          call_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          sent_at?: string | null
          sms_type: string
          status?: string
          tenant_id: string
          to_phone: string
          twilio_sid?: string | null
        }
        Update: {
          body?: string
          call_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          sent_at?: string | null
          sms_type?: string
          status?: string
          tenant_id?: string
          to_phone?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_outbox_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_outbox_tenant_id_fkey"
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
          parent_tenant_id: string | null
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
          parent_tenant_id?: string | null
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
          parent_tenant_id?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      waitlist_entries: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          source?: string
        }
        Relationships: []
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          integration_type: string
          payload: Json
          status: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          integration_type: string
          payload?: Json
          status?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          integration_type?: string
          payload?: Json
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_tenant_id_fkey"
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
      bootstrap_new_tenant: {
        Args: {
          p_user_id: string
          p_email: string
          p_full_name: string
          p_tenant_name: string
          p_subdomain: string
        }
        Returns: Json
      }
      get_recording_retention_days: {
        Args: {
          p_plan: string
        }
        Returns: number
      }
      increment_usage: {
        Args: {
          p_tenant_id: string
          p_period_start: string
          p_period_end: string
          p_minutes: number
        }
        Returns: undefined
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      call_outcome:
        | "scheduled"
        | "callback_requested"
        | "unqualified"
        | "info_only"
      call_status: "completed" | "missed" | "failed" | "in_progress"
      crm_sync_state: "pending" | "synced" | "failed" | "skipped"
      integration_type:
        | "google_calendar"
        | "mls_idx"
        | "crm"
        | "calendly"
        | "outlook"
        | "acuity"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "nurturing"
        | "converted"
        | "lost"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
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

