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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          changes: Json | null
          created_at: string | null
          id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      airtable_views: {
        Row: {
          base_id: string
          base_name: string
          created_at: string
          enabled: boolean
          id: string
          schema_json: Json | null
          table_id: string
          table_name: string
          updated_at: string
          user_id: string
          view_id: string
          view_name: string
        }
        Insert: {
          base_id: string
          base_name: string
          created_at?: string
          enabled?: boolean
          id?: string
          schema_json?: Json | null
          table_id: string
          table_name: string
          updated_at?: string
          user_id: string
          view_id: string
          view_name: string
        }
        Update: {
          base_id?: string
          base_name?: string
          created_at?: string
          enabled?: boolean
          id?: string
          schema_json?: Json | null
          table_id?: string
          table_name?: string
          updated_at?: string
          user_id?: string
          view_id?: string
          view_name?: string
        }
        Relationships: []
      }
      avatars: {
        Row: {
          best_for: string[]
          created_at: string
          default_tone: string
          example_actions: string[]
          id: string
          image_prompt: string
          image_url: string | null
          long_pitch: string
          name: string
          pitch: string
          role: string
          skills: string[]
          voice_reco: string
        }
        Insert: {
          best_for: string[]
          created_at?: string
          default_tone: string
          example_actions: string[]
          id: string
          image_prompt: string
          image_url?: string | null
          long_pitch: string
          name: string
          pitch: string
          role: string
          skills: string[]
          voice_reco: string
        }
        Update: {
          best_for?: string[]
          created_at?: string
          default_tone?: string
          example_actions?: string[]
          id?: string
          image_prompt?: string
          image_url?: string | null
          long_pitch?: string
          name?: string
          pitch?: string
          role?: string
          skills?: string[]
          voice_reco?: string
        }
        Relationships: []
      }
      brief_generation_logs: {
        Row: {
          brief_id: string | null
          created_at: string | null
          deepseek_cost: number
          deepseek_response_full: string
          deepseek_tokens_input: number
          deepseek_tokens_output: number
          generation_duration_ms: number | null
          id: string
          prompt_text_used: string
          prompt_version_id: string | null
          user_id: string
        }
        Insert: {
          brief_id?: string | null
          created_at?: string | null
          deepseek_cost: number
          deepseek_response_full: string
          deepseek_tokens_input: number
          deepseek_tokens_output: number
          generation_duration_ms?: number | null
          id?: string
          prompt_text_used: string
          prompt_version_id?: string | null
          user_id: string
        }
        Update: {
          brief_id?: string | null
          created_at?: string | null
          deepseek_cost?: number
          deepseek_response_full?: string
          deepseek_tokens_input?: number
          deepseek_tokens_output?: number
          generation_duration_ms?: number | null
          id?: string
          prompt_text_used?: string
          prompt_version_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_generation_logs_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          actions_json: Json | null
          audio_url: string | null
          created_at: string
          email_status: Database["public"]["Enums"]["email_status"]
          facts_json: Json | null
          id: string
          script_text: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          actions_json?: Json | null
          audio_url?: string | null
          created_at?: string
          email_status?: Database["public"]["Enums"]["email_status"]
          facts_json?: Json | null
          id?: string
          script_text?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          actions_json?: Json | null
          audio_url?: string | null
          created_at?: string
          email_status?: Database["public"]["Enums"]["email_status"]
          facts_json?: Json | null
          id?: string
          script_text?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      connections_airtable: {
        Row: {
          access_token_encrypted: string
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token_encrypted: string | null
          scopes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token_encrypted?: string | null
          scopes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token_encrypted?: string | null
          scopes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connections_shopify: {
        Row: {
          access_token_encrypted: string
          created_at: string
          id: string
          scopes: string | null
          shop_domain: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          id?: string
          scopes?: string | null
          shop_domain: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          id?: string
          scopes?: string | null
          shop_domain?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      edge_function_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          duration_ms: number | null
          event_type: string
          function_name: string
          id: string
          log_level: string
          message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          event_type: string
          function_name: string
          id?: string
          log_level?: string
          message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          event_type?: string
          function_name?: string
          id?: string
          log_level?: string
          message?: string
          user_id?: string | null
        }
        Relationships: []
      }
      elevenlabs_voices: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          gender: string | null
          id: string
          labels: Json | null
          language: string | null
          name: string
          preview_url: string | null
          updated_at: string | null
          voice_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id: string
          labels?: Json | null
          language?: string | null
          name: string
          preview_url?: string | null
          updated_at?: string | null
          voice_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          labels?: Json | null
          language?: string | null
          name?: string
          preview_url?: string | null
          updated_at?: string | null
          voice_id?: string
        }
        Relationships: []
      }
      onboarding: {
        Row: {
          created_at: string
          final_context: Json | null
          id: string
          infer_json: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          final_context?: Json | null
          id?: string
          infer_json?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          final_context?: Json | null
          id?: string
          infer_json?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      preferences: {
        Row: {
          avatar_id: string | null
          avatar_sectors: string[] | null
          business_model: Database["public"]["Enums"]["business_model"]
          created_at: string
          currency: string
          first_name: string | null
          goal_value: number | null
          kpi_pack_json: Json | null
          lang: string
          north_star: string | null
          phone_number: string | null
          phone_verified: boolean | null
          send_dow: number
          send_hour: number
          thresholds_json: Json | null
          timezone: string
          tone: Database["public"]["Enums"]["tone_type"]
          updated_at: string
          user_id: string
          voice_id: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          avatar_id?: string | null
          avatar_sectors?: string[] | null
          business_model?: Database["public"]["Enums"]["business_model"]
          created_at?: string
          currency?: string
          first_name?: string | null
          goal_value?: number | null
          kpi_pack_json?: Json | null
          lang?: string
          north_star?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          send_dow?: number
          send_hour?: number
          thresholds_json?: Json | null
          timezone?: string
          tone?: Database["public"]["Enums"]["tone_type"]
          updated_at?: string
          user_id: string
          voice_id?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          avatar_id?: string | null
          avatar_sectors?: string[] | null
          business_model?: Database["public"]["Enums"]["business_model"]
          created_at?: string
          currency?: string
          first_name?: string | null
          goal_value?: number | null
          kpi_pack_json?: Json | null
          lang?: string
          north_star?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          send_dow?: number
          send_hour?: number
          thresholds_json?: Json | null
          timezone?: string
          tone?: Database["public"]["Enums"]["tone_type"]
          updated_at?: string
          user_id?: string
          voice_id?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preferences_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_briefs: {
        Row: {
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          delivery_method: string
          hour: number
          id: string
          is_active: boolean
          last_sent_at: string | null
          minute: number
          next_send_at: string | null
          phone_number: string | null
          schedule_type: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          delivery_method?: string
          hour?: number
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          minute?: number
          next_send_at?: string | null
          phone_number?: string | null
          schedule_type?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          delivery_method?: string
          hour?: number
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          minute?: number
          next_send_at?: string | null
          phone_number?: string | null
          schedule_type?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shopify_kpis: {
        Row: {
          created_at: string
          id: string
          kpis_json: Json
          shop_domain: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpis_json: Json
          shop_domain: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          kpis_json?: Json
          shop_domain?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      system_prompts: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          prompt_text: string
          updated_at: string | null
          variables: Json | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          prompt_text: string
          updated_at?: string | null
          variables?: Json | null
          version: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          prompt_text?: string
          updated_at?: string | null
          variables?: Json | null
          version?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_deliveries: {
        Row: {
          brief_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          phone_number: string
          read_at: string | null
          retry_count: number
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brief_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          phone_number: string
          read_at?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brief_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          phone_number?: string
          read_at?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_deliveries_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_next_send_at: {
        Args: {
          day_of_month: number
          day_of_week: number
          from_timestamp?: string
          hour: number
          minute: number
          schedule_type: string
          timezone: string
        }
        Returns: string
      }
      delete_old_edge_function_logs: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      business_model: "saas" | "ecommerce" | "services" | "other"
      email_status: "pending" | "sent" | "failed"
      tone_type: "sobre" | "coach" | "energique" | "no-bs"
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
      app_role: ["admin", "user"],
      business_model: ["saas", "ecommerce", "services", "other"],
      email_status: ["pending", "sent", "failed"],
      tone_type: ["sobre", "coach", "energique", "no-bs"],
    },
  },
} as const
