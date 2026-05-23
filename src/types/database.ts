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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_types: {
        Row: {
          color_code: string
          created_at: string
          facility_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color_code?: string
          created_at?: string
          facility_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color_code?: string
          created_at?: string
          facility_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_rosters: {
        Row: {
          booking_group_id: string
          id: string
          is_checked_in: boolean | null
          joined_at: string
          user_id: string
        }
        Insert: {
          booking_group_id: string
          id?: string
          is_checked_in?: boolean | null
          joined_at?: string
          user_id: string
        }
        Update: {
          booking_group_id?: string
          id?: string
          is_checked_in?: boolean | null
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_rosters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          buyer_id: string | null
          checked_in: boolean | null
          created_at: string
          game_id: string
          has_physical_waiver: boolean | null
          has_signed: boolean | null
          id: string
          is_captain: boolean | null
          is_winner: boolean | null
          last_read_at: string | null
          linked_booking_id: string | null
          note: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_status: string | null
          roster_status: string | null
          status: string | null
          stripe_payment_method_id: string | null
          team: string | null
          team_assignment: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          buyer_id?: string | null
          checked_in?: boolean | null
          created_at?: string
          game_id: string
          has_physical_waiver?: boolean | null
          has_signed?: boolean | null
          id?: string
          is_captain?: boolean | null
          is_winner?: boolean | null
          last_read_at?: string | null
          linked_booking_id?: string | null
          note?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          roster_status?: string | null
          status?: string | null
          stripe_payment_method_id?: string | null
          team?: string | null
          team_assignment?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          buyer_id?: string | null
          checked_in?: boolean | null
          created_at?: string
          game_id?: string
          has_physical_waiver?: boolean | null
          has_signed?: boolean | null
          id?: string
          is_captain?: boolean | null
          is_winner?: boolean | null
          last_read_at?: string | null
          linked_booking_id?: string | null
          note?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          roster_status?: string | null
          status?: string | null
          stripe_payment_method_id?: string | null
          team?: string | null
          team_assignment?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          admin_id: string
          amount: number
          created_at: string | null
          id: string
          reason: string | null
          type: string
          user_id: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string | null
          id?: string
          reason?: string | null
          type: string
          user_id: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_check_ins: {
        Row: {
          checked_by: string
          checked_in_at: string | null
          event_id: string
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id: string
          user_id: string
        }
        Insert: {
          checked_by: string
          checked_in_at?: string | null
          event_id: string
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          user_id: string
        }
        Update: {
          checked_by?: string
          checked_in_at?: string | null
          event_id?: string
          event_type?: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      event_identities: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          photo_url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          photo_url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          photo_url?: string
          user_id?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string | null
          amenities: string[] | null
          charges_enabled: boolean | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          hero_image_url: string | null
          id: string
          name: string
          operating_hours: Json | null
          public_description: string | null
          slug: string
          state: string | null
          stripe_account_id: string | null
          waiver_text: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          charges_enabled?: boolean | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          hero_image_url?: string | null
          id?: string
          name: string
          operating_hours?: Json | null
          public_description?: string | null
          slug: string
          state?: string | null
          stripe_account_id?: string | null
          waiver_text?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          charges_enabled?: boolean | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          hero_image_url?: string | null
          id?: string
          name?: string
          operating_hours?: Json | null
          public_description?: string | null
          slug?: string
          state?: string | null
          stripe_account_id?: string | null
          waiver_text?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      facility_activities: {
        Row: {
          activity_type_id: string
          created_at: string
          facility_id: string
        }
        Insert: {
          activity_type_id: string
          created_at?: string
          facility_id: string
        }
        Update: {
          activity_type_id?: string
          created_at?: string
          facility_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_activities_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_activities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      game_attendance: {
        Row: {
          created_at: string | null
          game_id: string | null
          id: string
          match_date: string
          status: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          match_date: string
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          match_date?: string
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_attendance_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_attendance_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          accepting_registrations: boolean | null
          admin_id: string | null
          allow_free_agents: boolean | null
          allowed_payment_methods: string[] | null
          amount_of_fields: number | null
          away_score: number | null
          break_between_games: number | null
          cash_amount: number | null
          cash_fee_structure: string | null
          charge_team_registration_fee: boolean | null
          created_at: string
          current_players: number | null
          deduct_team_reg_fee: boolean | null
          deposit_amount: number | null
          description: string | null
          earliest_game_start_time: string | null
          end_time: string | null
          event_type: string | null
          facility_id: string | null
          field_names: string[] | null
          field_size: string | null
          fixed_prize_amount: number | null
          free_agent_price: number | null
          game_format: string | null
          game_format_type: string | null
          game_style: string | null
          half_length: number | null
          halftime_length: number | null
          has_free_agent_credit: boolean | null
          has_mvp_reward: boolean | null
          has_playoff_bye: boolean | null
          has_registration_fee_credit: boolean | null
          home_score: number | null
          host_ids: string[] | null
          id: string
          is_league: boolean | null
          is_playoff_included: boolean | null
          is_refundable: boolean | null
          latest_game_start_time: string | null
          latitude: number | null
          league_end_date: string | null
          league_format: string
          lifecycle_end_date: string | null
          lifecycle_status: string | null
          location: string
          location_name: string | null
          location_nickname: string | null
          longitude: number | null
          match_style: string | null
          max_players: number | null
          max_players_per_team: number | null
          max_teams: number | null
          mercy_rule_cap: number | null
          min_games_guaranteed: number | null
          min_players_per_team: number | null
          min_teams: number | null
          minimum_games_per_team: number | null
          mvp_player_id: string | null
          payment_collection_type: string | null
          player_registration_fee: number | null
          playoff_start_date: string | null
          price: number | null
          prize_pool_percentage: number | null
          prize_type: string | null
          ref_fee_per_game: number | null
          refund_cutoff_date: string | null
          refund_cutoff_hours: number | null
          refund_processed: boolean | null
          registration_cutoff: string | null
          regular_season_start: string | null
          resource_id: string | null
          reward: string | null
          roster_freeze_date: string | null
          roster_lock_date: string | null
          rules_description: string | null
          shoe_types: string[] | null
          skip_dates: string[] | null
          skipped_dates: Json | null
          start_time: string | null
          status: string | null
          strict_waiver_required: boolean | null
          surface_type: string | null
          team_price: number | null
          team_registration_fee: number | null
          team_roster_fee: number | null
          team_signup_cutoff: string | null
          teams_config: Json | null
          teams_into_playoffs: number | null
          timer_duration: number | null
          timer_started_at: string | null
          timer_status: string | null
          title: string
          total_game_time: number | null
          total_weeks: number | null
          tournament_style: string | null
          view_mode: string | null
          waiver_details: string | null
          weekly_field_rental_cost: number | null
          winning_team_assignment: string | null
        }
        Insert: {
          accepting_registrations?: boolean | null
          admin_id?: string | null
          allow_free_agents?: boolean | null
          allowed_payment_methods?: string[] | null
          amount_of_fields?: number | null
          away_score?: number | null
          break_between_games?: number | null
          cash_amount?: number | null
          cash_fee_structure?: string | null
          charge_team_registration_fee?: boolean | null
          created_at?: string
          current_players?: number | null
          deduct_team_reg_fee?: boolean | null
          deposit_amount?: number | null
          description?: string | null
          earliest_game_start_time?: string | null
          end_time?: string | null
          event_type?: string | null
          facility_id?: string | null
          field_names?: string[] | null
          field_size?: string | null
          fixed_prize_amount?: number | null
          free_agent_price?: number | null
          game_format?: string | null
          game_format_type?: string | null
          game_style?: string | null
          half_length?: number | null
          halftime_length?: number | null
          has_free_agent_credit?: boolean | null
          has_mvp_reward?: boolean | null
          has_playoff_bye?: boolean | null
          has_registration_fee_credit?: boolean | null
          home_score?: number | null
          host_ids?: string[] | null
          id?: string
          is_league?: boolean | null
          is_playoff_included?: boolean | null
          is_refundable?: boolean | null
          latest_game_start_time?: string | null
          latitude?: number | null
          league_end_date?: string | null
          league_format?: string
          lifecycle_end_date?: string | null
          lifecycle_status?: string | null
          location: string
          location_name?: string | null
          location_nickname?: string | null
          longitude?: number | null
          match_style?: string | null
          max_players?: number | null
          max_players_per_team?: number | null
          max_teams?: number | null
          mercy_rule_cap?: number | null
          min_games_guaranteed?: number | null
          min_players_per_team?: number | null
          min_teams?: number | null
          minimum_games_per_team?: number | null
          mvp_player_id?: string | null
          payment_collection_type?: string | null
          player_registration_fee?: number | null
          playoff_start_date?: string | null
          price?: number | null
          prize_pool_percentage?: number | null
          prize_type?: string | null
          ref_fee_per_game?: number | null
          refund_cutoff_date?: string | null
          refund_cutoff_hours?: number | null
          refund_processed?: boolean | null
          registration_cutoff?: string | null
          regular_season_start?: string | null
          resource_id?: string | null
          reward?: string | null
          roster_freeze_date?: string | null
          roster_lock_date?: string | null
          rules_description?: string | null
          shoe_types?: string[] | null
          skip_dates?: string[] | null
          skipped_dates?: Json | null
          start_time?: string | null
          status?: string | null
          strict_waiver_required?: boolean | null
          surface_type?: string | null
          team_price?: number | null
          team_registration_fee?: number | null
          team_roster_fee?: number | null
          team_signup_cutoff?: string | null
          teams_config?: Json | null
          teams_into_playoffs?: number | null
          timer_duration?: number | null
          timer_started_at?: string | null
          timer_status?: string | null
          title: string
          total_game_time?: number | null
          total_weeks?: number | null
          tournament_style?: string | null
          view_mode?: string | null
          waiver_details?: string | null
          weekly_field_rental_cost?: number | null
          winning_team_assignment?: string | null
        }
        Update: {
          accepting_registrations?: boolean | null
          admin_id?: string | null
          allow_free_agents?: boolean | null
          allowed_payment_methods?: string[] | null
          amount_of_fields?: number | null
          away_score?: number | null
          break_between_games?: number | null
          cash_amount?: number | null
          cash_fee_structure?: string | null
          charge_team_registration_fee?: boolean | null
          created_at?: string
          current_players?: number | null
          deduct_team_reg_fee?: boolean | null
          deposit_amount?: number | null
          description?: string | null
          earliest_game_start_time?: string | null
          end_time?: string | null
          event_type?: string | null
          facility_id?: string | null
          field_names?: string[] | null
          field_size?: string | null
          fixed_prize_amount?: number | null
          free_agent_price?: number | null
          game_format?: string | null
          game_format_type?: string | null
          game_style?: string | null
          half_length?: number | null
          halftime_length?: number | null
          has_free_agent_credit?: boolean | null
          has_mvp_reward?: boolean | null
          has_playoff_bye?: boolean | null
          has_registration_fee_credit?: boolean | null
          home_score?: number | null
          host_ids?: string[] | null
          id?: string
          is_league?: boolean | null
          is_playoff_included?: boolean | null
          is_refundable?: boolean | null
          latest_game_start_time?: string | null
          latitude?: number | null
          league_end_date?: string | null
          league_format?: string
          lifecycle_end_date?: string | null
          lifecycle_status?: string | null
          location?: string
          location_name?: string | null
          location_nickname?: string | null
          longitude?: number | null
          match_style?: string | null
          max_players?: number | null
          max_players_per_team?: number | null
          max_teams?: number | null
          mercy_rule_cap?: number | null
          min_games_guaranteed?: number | null
          min_players_per_team?: number | null
          min_teams?: number | null
          minimum_games_per_team?: number | null
          mvp_player_id?: string | null
          payment_collection_type?: string | null
          player_registration_fee?: number | null
          playoff_start_date?: string | null
          price?: number | null
          prize_pool_percentage?: number | null
          prize_type?: string | null
          ref_fee_per_game?: number | null
          refund_cutoff_date?: string | null
          refund_cutoff_hours?: number | null
          refund_processed?: boolean | null
          registration_cutoff?: string | null
          regular_season_start?: string | null
          resource_id?: string | null
          reward?: string | null
          roster_freeze_date?: string | null
          roster_lock_date?: string | null
          rules_description?: string | null
          shoe_types?: string[] | null
          skip_dates?: string[] | null
          skipped_dates?: Json | null
          start_time?: string | null
          status?: string | null
          strict_waiver_required?: boolean | null
          surface_type?: string | null
          team_price?: number | null
          team_registration_fee?: number | null
          team_roster_fee?: number | null
          team_signup_cutoff?: string | null
          teams_config?: Json | null
          teams_into_playoffs?: number | null
          timer_duration?: number | null
          timer_started_at?: string | null
          timer_status?: string | null
          title?: string
          total_game_time?: number | null
          total_weeks?: number | null
          tournament_style?: string | null
          view_mode?: string | null
          waiver_details?: string | null
          weekly_field_rental_cost?: number | null
          winning_team_assignment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_mvp_player_id_fkey"
            columns: ["mvp_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      league_matches: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          created_at: string
          end_time: string | null
          game_id: string | null
          home_score: number | null
          home_team_id: string | null
          id: string
          league_id: string
          match_type: string
          start_time: string
          status: string
          updated_at: string
          week_number: number
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          created_at?: string
          end_time?: string | null
          game_id?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          league_id: string
          match_type?: string
          start_time: string
          status?: string
          updated_at?: string
          week_number?: number
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          created_at?: string
          end_time?: string | null
          game_id?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          league_id?: string
          match_type?: string
          start_time?: string
          status?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_resources: {
        Row: {
          created_at: string
          league_id: string
          resource_id: string
        }
        Insert: {
          created_at?: string
          league_id: string
          resource_id: string
        }
        Update: {
          created_at?: string
          league_id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_resources_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          activity_id: string | null
          cash_amount: number | null
          cash_fee_structure: string | null
          created_at: string
          description: string | null
          end_date: string | null
          event_type: string | null
          facility_id: string
          format: string | null
          game_days: string | null
          game_length: number | null
          game_periods: string | null
          has_playoffs: boolean | null
          id: string
          league_format: string
          match_day: string | null
          max_roster: number | null
          max_teams: number | null
          min_roster: number | null
          name: string
          payment_collection_type: string | null
          player_registration_fee: number | null
          playoff_spots: number | null
          price: number | null
          price_per_free_agent: number | null
          price_per_team: number | null
          registration_cutoff: string | null
          registration_open: boolean | null
          season: string | null
          sport: string
          start_date: string | null
          status: string
          strict_waiver_required: boolean | null
          time_range_end: string | null
          time_range_start: string | null
          updated_at: string
          waiver_details: string | null
        }
        Insert: {
          activity_id?: string | null
          cash_amount?: number | null
          cash_fee_structure?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          facility_id: string
          format?: string | null
          game_days?: string | null
          game_length?: number | null
          game_periods?: string | null
          has_playoffs?: boolean | null
          id?: string
          league_format?: string
          match_day?: string | null
          max_roster?: number | null
          max_teams?: number | null
          min_roster?: number | null
          name: string
          payment_collection_type?: string | null
          player_registration_fee?: number | null
          playoff_spots?: number | null
          price?: number | null
          price_per_free_agent?: number | null
          price_per_team?: number | null
          registration_cutoff?: string | null
          registration_open?: boolean | null
          season?: string | null
          sport: string
          start_date?: string | null
          status?: string
          strict_waiver_required?: boolean | null
          time_range_end?: string | null
          time_range_start?: string | null
          updated_at?: string
          waiver_details?: string | null
        }
        Update: {
          activity_id?: string | null
          cash_amount?: number | null
          cash_fee_structure?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          facility_id?: string
          format?: string | null
          game_days?: string | null
          game_length?: number | null
          game_periods?: string | null
          has_playoffs?: boolean | null
          id?: string
          league_format?: string
          match_day?: string | null
          max_roster?: number | null
          max_teams?: number | null
          min_roster?: number | null
          name?: string
          payment_collection_type?: string | null
          player_registration_fee?: number | null
          playoff_spots?: number | null
          price?: number | null
          price_per_free_agent?: number | null
          price_per_team?: number | null
          registration_cutoff?: string | null
          registration_open?: boolean | null
          season?: string | null
          sport?: string
          start_date?: string | null
          status?: string
          strict_waiver_required?: boolean | null
          time_range_end?: string | null
          time_range_start?: string | null
          updated_at?: string
          waiver_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leagues_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leagues_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lineups: {
        Row: {
          created_at: string | null
          formation: string
          id: string
          match_id: string
          positions: Json
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          formation?: string
          id?: string
          match_id: string
          positions?: Json
          team_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          formation?: string
          id?: string
          match_id?: string
          positions?: Json
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string
          id: string
          is_checked_in: boolean | null
          match_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_checked_in?: boolean | null
          match_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_checked_in?: boolean | null
          match_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team: string
          away_team_id: string | null
          created_at: string | null
          field_name: string | null
          game_id: string
          home_score: number | null
          home_team: string
          home_team_id: string | null
          id: string
          is_final: boolean | null
          is_playoff: boolean | null
          match_phase: string | null
          match_style: string | null
          paused_elapsed_seconds: number | null
          round_number: number | null
          scheduled_time: string | null
          start_time: string | null
          status: string | null
          timer_started_at: string | null
          timer_status: string | null
          tournament_stage: string | null
        }
        Insert: {
          away_score?: number | null
          away_team: string
          away_team_id?: string | null
          created_at?: string | null
          field_name?: string | null
          game_id: string
          home_score?: number | null
          home_team: string
          home_team_id?: string | null
          id?: string
          is_final?: boolean | null
          is_playoff?: boolean | null
          match_phase?: string | null
          match_style?: string | null
          paused_elapsed_seconds?: number | null
          round_number?: number | null
          scheduled_time?: string | null
          start_time?: string | null
          status?: string | null
          timer_started_at?: string | null
          timer_status?: string | null
          tournament_stage?: string | null
        }
        Update: {
          away_score?: number | null
          away_team?: string
          away_team_id?: string | null
          created_at?: string | null
          field_name?: string | null
          game_id?: string
          home_score?: number | null
          home_team?: string
          home_team_id?: string | null
          id?: string
          is_final?: boolean | null
          is_playoff?: boolean | null
          match_phase?: string | null
          match_style?: string | null
          paused_elapsed_seconds?: number | null
          round_number?: number | null
          scheduled_time?: string | null
          start_time?: string | null
          status?: string | null
          timer_started_at?: string | null
          timer_status?: string | null
          tournament_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          event_id: string | null
          id: string
          is_broadcast: boolean | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_broadcast?: boolean | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_broadcast?: boolean | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mvp_votes: {
        Row: {
          candidate_id: string
          created_at: string | null
          game_id: string
          id: string
          voter_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          game_id: string
          id?: string
          voter_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          game_id?: string
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mvp_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_votes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          admin_id: string
          code: string
          created_at: string | null
          expires_at: string
          id: string
          target_role: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          admin_id: string
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          target_role: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          admin_id?: string
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          target_role?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "otp_verifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "otp_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_checkouts: {
        Row: {
          buyer_id: string
          checkout_session_id: string | null
          created_at: string | null
          credit_used: number | null
          game_id: string
          guest_ids: string[] | null
          id: string
          team_assignment: string | null
        }
        Insert: {
          buyer_id: string
          checkout_session_id?: string | null
          created_at?: string | null
          credit_used?: number | null
          game_id: string
          guest_ids?: string[] | null
          id?: string
          team_assignment?: string | null
        }
        Update: {
          buyer_id?: string
          checkout_session_id?: string | null
          created_at?: string | null
          credit_used?: number | null
          game_id?: string
          guest_ids?: string[] | null
          id?: string
          team_assignment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_checkouts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_checkouts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          fee_fixed: number | null
          fee_percent: number | null
          fee_type: string
          id: number
          updated_at: string
        }
        Insert: {
          fee_fixed?: number | null
          fee_percent?: number | null
          fee_type?: string
          id: number
          updated_at?: string
        }
        Update: {
          fee_fixed?: number | null
          fee_percent?: number | null
          fee_type?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_until: string | null
          bio: string | null
          credit_balance: number | null
          email: string | null
          facility_id: string | null
          free_game_credits: number | null
          full_name: string | null
          id: string
          is_banned: boolean | null
          is_free_agent: boolean | null
          jersey_number: number | null
          mvp_awards: number | null
          notification_settings: Json | null
          position: string | null
          role: string | null
          stripe_customer_id: string | null
          system_role: string | null
          updated_at: string | null
          verification_status: string | null
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          bio?: string | null
          credit_balance?: number | null
          email?: string | null
          facility_id?: string | null
          free_game_credits?: number | null
          full_name?: string | null
          id: string
          is_banned?: boolean | null
          is_free_agent?: boolean | null
          jersey_number?: number | null
          mvp_awards?: number | null
          notification_settings?: Json | null
          position?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          system_role?: string | null
          updated_at?: string | null
          verification_status?: string | null
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          bio?: string | null
          credit_balance?: number | null
          email?: string | null
          facility_id?: string | null
          free_game_credits?: number | null
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          is_free_agent?: boolean | null
          jersey_number?: number | null
          mvp_awards?: number | null
          notification_settings?: Json | null
          position?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          system_role?: string | null
          updated_at?: string | null
          verification_status?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          facility_id: string | null
          id: string
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_type: string
          discount_value: number
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          max_uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_booking_groups: {
        Row: {
          created_at: string
          facility_id: string | null
          final_price: number
          id: string
          payment_term: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          final_price?: number
          id: string
          payment_term?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          final_price?: number
          id?: string
          payment_term?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_booking_groups_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_booking_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_activities: {
        Row: {
          activity_type_id: string
          created_at: string
          resource_id: string
        }
        Insert: {
          activity_type_id: string
          created_at?: string
          resource_id: string
        }
        Update: {
          activity_type_id?: string
          created_at?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_activities_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_activities_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_bookings: {
        Row: {
          color: string | null
          contact_email: string | null
          created_at: string | null
          end_time: string
          facility_id: string
          id: string
          is_listed: boolean | null
          listing_price: number | null
          marketplace_status: string | null
          payment_status: string | null
          recurring_group_id: string | null
          renter_name: string | null
          resource_id: string
          start_time: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          contact_email?: string | null
          created_at?: string | null
          end_time: string
          facility_id: string
          id?: string
          is_listed?: boolean | null
          listing_price?: number | null
          marketplace_status?: string | null
          payment_status?: string | null
          recurring_group_id?: string | null
          renter_name?: string | null
          resource_id: string
          start_time: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          contact_email?: string | null
          created_at?: string | null
          end_time?: string
          facility_id?: string
          id?: string
          is_listed?: boolean | null
          listing_price?: number | null
          marketplace_status?: string | null
          payment_status?: string | null
          recurring_group_id?: string | null
          renter_name?: string | null
          resource_id?: string
          start_time?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_bookings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_types: {
        Row: {
          created_at: string
          default_hourly_rate: number | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_hourly_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_hourly_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string | null
          default_hourly_rate: number | null
          facility_id: string | null
          id: string
          name: string
          resource_type_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          default_hourly_rate?: number | null
          facility_id?: string | null
          id?: string
          name: string
          resource_type_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          default_hourly_rate?: number | null
          facility_id?: string | null
          id?: string
          name?: string
          resource_type_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string | null
          id: string
          identifier: string
          path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          identifier: string
          path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          identifier?: string
          path?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          hero_headline: string
          hero_image_url: string | null
          hero_subtext: string
          how_it_works_image_url: string | null
          id: number
          testimonial_text: string
          updated_at: string | null
        }
        Insert: {
          hero_headline: string
          hero_image_url?: string | null
          hero_subtext: string
          how_it_works_image_url?: string | null
          id?: number
          testimonial_text: string
          updated_at?: string | null
        }
        Update: {
          hero_headline?: string
          hero_image_url?: string | null
          hero_subtext?: string
          how_it_works_image_url?: string | null
          id?: number
          testimonial_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          key: string
          label: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          key: string
          label: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          key?: string
          label?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      team_players: {
        Row: {
          created_at: string
          id: string
          role: string
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          accepting_free_agents: boolean | null
          captain_id: string | null
          created_at: string
          game_id: string | null
          id: string
          league_id: string | null
          name: string
          primary_color: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepting_free_agents?: boolean | null
          captain_id?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          league_id?: string | null
          name: string
          primary_color?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepting_free_agents?: boolean | null
          captain_id?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          league_id?: string | null
          name?: string
          primary_color?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          cash_paid_current_round: boolean | null
          checked_in: boolean | null
          created_at: string
          game_id: string | null
          id: string
          league_id: string | null
          payment_status: string | null
          preferred_positions: string[] | null
          role: string | null
          status: string
          stripe_setup_intent_id: string | null
          team_id: string | null
          total_cash_collected: number | null
          user_id: string
          verification_photo_url: string | null
        }
        Insert: {
          cash_paid_current_round?: boolean | null
          checked_in?: boolean | null
          created_at?: string
          game_id?: string | null
          id?: string
          league_id?: string | null
          payment_status?: string | null
          preferred_positions?: string[] | null
          role?: string | null
          status?: string
          stripe_setup_intent_id?: string | null
          team_id?: string | null
          total_cash_collected?: number | null
          user_id: string
          verification_photo_url?: string | null
        }
        Update: {
          cash_paid_current_round?: boolean | null
          checked_in?: boolean | null
          created_at?: string
          game_id?: string | null
          id?: string
          league_id?: string | null
          payment_status?: string | null
          preferred_positions?: string[] | null
          role?: string | null
          status?: string
          stripe_setup_intent_id?: string | null
          team_id?: string | null
          total_cash_collected?: number | null
          user_id?: string
          verification_photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_signatures: {
        Row: {
          agreed_at: string
          facility_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          agreed_at?: string
          facility_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          agreed_at?: string
          facility_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiver_signatures_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      player_stats: {
        Row: {
          total_games: number | null
          total_wins: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_max_reqs: number
          p_path: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      cleanup_security_logs: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_master: { Args: never; Returns: boolean }
      is_master_admin: { Args: never; Returns: boolean }
      is_team_captain: { Args: { check_team_id: string }; Returns: boolean }
    }
    Enums: {
      event_type_enum: "rolling" | "tournament" | "pickup"
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
      event_type_enum: ["rolling", "tournament", "pickup"],
    },
  },
} as const
