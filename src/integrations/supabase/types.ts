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
      avatar_voice_mapping: {
        Row: {
          avatar_id: string
          created_at: string | null
          elevenlabs_voice_id: string
          id: string
          is_default: boolean | null
          voice_name: string
        }
        Insert: {
          avatar_id: string
          created_at?: string | null
          elevenlabs_voice_id: string
          id?: string
          is_default?: boolean | null
          voice_name: string
        }
        Update: {
          avatar_id?: string
          created_at?: string | null
          elevenlabs_voice_id?: string
          id?: string
          is_default?: boolean | null
          voice_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "avatar_voice_mapping_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
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
      preferences: {
        Row: {
          avatar_id: string | null
          avatar_sectors: string[] | null
          business_model: Database["public"]["Enums"]["business_model"]
          created_at: string
          currency: string
          goal_value: number | null
          kpi_pack_json: Json | null
          lang: string
          north_star: string | null
          send_dow: number
          send_hour: number
          thresholds_json: Json | null
          timezone: string
          tone: Database["public"]["Enums"]["tone_type"]
          updated_at: string
          user_id: string
          voice_id: string | null
        }
        Insert: {
          avatar_id?: string | null
          avatar_sectors?: string[] | null
          business_model?: Database["public"]["Enums"]["business_model"]
          created_at?: string
          currency?: string
          goal_value?: number | null
          kpi_pack_json?: Json | null
          lang?: string
          north_star?: string | null
          send_dow?: number
          send_hour?: number
          thresholds_json?: Json | null
          timezone?: string
          tone?: Database["public"]["Enums"]["tone_type"]
          updated_at?: string
          user_id: string
          voice_id?: string | null
        }
        Update: {
          avatar_id?: string | null
          avatar_sectors?: string[] | null
          business_model?: Database["public"]["Enums"]["business_model"]
          created_at?: string
          currency?: string
          goal_value?: number | null
          kpi_pack_json?: Json | null
          lang?: string
          north_star?: string | null
          send_dow?: number
          send_hour?: number
          thresholds_json?: Json | null
          timezone?: string
          tone?: Database["public"]["Enums"]["tone_type"]
          updated_at?: string
          user_id?: string
          voice_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
      business_model: ["saas", "ecommerce", "services", "other"],
      email_status: ["pending", "sent", "failed"],
      tone_type: ["sobre", "coach", "energique", "no-bs"],
    },
  },
} as const
