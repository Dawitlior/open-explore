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
      ai_runs: {
        Row: {
          completion_tokens: number
          cost_usd: number
          created_at: string
          feature: string
          id: number
          latency_ms: number | null
          model: string | null
          prompt_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          feature: string
          id?: never
          latency_ms?: number | null
          model?: string | null
          prompt_tokens?: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          feature?: string
          id?: never
          latency_ms?: number | null
          model?: string | null
          prompt_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          invoice_url: string | null
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          invoice_url?: string | null
          payload: Json
          processed_at?: string | null
          provider: string
          received_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          invoice_url?: string | null
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bug_attachments: {
        Row: {
          bug_id: string
          created_at: string
          height: number | null
          id: string
          kind: string
          storage_path: string
          user_id: string
          width: number | null
        }
        Insert: {
          bug_id: string
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          storage_path: string
          user_id: string
          width?: number | null
        }
        Update: {
          bug_id?: string
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          storage_path?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_attachments_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_comments: {
        Row: {
          body: string
          bug_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          bug_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          bug_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_comments_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reporters: {
        Row: {
          bug_id: string
          created_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          bug_id: string
          created_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          bug_id?: string
          created_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_reporters_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          bug_type: string
          created_at: string
          created_by: string
          dedup_key: string | null
          description: string
          diagnostics: Json | null
          element_label: string | null
          element_rect: Json | null
          element_selector: string | null
          id: string
          route: string | null
          section: string
          severity: string
          status: string
          title: string | null
          updated_at: string
          viewport: Json | null
        }
        Insert: {
          bug_type?: string
          created_at?: string
          created_by: string
          dedup_key?: string | null
          description: string
          diagnostics?: Json | null
          element_label?: string | null
          element_rect?: Json | null
          element_selector?: string | null
          id?: string
          route?: string | null
          section?: string
          severity?: string
          status?: string
          title?: string | null
          updated_at?: string
          viewport?: Json | null
        }
        Update: {
          bug_type?: string
          created_at?: string
          created_by?: string
          dedup_key?: string | null
          description?: string
          diagnostics?: Json | null
          element_label?: string | null
          element_rect?: Json | null
          element_selector?: string | null
          id?: string
          route?: string | null
          section?: string
          severity?: string
          status?: string
          title?: string | null
          updated_at?: string
          viewport?: Json | null
        }
        Relationships: []
      }
      bug_resolution_feedback: {
        Row: {
          bug_id: string
          created_at: string
          note: string | null
          updated_at: string
          user_id: string
          verdict: string
        }
        Insert: {
          bug_id: string
          created_at?: string
          note?: string | null
          updated_at?: string
          user_id: string
          verdict: string
        }
        Update: {
          bug_id?: string
          created_at?: string
          note?: string | null
          updated_at?: string
          user_id?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_resolution_feedback_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      client_errors: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          message: string
          occurrences: number
          route: string | null
          stack_hash: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          message: string
          occurrences?: number
          route?: string | null
          stack_hash: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          message?: string
          occurrences?: number
          route?: string | null
          stack_hash?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      consent_log: {
        Row: {
          choices: Json
          created_at: string
          id: string
          ip_hash: string | null
          user_agent: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          choices: Json
          created_at?: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id?: string | null
          version: string
        }
        Update: {
          choices?: Json
          created_at?: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      day_notes: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string
          portfolio_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          note?: string
          portfolio_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string
          portfolio_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_notes_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_events: {
        Row: {
          actual: string | null
          category: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          event_name: string
          external_id: string
          forecast: string | null
          id: string
          impact: string
          previous: string | null
          provider: string
          release_at: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          actual?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          event_name: string
          external_id: string
          forecast?: string | null
          id?: string
          impact?: string
          previous?: string | null
          provider: string
          release_at: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          actual?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          event_name?: string
          external_id?: string
          forecast?: string | null
          id?: string
          impact?: string
          previous?: string | null
          provider?: string
          release_at?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exchange_credentials: {
        Row: {
          api_key: string
          api_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          last_validated_at: string | null
          portfolio_id: string
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
          portfolio_id: string
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
          portfolio_id?: string
          provider?: string
          scope?: string
          secret_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_credentials_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          flag: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag?: string
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
          account_label: string | null
          entry_price: number
          id: string
          leverage: number
          provider: string
          side: string
          size: number
          stop_loss: number | null
          symbol: string
          unrealized_pnl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          entry_price?: number
          id?: string
          leverage?: number
          provider?: string
          side: string
          size?: number
          stop_loss?: number | null
          symbol: string
          unrealized_pnl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          entry_price?: number
          id?: string
          leverage?: number
          provider?: string
          side?: string
          size?: number
          stop_loss?: number | null
          symbol?: string
          unrealized_pnl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          color: string | null
          created_at: string
          currency: string
          icon: string | null
          id: string
          is_default: boolean
          name: string
          sort_order: number
          starting_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          starting_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          starting_balance?: number
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          grandfathered: boolean
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["sub_status"]
          tier: Database["public"]["Enums"]["app_tier"]
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          grandfathered?: boolean
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          tier?: Database["public"]["Enums"]["app_tier"]
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          grandfathered?: boolean
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          tier?: Database["public"]["Enums"]["app_tier"]
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trader_mind_sessions: {
        Row: {
          archetype: string | null
          completed_at: string
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          archetype?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          archetype?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          account_label: string | null
          asset_class: string | null
          broker_id: string | null
          closed_at: string | null
          created_at: string
          data: Json
          exchange_exec_id: string | null
          external_id: string | null
          id: string
          manual_r_multiple: number | null
          opened_at: string | null
          portfolio_id: string
          source_type: string | null
          trade_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          asset_class?: string | null
          broker_id?: string | null
          closed_at?: string | null
          created_at?: string
          data: Json
          exchange_exec_id?: string | null
          external_id?: string | null
          id?: string
          manual_r_multiple?: number | null
          opened_at?: string | null
          portfolio_id: string
          source_type?: string | null
          trade_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          asset_class?: string | null
          broker_id?: string | null
          closed_at?: string | null
          created_at?: string
          data?: Json
          exchange_exec_id?: string | null
          external_id?: string | null
          id?: string
          manual_r_multiple?: number | null
          opened_at?: string | null
          portfolio_id?: string
          source_type?: string | null
          trade_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          benchmark_opt_in: boolean
          consent: Json | null
          created_at: string
          daily_risk_limit: number
          legal_accepted: boolean
          legal_accepted_at: string | null
          legal_version: string | null
          monthly_risk_limit: number
          privacy_accepted: boolean
          privacy_accepted_at: string | null
          privacy_version: string | null
          risk_per_trade_default: number
          theme: string
          updated_at: string
          user_id: string
          weekly_risk_limit: number
        }
        Insert: {
          benchmark_opt_in?: boolean
          consent?: Json | null
          created_at?: string
          daily_risk_limit?: number
          legal_accepted?: boolean
          legal_accepted_at?: string | null
          legal_version?: string | null
          monthly_risk_limit?: number
          privacy_accepted?: boolean
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          risk_per_trade_default?: number
          theme?: string
          updated_at?: string
          user_id: string
          weekly_risk_limit?: number
        }
        Update: {
          benchmark_opt_in?: boolean
          consent?: Json | null
          created_at?: string
          daily_risk_limit?: number
          legal_accepted?: boolean
          legal_accepted_at?: string | null
          legal_version?: string | null
          monthly_risk_limit?: number
          privacy_accepted?: boolean
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          risk_per_trade_default?: number
          theme?: string
          updated_at?: string
          user_id?: string
          weekly_risk_limit?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
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
      _orca_trader_rollup: {
        Args: never
        Returns: {
          archetype: string
          behavioural_risk: number
          breach_m: number
          breach_w: number
          code: string
          discipline: number
          edge_health: number
          expectancy: number
          journal_completion: number
          last_active_days: number
          orca: number
          prov: string
          readiness: number
          regime_fit: number
          retention_risk: number
          rules_rate: number
          sessions_wk: number
          tenure_days: number
          tier: string
          tier_weight: number
          trades_total: number
          uid: string
          value_potential: number
          win_rate: number
        }[]
      }
      admin_activation_funnel: {
        Args: never
        Returns: {
          n: number
          stage: string
        }[]
      }
      admin_active_count: { Args: { p_window?: number }; Returns: number }
      admin_activity_heatmap: {
        Args: { p_period?: number }
        Returns: {
          dow: number
          hour: number
          n: number
        }[]
      }
      admin_ai_usage: {
        Args: { p_feature?: string; p_period?: number }
        Returns: {
          avg_latency_ms: number
          calls: number
          cost_usd: number
          feature: string
          tokens: number
          week: string
        }[]
      }
      admin_benchmarks: { Args: { p_kmin?: number }; Returns: Json }
      admin_data_quality: { Args: never; Returns: Json }
      admin_db_storage: {
        Args: never
        Returns: {
          cache_hit_ratio: number
          connections: number
          db_size_bytes: number
          row_estimate: number
          size_bytes: number
          table_name: string
        }[]
      }
      admin_engagement_weekly: {
        Args: { p_period?: number }
        Returns: {
          active: number
          signups: number
          trades: number
          week: string
        }[]
      }
      admin_performance: {
        Args: { p_archetype?: string; p_tier?: string }
        Returns: Json
      }
      admin_retention_cohorts: { Args: { p_cohorts?: number }; Returns: Json }
      admin_risk_engine: { Args: { p_tier?: string }; Returns: Json }
      admin_sanity_counts: {
        Args: never
        Returns: {
          subscriptions: number
          total_trades: number
          traders_with_trades: number
          users: number
        }[]
      }
      admin_subscriptions: { Args: never; Returns: Json }
      admin_trader_matrix: {
        Args: {
          p_archetype?: string
          p_dir?: string
          p_limit?: number
          p_sort?: string
          p_tier?: string
        }
        Returns: {
          archetype: string
          behavioural_risk: number
          code: string
          discipline: number
          expectancy: number
          last_active_days: number
          retention_risk: number
          sessions_wk: number
          tier: string
          value_potential: number
        }[]
      }
      admin_trader_matrix_full: {
        Args: {
          p_archetype?: string
          p_dir?: string
          p_limit?: number
          p_sort?: string
          p_tier?: string
        }
        Returns: {
          archetype: string
          asset_class: string
          behavioural_risk: number
          breach_daily: number
          breach_monthly: number
          breach_trade: number
          breach_weekly: number
          code: string
          discipline: number
          exp_slope: number
          exp_trend: number[]
          expectancy: number
          last_active_days: number
          over_z: number
          readiness: number
          retention_risk: number
          revenge_rate: number
          sessions_wk: number
          source_type: string
          sub_status: string
          tier: string
          value_potential: number
          win_rate: number
        }[]
      }
      admin_trader_mind: { Args: never; Returns: Json }
      backfill_trade_provenance: { Args: { p_batch?: number }; Returns: number }
      bug_arena_people: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
        }[]
      }
      create_bug_report: {
        Args: {
          p_bug_type?: string
          p_description: string
          p_diagnostics?: Json
          p_element_label?: string
          p_element_rect?: Json
          p_element_selector?: string
          p_route?: string
          p_section?: string
          p_severity?: string
          p_title?: string
          p_viewport?: Json
        }
        Returns: {
          bug_type: string
          created_at: string
          created_by: string
          dedup_key: string | null
          description: string
          diagnostics: Json | null
          element_label: string | null
          element_rect: Json | null
          element_selector: string | null
          id: string
          route: string | null
          section: string
          severity: string
          status: string
          title: string | null
          updated_at: string
          viewport: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "bug_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_entitlement: {
        Args: { p_user: string }
        Returns: Database["public"]["Enums"]["app_tier"]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_bug_creator: {
        Args: { _bug_id: string; _user_id: string }
        Returns: boolean
      }
      is_bug_reporter: {
        Args: { _bug_id: string; _user_id: string }
        Returns: boolean
      }
      is_sole_reporter: {
        Args: { _bug_id: string; _user_id: string }
        Returns: boolean
      }
      join_bug: {
        Args: { p_bug_id: string; p_note?: string }
        Returns: undefined
      }
      read_exchange_secret: {
        Args: { p_cred_id: string; p_user_id: string }
        Returns: string
      }
      reporter_count: { Args: { _bug_id: string }; Returns: number }
      set_bug_status: {
        Args: { p_bug_id: string; p_status: string }
        Returns: {
          bug_type: string
          created_at: string
          created_by: string
          dedup_key: string | null
          description: string
          diagnostics: Json | null
          element_label: string | null
          element_rect: Json | null
          element_selector: string | null
          id: string
          route: string | null
          section: string
          severity: string
          status: string
          title: string | null
          updated_at: string
          viewport: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "bug_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      trader_code: { Args: { uid: string }; Returns: string }
    }
    Enums: {
      app_tier: "standard" | "advanced" | "ultimate"
      sub_status: "trialing" | "active" | "past_due" | "canceled" | "expired"
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
      app_tier: ["standard", "advanced", "ultimate"],
      sub_status: ["trialing", "active", "past_due", "canceled", "expired"],
    },
  },
} as const
