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
      exchange_credentials: {
        Row: {
          api_key: string
          api_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          last_validated_at: string | null
          provider: string
          scope: string
          secret_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_validated_at?: string | null
          provider: string
          scope?: string
          secret_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          api_key?: string
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_validated_at?: string | null
          provider?: string
          scope?: string
          secret_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_state: {
        Row: {
          state: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          state?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          state?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_risk_locks: {
        Row: {
          captured_at: string
          closed_at: string | null
          created_at: string
          entry_price: number
          exchange_order_id: string | null
          id: string
          side: string
          size: number
          stop_loss: number
          symbol: string
          trade_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          captured_at?: string
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          exchange_order_id?: string | null
          id?: string
          side: string
          size?: number
          stop_loss?: number
          symbol: string
          trade_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          captured_at?: string
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          exchange_order_id?: string | null
          id?: string
          side?: string
          size?: number
          stop_loss?: number
          symbol?: string
          trade_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      open_positions: {
        Row: {
          entry_price: number
          id: string
          provider: string
          side: string
          size: number
          symbol: string
          unrealized_pnl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          entry_price?: number
          id?: string
          provider?: string
          side: string
          size?: number
          symbol: string
          unrealized_pnl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          entry_price?: number
          id?: string
          provider?: string
          side?: string
          size?: number
          symbol?: string
          unrealized_pnl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          created_at: string
          data: Json
          exchange_exec_id: string | null
          id: string
          manual_r_multiple: number | null
          trade_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          exchange_exec_id?: string | null
          id?: string
          manual_r_multiple?: number | null
          trade_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          exchange_exec_id?: string | null
          id?: string
          manual_r_multiple?: number | null
          trade_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          daily_risk_limit: number
          legal_accepted: boolean
          legal_accepted_at: string | null
          monthly_risk_limit: number
          risk_per_trade_default: number
          theme: string
          updated_at: string
          user_id: string
          weekly_risk_limit: number
        }
        Insert: {
          created_at?: string
          daily_risk_limit?: number
          legal_accepted?: boolean
          legal_accepted_at?: string | null
          monthly_risk_limit?: number
          risk_per_trade_default?: number
          theme?: string
          updated_at?: string
          user_id: string
          weekly_risk_limit?: number
        }
        Update: {
          created_at?: string
          daily_risk_limit?: number
          legal_accepted?: boolean
          legal_accepted_at?: string | null
          monthly_risk_limit?: number
          risk_per_trade_default?: number
          theme?: string
          updated_at?: string
          user_id?: string
          weekly_risk_limit?: number
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          key: string
          updated_at: string
          user_id: string
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string
          user_id: string
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      read_exchange_secret: {
        Args: { p_cred_id: string; p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
