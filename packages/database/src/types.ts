// AUTO-GENERATED: Run `pnpm db:types` to regenerate from Supabase schema
// This file is a placeholder until you connect a Supabase project

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
      tenants: {
        Row: {
          id: string;
          name: string;
          subdomain: string;
          plan: 'starter' | 'professional' | 'growth' | 'agency';
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          branding: Json | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          role: 'super_admin' | 'client_admin' | 'team_member';
          full_name: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
        Relationships: [];
      };
      agents: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          voice_id: string | null;
          system_prompt: string | null;
          llm_model: 'gpt-4o' | 'claude-3-5-sonnet' | null;
          is_active: boolean;
          config: Json | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
        Relationships: [];
      };
      phone_numbers: {
        Row: {
          id: string;
          agent_id: string;
          tenant_id: string;
          number: string;
          twilio_sid: string | null;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['phone_numbers']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['phone_numbers']['Insert']>;
        Relationships: [];
      };
      calls: {
        Row: {
          id: string;
          agent_id: string;
          tenant_id: string;
          caller_number: string | null;
          duration_seconds: number | null;
          status: 'completed' | 'missed' | 'failed';
          outcome: 'scheduled' | 'callback_requested' | 'unqualified' | 'info_only' | null;
          recording_url: string | null;
          transcript: string | null;
          summary: string | null;
          started_at: string;
          ended_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['calls']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['calls']['Insert']>;
        Relationships: [];
      };
      call_tool_events: {
        Row: {
          id: string;
          call_id: string;
          tool_name: string;
          input: Json | null;
          output: Json | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['call_tool_events']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['call_tool_events']['Insert']>;
        Relationships: [];
      };
      integrations: {
        Row: {
          id: string;
          tenant_id: string;
          type: 'google_calendar' | 'mls_idx' | 'crm' | 'calendly' | 'outlook' | 'acuity';
          credentials: Json | null;
          config: Json | null;
          is_active: boolean;
          last_synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['integrations']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['integrations']['Insert']>;
        Relationships: [];
      };
      usage_records: {
        Row: {
          id: string;
          tenant_id: string;
          period_start: string;
          period_end: string;
          minutes_used: number;
          minutes_included: number;
          overage_minutes: number;
          stripe_usage_record_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['usage_records']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['usage_records']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      plan_tier: 'starter' | 'professional' | 'growth' | 'agency';
      user_role: 'super_admin' | 'client_admin' | 'team_member';
      call_status: 'completed' | 'missed' | 'failed';
      call_outcome: 'scheduled' | 'callback_requested' | 'unqualified' | 'info_only';
      integration_type: 'google_calendar' | 'mls_idx' | 'crm' | 'calendly' | 'outlook' | 'acuity';
    };
  };
}
