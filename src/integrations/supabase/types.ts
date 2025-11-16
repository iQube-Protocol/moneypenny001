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
      bank_statements: {
        Row: {
          closing_balance: number | null
          created_at: string | null
          file_name: string
          file_path: string
          id: string
          parsed_at: string | null
          period_end: string | null
          period_start: string | null
          user_id: string
        }
        Insert: {
          closing_balance?: number | null
          created_at?: string | null
          file_name: string
          file_path: string
          id?: string
          parsed_at?: string | null
          period_end?: string | null
          period_start?: string | null
          user_id: string
        }
        Update: {
          closing_balance?: number | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          parsed_at?: string | null
          period_end?: string | null
          period_start?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cache_store: {
        Row: {
          created_at: string | null
          expires_at: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      financial_aggregates: {
        Row: {
          avg_daily_surplus: number | null
          cash_buffer_days: number | null
          closing_balance: number | null
          computed_at: string | null
          confidence_score: number | null
          id: string
          surplus_volatility: number | null
          top_categories: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_daily_surplus?: number | null
          cash_buffer_days?: number | null
          closing_balance?: number | null
          computed_at?: string | null
          confidence_score?: number | null
          id?: string
          surplus_volatility?: number | null
          top_categories?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_daily_surplus?: number | null
          cash_buffer_days?: number | null
          closing_balance?: number | null
          computed_at?: string | null
          confidence_score?: number | null
          id?: string
          surplus_volatility?: number | null
          top_categories?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trading_executions: {
        Row: {
          avg_price: number
          capture_bps: number
          chain: string
          dex: string | null
          execution_id: string
          gas_used: number | null
          intent_id: string
          qty_filled: number
          side: string
          status: string
          timestamp: string
          tx_hash: string | null
          user_id: string | null
        }
        Insert: {
          avg_price: number
          capture_bps: number
          chain: string
          dex?: string | null
          execution_id?: string
          gas_used?: number | null
          intent_id: string
          qty_filled: number
          side: string
          status?: string
          timestamp?: string
          tx_hash?: string | null
          user_id?: string | null
        }
        Update: {
          avg_price?: number
          capture_bps?: number
          chain?: string
          dex?: string | null
          execution_id?: string
          gas_used?: number | null
          intent_id?: string
          qty_filled?: number
          side?: string
          status?: string
          timestamp?: string
          tx_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_executions_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "trading_intents"
            referencedColumns: ["intent_id"]
          },
        ]
      }
      trading_intents: {
        Row: {
          amount_qc: number
          chain: string
          created_at: string
          expires_at: string
          intent_id: string
          limit_price: number | null
          max_slippage_bps: number
          min_edge_bps: number
          order_type: string
          side: string
          status: string
          stop_loss: number | null
          take_profit: number | null
          time_in_force: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_qc: number
          chain: string
          created_at?: string
          expires_at?: string
          intent_id?: string
          limit_price?: number | null
          max_slippage_bps: number
          min_edge_bps: number
          order_type?: string
          side: string
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          time_in_force?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_qc?: number
          chain?: string
          created_at?: string
          expires_at?: string
          intent_id?: string
          limit_price?: number | null
          max_slippage_bps?: number
          min_edge_bps?: number
          order_type?: string
          side?: string
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          time_in_force?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trading_recommendations: {
        Row: {
          created_at: string | null
          daily_loss_limit_bps: number
          id: string
          inventory_max: number
          inventory_min: number
          max_notional_usd: number
          min_edge_bps: number
          reasoning: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_loss_limit_bps: number
          id?: string
          inventory_max: number
          inventory_min: number
          max_notional_usd: number
          min_edge_bps: number
          reasoning?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_loss_limit_bps?: number
          id?: string
          inventory_max?: number
          inventory_min?: number
          max_notional_usd?: number
          min_edge_bps?: number
          reasoning?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          statement_id: string
          transaction_date: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          statement_id: string
          transaction_date: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          statement_id?: string
          transaction_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
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
