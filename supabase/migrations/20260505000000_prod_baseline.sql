


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."event_type_enum" AS ENUM (
    'rolling',
    'tournament',
    'pickup'
);


ALTER TYPE "public"."event_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_path" "text", "p_max_reqs" integer, "p_window_seconds" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Log the current attempt
    INSERT INTO public.security_logs (identifier, path)
    VALUES (p_identifier, p_path);
    -- Count requests in the window
    SELECT count(*)
    INTO v_count
    FROM public.security_logs
    WHERE identifier = p_identifier
      AND path = p_path
      AND created_at >= (now() - (p_window_seconds || ' seconds')::interval);
    -- Check if exceeded
    IF v_count > p_max_reqs THEN
        RETURN TRUE; -- Rate limited
    END IF;
    RETURN FALSE; -- Allowed
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_path" "text", "p_max_reqs" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_security_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.security_logs
    WHERE created_at < (now() - INTERVAL '24 hours');
END;
$$;


ALTER FUNCTION "public"."cleanup_security_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_bookings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_bookings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
end;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_master"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'master_admin')
  );
END;
$$;


ALTER FUNCTION "public"."is_admin_or_master"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_master_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'master_admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_master_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_captain"("check_team_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE user_id = auth.uid()
    AND team_id = check_team_id
    AND role = 'captain'
  );
END;
$$;


ALTER FUNCTION "public"."is_team_captain"("check_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_current_players_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DECLARE
        target_game_id UUID;
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            target_game_id := OLD.game_id;
        ELSE
            target_game_id := NEW.game_id;
        END IF;
        UPDATE games
        SET current_players = (
            SELECT COUNT(*)
            FROM bookings
            WHERE game_id = target_game_id
            AND status IN ('paid', 'active', 'confirmed')
        )
        WHERE id = target_game_id;
        IF (TG_OP = 'UPDATE' AND OLD.game_id IS DISTINCT FROM NEW.game_id) THEN
            UPDATE games
            SET current_players = (
                SELECT COUNT(*)
                FROM bookings
                WHERE game_id = OLD.game_id
                AND status IN ('paid', 'active', 'confirmed')
            )
            WHERE id = OLD.game_id;
        END IF;
        RETURN NULL;
    END;
END;
$$;


ALTER FUNCTION "public"."update_current_players_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tournament_players_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DECLARE
        target_game_id UUID;
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            target_game_id := OLD.game_id;
        ELSE
            target_game_id := NEW.game_id;
        END IF;
        -- We only update if target_game_id is present (some registrations might be league-only, but we mostly care about game-linked ones for counts)
        IF target_game_id IS NOT NULL THEN
            UPDATE games
            SET current_players = (
                SELECT COUNT(*)
                FROM tournament_registrations
                WHERE game_id = target_game_id
                AND status IN ('registered', 'active', 'paid')
            )
            WHERE id = target_game_id;
        END IF;
        -- Handle game_id changes (re-parenting)
        IF (TG_OP = 'UPDATE' AND OLD.game_id IS DISTINCT FROM NEW.game_id AND OLD.game_id IS NOT NULL) THEN
            UPDATE games
            SET current_players = (
                SELECT COUNT(*)
                FROM tournament_registrations
                WHERE game_id = OLD.game_id
                AND status IN ('registered', 'active', 'paid')
            )
            WHERE id = OLD.game_id;
        END IF;
        RETURN NULL;
    END;
END;
$$;


ALTER FUNCTION "public"."update_tournament_players_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "facility_id" "uuid",
    "name" "text" NOT NULL,
    "color_code" "text" DEFAULT '#00FF00'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."activity_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_rosters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_checked_in" boolean DEFAULT false
);


ALTER TABLE "public"."booking_rosters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid" NOT NULL,
    "game_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "team_assignment" "text",
    "checked_in" boolean DEFAULT false,
    "note" "text" DEFAULT ''::"text",
    "is_winner" boolean DEFAULT false,
    "team" "text",
    "payment_status" "text" DEFAULT 'unpaid'::"text",
    "payment_method" "text",
    "payment_amount" numeric DEFAULT 0,
    "last_read_at" timestamp with time zone DEFAULT "now"(),
    "roster_status" "text" DEFAULT 'confirmed'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_payment_method_id" "text",
    "is_captain" boolean DEFAULT false,
    "has_signed" boolean DEFAULT false,
    "has_physical_waiver" boolean DEFAULT false,
    "buyer_id" "uuid",
    "linked_booking_id" "uuid",
    CONSTRAINT "bookings_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['unpaid'::"text", 'pending'::"text", 'verified'::"text", 'refunded'::"text"]))),
    CONSTRAINT "bookings_roster_status_check" CHECK (("roster_status" = ANY (ARRAY['confirmed'::"text", 'waitlisted'::"text", 'dropped'::"text"]))),
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'active'::"text", 'waitlist'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "bookings_team_check" CHECK (("team" = ANY (ARRAY['A'::"text", 'B'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bookings"."team_assignment" IS 'Stores the explicitly selected UI Squad Block integer (1 = Team 1) to build formal rosters during B2C Games.';



COMMENT ON COLUMN "public"."bookings"."has_physical_waiver" IS 'Flag set by admins to override missing digital waivers with a physical/paper one.';



CREATE TABLE IF NOT EXISTS "public"."credit_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "type" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "credit_transactions_type_check" CHECK (("type" = ANY (ARRAY['add'::"text", 'deduct'::"text", 'spend'::"text", 'refund'::"text"])))
);


ALTER TABLE "public"."credit_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_check_ins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "event_type" "public"."event_type_enum" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "checked_in_at" timestamp with time zone DEFAULT "now"(),
    "checked_by" "uuid" NOT NULL
);


ALTER TABLE "public"."event_check_ins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_identities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_identities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "address" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "public_description" "text",
    "amenities" "text"[] DEFAULT '{}'::"text"[],
    "hero_image_url" "text",
    "operating_hours" "jsonb" DEFAULT '{}'::"jsonb",
    "contact_email" "text",
    "contact_phone" "text",
    "stripe_account_id" "text",
    "charges_enabled" boolean DEFAULT false,
    "waiver_text" "text"
);


ALTER TABLE "public"."facilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facility_activities" (
    "facility_id" "uuid" NOT NULL,
    "activity_type_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."facility_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid",
    "user_id" "uuid",
    "team_id" "uuid",
    "match_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "game_attendance_status_check" CHECK (("status" = ANY (ARRAY['committed'::"text", 'out'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."game_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "text" NOT NULL,
    "location" "text" NOT NULL,
    "start_time" timestamp with time zone,
    "price" numeric DEFAULT 10.00,
    "max_players" integer DEFAULT 22,
    "current_players" integer DEFAULT 0,
    "surface_type" "text",
    "teams_config" "jsonb" DEFAULT '[{"name": "Home", "color": "neon-blue", "limit": 11}, {"name": "Away", "color": "neon-orange", "limit": 11}]'::"jsonb",
    "status" "text" DEFAULT 'scheduled'::"text",
    "home_score" integer DEFAULT 0,
    "away_score" integer DEFAULT 0,
    "mvp_player_id" "uuid",
    "end_time" time without time zone DEFAULT '22:00:00'::time without time zone,
    "refund_processed" boolean DEFAULT false,
    "has_mvp_reward" boolean DEFAULT false,
    "allowed_payment_methods" "text"[] DEFAULT ARRAY['venmo'::"text", 'zelle'::"text"],
    "latitude" double precision,
    "longitude" double precision,
    "admin_id" "uuid",
    "host_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "timer_status" "text" DEFAULT 'stopped'::"text",
    "timer_duration" integer DEFAULT 420,
    "timer_started_at" timestamp with time zone,
    "view_mode" "text" DEFAULT 'single'::"text",
    "facility_id" "uuid",
    "resource_id" "uuid",
    "location_name" "text",
    "game_format" "text",
    "winning_team_assignment" "text",
    "event_type" "text" DEFAULT 'standard'::"text",
    "is_refundable" boolean DEFAULT false,
    "rules_description" "text",
    "location_nickname" "text",
    "game_format_type" "text",
    "match_style" "text",
    "refund_cutoff_hours" integer,
    "field_size" "text",
    "shoe_types" "text"[],
    "amount_of_fields" integer,
    "min_teams" integer,
    "max_teams" integer,
    "team_price" numeric,
    "free_agent_price" numeric,
    "total_weeks" integer,
    "is_playoff_included" boolean,
    "team_roster_fee" numeric,
    "deposit_amount" numeric,
    "min_players_per_team" integer,
    "description" "text",
    "reward" "text",
    "prize_type" "text",
    "fixed_prize_amount" numeric,
    "prize_pool_percentage" numeric,
    "refund_cutoff_date" timestamp with time zone,
    "roster_lock_date" timestamp with time zone,
    "strict_waiver_required" boolean,
    "mercy_rule_cap" integer,
    "is_league" boolean,
    "has_registration_fee_credit" boolean DEFAULT false,
    "has_free_agent_credit" boolean DEFAULT false,
    "game_style" character varying DEFAULT 'Group Stage/Playoffs'::character varying,
    "half_length" integer DEFAULT 25,
    "halftime_length" integer DEFAULT 5,
    "earliest_game_start_time" time without time zone,
    "latest_game_start_time" time without time zone,
    "field_names" "text"[],
    "min_games_guaranteed" integer,
    "teams_into_playoffs" integer,
    "has_playoff_bye" boolean DEFAULT false,
    "break_between_games" integer,
    "tournament_style" "text" DEFAULT 'group_stage'::"text",
    "minimum_games_per_team" integer DEFAULT 3,
    "max_players_per_team" integer,
    "roster_freeze_date" timestamp with time zone,
    "regular_season_start" timestamp with time zone,
    "playoff_start_date" timestamp with time zone,
    "league_format" "text" DEFAULT 'structured'::"text" NOT NULL,
    "payment_collection_type" "text" DEFAULT 'stripe'::"text",
    "cash_fee_structure" "text",
    "cash_amount" numeric,
    "waiver_details" "text",
    "allow_free_agents" boolean DEFAULT false,
    "charge_team_registration_fee" boolean DEFAULT false,
    "league_end_date" timestamp with time zone,
    "team_signup_cutoff" timestamp with time zone,
    "team_registration_fee" numeric,
    "deduct_team_reg_fee" boolean DEFAULT false,
    "player_registration_fee" numeric,
    "lifecycle_status" "text" DEFAULT 'active'::"text",
    "lifecycle_end_date" timestamp with time zone,
    "skipped_dates" "jsonb" DEFAULT '[]'::"jsonb",
    "accepting_registrations" boolean DEFAULT true,
    "registration_cutoff" timestamp with time zone,
    "ref_fee_per_game" numeric DEFAULT 0,
    "weekly_field_rental_cost" numeric DEFAULT 0,
    "skip_dates" "date"[] DEFAULT '{}'::"date"[],
    "total_game_time" integer DEFAULT 60,
    CONSTRAINT "games_event_type_check" CHECK (("event_type" = ANY (ARRAY['standard'::"text", 'tournament'::"text", 'league'::"text"]))),
    CONSTRAINT "games_league_format_check" CHECK (("league_format" = ANY (ARRAY['structured'::"text", 'rolling'::"text"]))),
    CONSTRAINT "games_lifecycle_status_check" CHECK (("lifecycle_status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'completed'::"text"]))),
    CONSTRAINT "games_payment_collection_type_check" CHECK (("payment_collection_type" = ANY (ARRAY['stripe'::"text", 'cash'::"text"]))),
    CONSTRAINT "games_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "games_timer_status_check" CHECK (("timer_status" = ANY (ARRAY['stopped'::"text", 'running'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."games" OWNER TO "postgres";


COMMENT ON COLUMN "public"."games"."timer_status" IS 'The current state of the game clock (stopped, running, paused).';



COMMENT ON COLUMN "public"."games"."timer_duration" IS 'The total target duration of the current timer in seconds. When stopped, this is the reset value. When paused, this holds the remaining time.';



COMMENT ON COLUMN "public"."games"."timer_started_at" IS 'The exact server timestamp when the timer transitioned to running. Used by clients to calculate remaining time dynamically.';



COMMENT ON COLUMN "public"."games"."roster_lock_date" IS 'Date when Stripe SetupIntents are captured and initial payments are finalized.';



COMMENT ON COLUMN "public"."games"."half_length" IS 'The duration of a single half in minutes.';



COMMENT ON COLUMN "public"."games"."halftime_length" IS 'The duration of the halftime break in minutes.';



COMMENT ON COLUMN "public"."games"."roster_freeze_date" IS 'Mid-season cutoff date after which Captains/Admins can no longer add/drop players.';



COMMENT ON COLUMN "public"."games"."regular_season_start" IS 'Delineates the start of the regular season phase.';



COMMENT ON COLUMN "public"."games"."playoff_start_date" IS 'Delineates the start of the playoff phase.';



COMMENT ON COLUMN "public"."games"."league_format" IS 'Distinguishes between traditional structured leagues and the new Rolling League format.';



COMMENT ON COLUMN "public"."games"."payment_collection_type" IS 'Method of payment collection for rolling leagues: stripe (online) or cash (at the field).';



COMMENT ON COLUMN "public"."games"."cash_amount" IS 'The amount collected per player/team if payment_collection_type is cash.';



COMMENT ON COLUMN "public"."games"."total_game_time" IS 'Estimated match slot duration in minutes, used by the rolling scheduling engine.';



CREATE TABLE IF NOT EXISTS "public"."league_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "league_id" "uuid" NOT NULL,
    "home_team_id" "uuid",
    "away_team_id" "uuid",
    "week_number" integer DEFAULT 1 NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "home_score" integer,
    "away_score" integer,
    "match_type" "text" DEFAULT 'regular_season'::"text" NOT NULL,
    "game_id" "uuid",
    CONSTRAINT "league_matches_match_type_check" CHECK (("match_type" = ANY (ARRAY['regular_season'::"text", 'playoff'::"text", 'final'::"text"]))),
    CONSTRAINT "league_matches_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."league_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_resources" (
    "league_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."league_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leagues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sport" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "season" "text",
    "start_date" "date",
    "end_date" "date",
    "max_teams" integer,
    "price_per_team" numeric,
    "price_per_free_agent" numeric,
    "price" numeric,
    "max_roster" integer,
    "registration_open" boolean DEFAULT false,
    "activity_id" "uuid",
    "format" "text",
    "game_length" integer,
    "min_roster" integer,
    "game_days" "text",
    "has_playoffs" boolean DEFAULT false,
    "playoff_spots" integer,
    "game_periods" "text",
    "time_range_start" time without time zone,
    "time_range_end" time without time zone,
    "registration_cutoff" timestamp with time zone,
    "match_day" "text",
    "event_type" "text" DEFAULT 'league'::"text",
    "league_format" "text" DEFAULT 'structured'::"text" NOT NULL,
    "payment_collection_type" "text" DEFAULT 'stripe'::"text",
    "cash_fee_structure" "text",
    "cash_amount" numeric,
    "strict_waiver_required" boolean DEFAULT false,
    "waiver_details" "text",
    "player_registration_fee" numeric,
    CONSTRAINT "leagues_event_type_check" CHECK (("event_type" = ANY (ARRAY['league'::"text", 'tournament'::"text"]))),
    CONSTRAINT "leagues_league_format_check" CHECK (("league_format" = ANY (ARRAY['structured'::"text", 'rolling'::"text"]))),
    CONSTRAINT "leagues_payment_collection_type_check" CHECK (("payment_collection_type" = ANY (ARRAY['stripe'::"text", 'cash'::"text"]))),
    CONSTRAINT "leagues_sport_check" CHECK (("sport" = ANY (ARRAY['Soccer'::"text", 'Basketball'::"text", 'Volleyball'::"text", 'Tennis'::"text", 'Pickleball'::"text", 'Other'::"text"]))),
    CONSTRAINT "leagues_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'registration'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."leagues" OWNER TO "postgres";


COMMENT ON COLUMN "public"."leagues"."payment_collection_type" IS 'Method of payment collection: stripe (online) or cash (at the field).';



COMMENT ON COLUMN "public"."leagues"."strict_waiver_required" IS 'If true, users must explicitly accept the waiver text before registering.';



CREATE TABLE IF NOT EXISTS "public"."match_lineups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "formation" "text" DEFAULT '1-2-1'::"text" NOT NULL,
    "positions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."match_lineups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid",
    "user_id" "uuid",
    "is_checked_in" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."match_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "home_team" "text" NOT NULL,
    "away_team" "text" NOT NULL,
    "home_score" integer DEFAULT 0,
    "away_score" integer DEFAULT 0,
    "is_final" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "round_number" integer DEFAULT 1,
    "scheduled_time" time without time zone,
    "status" "text" DEFAULT 'scheduled'::"text",
    "tournament_stage" "text" DEFAULT 'group'::"text",
    "field_name" "text",
    "is_playoff" boolean DEFAULT false,
    "match_style" "text" DEFAULT 'tournament'::"text",
    "start_time" timestamp with time zone,
    "timer_status" "text" DEFAULT 'stopped'::"text",
    "timer_started_at" timestamp with time zone,
    "paused_elapsed_seconds" integer DEFAULT 0,
    "match_phase" "text" DEFAULT 'pre_game'::"text",
    "home_team_id" "uuid",
    "away_team_id" "uuid",
    CONSTRAINT "matches_match_phase_check" CHECK (("match_phase" = ANY (ARRAY['pre_game'::"text", 'first_half'::"text", 'halftime'::"text", 'second_half'::"text", 'post_game'::"text"]))),
    CONSTRAINT "matches_timer_status_check" CHECK (("timer_status" = ANY (ARRAY['stopped'::"text", 'running'::"text", 'paused'::"text"]))),
    CONSTRAINT "matches_tournament_stage_check" CHECK (("tournament_stage" = ANY (ARRAY['group'::"text", 'semi_final'::"text", 'final'::"text"])))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."matches"."match_phase" IS 'The specific phase of a live tournament match used for countdown logic.';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_broadcast" boolean DEFAULT false,
    "team_id" "uuid",
    CONSTRAINT "messages_content_check" CHECK (("char_length"("content") > 0))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mvp_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "voter_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mvp_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'info'::"text"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."otp_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "target_role" "text" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."otp_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_checkouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "game_id" "uuid" NOT NULL,
    "guest_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "team_assignment" "text",
    "credit_used" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "checkout_session_id" "text"
);


ALTER TABLE "public"."pending_checkouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "id" integer NOT NULL,
    "fee_type" "text" DEFAULT 'percent'::"text" NOT NULL,
    "fee_percent" numeric DEFAULT 5.0,
    "fee_fixed" integer DEFAULT 100,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "platform_settings_fee_type_check" CHECK (("fee_type" = ANY (ARRAY['percent'::"text", 'fixed'::"text", 'both'::"text"]))),
    CONSTRAINT "platform_settings_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."player_stats" AS
 SELECT "user_id",
    "count"(*) AS "total_games",
    "count"(*) FILTER (WHERE ("is_winner" = true)) AS "total_wins"
   FROM "public"."bookings"
  WHERE (("status" = 'confirmed'::"text") OR ("status" = 'checked_in'::"text"))
  GROUP BY "user_id";


ALTER VIEW "public"."player_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone,
    "role" "text" DEFAULT 'player'::"text",
    "position" "text" DEFAULT 'Utility'::"text",
    "bio" "text" DEFAULT ''::"text",
    "mvp_awards" integer DEFAULT 0,
    "jersey_number" integer,
    "notification_settings" "jsonb" DEFAULT '{"announcements": true, "game_reminders": true}'::"jsonb",
    "free_game_credits" integer DEFAULT 0,
    "is_banned" boolean DEFAULT false,
    "banned_until" timestamp with time zone,
    "ban_reason" "text",
    "zip_code" "text",
    "system_role" "text" DEFAULT 'player'::"text",
    "facility_id" "uuid",
    "verification_status" "text" DEFAULT 'verified'::"text",
    "is_free_agent" boolean DEFAULT false,
    "stripe_customer_id" "text",
    "credit_balance" integer DEFAULT 0,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['player'::"text", 'admin'::"text", 'master_admin'::"text"]))),
    CONSTRAINT "valid_role" CHECK (("role" = ANY (ARRAY['player'::"text", 'host'::"text", 'master_admin'::"text"]))),
    CONSTRAINT "valid_verification_status" CHECK (("verification_status" = ANY (ARRAY['verified'::"text", 'pending'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid",
    "code" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" integer NOT NULL,
    "max_uses" integer,
    "current_uses" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promo_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed_amount'::"text"]))),
    CONSTRAINT "promo_codes_discount_value_check" CHECK (("discount_value" > 0))
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_booking_groups" (
    "id" "uuid" NOT NULL,
    "facility_id" "uuid",
    "user_id" "uuid",
    "payment_term" "text",
    "final_price" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "recurring_booking_groups_payment_term_check" CHECK (("payment_term" = ANY (ARRAY['upfront'::"text", 'weekly'::"text"])))
);


ALTER TABLE "public"."recurring_booking_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_activities" (
    "resource_id" "uuid" NOT NULL,
    "activity_type_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."resource_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "renter_name" "text",
    "status" "text" DEFAULT 'confirmed'::"text" NOT NULL,
    "color" "text" DEFAULT '#3B82F6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_listed" boolean DEFAULT false,
    "listing_price" numeric,
    "marketplace_status" "text" DEFAULT 'none'::"text",
    "user_id" "uuid",
    "contact_email" "text",
    "payment_status" "text" DEFAULT 'unpaid'::"text",
    "stripe_session_id" "text",
    "recurring_group_id" "uuid",
    "stripe_payment_intent_id" "text",
    CONSTRAINT "resource_bookings_status_check" CHECK (("status" = ANY (ARRAY['confirmed'::"text", 'pending'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "resource_end_after_start" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."resource_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "default_hourly_rate" numeric DEFAULT 100.00
);


ALTER TABLE "public"."resource_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid",
    "name" "text" NOT NULL,
    "type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resource_type_id" "uuid",
    "default_hourly_rate" integer DEFAULT 0
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identifier" "text" NOT NULL,
    "path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."security_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_content" (
    "id" integer DEFAULT 1 NOT NULL,
    "hero_headline" "text" NOT NULL,
    "hero_subtext" "text" NOT NULL,
    "hero_image_url" "text",
    "how_it_works_image_url" "text",
    "testimonial_text" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "site_content_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."site_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT 'true'::"jsonb" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'player'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    CONSTRAINT "team_players_role_check" CHECK (("role" = ANY (ARRAY['captain'::"text", 'player'::"text", 'coach'::"text"]))),
    CONSTRAINT "team_players_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."team_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "league_id" "uuid",
    "name" "text" NOT NULL,
    "captain_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "primary_color" "text",
    "accepting_free_agents" boolean DEFAULT false,
    "game_id" "uuid",
    CONSTRAINT "team_event_check" CHECK ((("league_id" IS NOT NULL) OR ("game_id" IS NOT NULL))),
    CONSTRAINT "teams_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'waitlisted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "league_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "preferred_positions" "text"[],
    "status" "text" DEFAULT 'registered'::"text" NOT NULL,
    "game_id" "uuid",
    "role" "text" DEFAULT 'player'::"text",
    "stripe_setup_intent_id" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "verification_photo_url" "text",
    "checked_in" boolean DEFAULT false,
    "cash_paid_current_round" boolean DEFAULT false,
    "total_cash_collected" integer DEFAULT 0,
    CONSTRAINT "tournament_registrations_status_check" CHECK (("status" = ANY (ARRAY['registered'::"text", 'drafted'::"text", 'waitlisted'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "tr_event_check" CHECK ((("league_id" IS NOT NULL) OR ("game_id" IS NOT NULL)))
);


ALTER TABLE "public"."tournament_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waiver_signatures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "facility_id" "uuid",
    "agreed_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."waiver_signatures" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_types"
    ADD CONSTRAINT "activity_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."activity_types"
    ADD CONSTRAINT "activity_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_rosters"
    ADD CONSTRAINT "booking_rosters_booking_group_id_user_id_key" UNIQUE ("booking_group_id", "user_id");



ALTER TABLE ONLY "public"."booking_rosters"
    ADD CONSTRAINT "booking_rosters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_check_ins"
    ADD CONSTRAINT "event_check_ins_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."event_check_ins"
    ADD CONSTRAINT "event_check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_identities"
    ADD CONSTRAINT "event_identities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_identities"
    ADD CONSTRAINT "event_identities_user_id_event_id_key" UNIQUE ("user_id", "event_id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."facility_activities"
    ADD CONSTRAINT "facility_activities_pkey" PRIMARY KEY ("facility_id", "activity_type_id");



ALTER TABLE ONLY "public"."game_attendance"
    ADD CONSTRAINT "game_attendance_game_id_user_id_match_date_key" UNIQUE ("game_id", "user_id", "match_date");



ALTER TABLE ONLY "public"."game_attendance"
    ADD CONSTRAINT "game_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_matches"
    ADD CONSTRAINT "league_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_resources"
    ADD CONSTRAINT "league_resources_pkey" PRIMARY KEY ("league_id", "resource_id");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_lineups"
    ADD CONSTRAINT "match_lineups_match_id_team_id_key" UNIQUE ("match_id", "team_id");



ALTER TABLE ONLY "public"."match_lineups"
    ADD CONSTRAINT "match_lineups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_match_id_user_id_key" UNIQUE ("match_id", "user_id");



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mvp_votes"
    ADD CONSTRAINT "mvp_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."otp_verifications"
    ADD CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_checkouts"
    ADD CONSTRAINT "pending_checkouts_checkout_session_id_key" UNIQUE ("checkout_session_id");



ALTER TABLE ONLY "public"."pending_checkouts"
    ADD CONSTRAINT "pending_checkouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_facility_id_code_key" UNIQUE NULLS NOT DISTINCT ("facility_id", "code");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_booking_groups"
    ADD CONSTRAINT "recurring_booking_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_activities"
    ADD CONSTRAINT "resource_activities_pkey" PRIMARY KEY ("resource_id", "activity_type_id");



ALTER TABLE ONLY "public"."resource_bookings"
    ADD CONSTRAINT "resource_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_types"
    ADD CONSTRAINT "resource_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."resource_types"
    ADD CONSTRAINT "resource_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_logs"
    ADD CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_content"
    ADD CONSTRAINT "site_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_game_user_unique" UNIQUE ("game_id", "user_id");



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_league_id_user_id_key" UNIQUE ("league_id", "user_id");



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mvp_votes"
    ADD CONSTRAINT "unique_vote_per_game" UNIQUE ("game_id", "voter_id");



ALTER TABLE ONLY "public"."waiver_signatures"
    ADD CONSTRAINT "waiver_signatures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waiver_signatures"
    ADD CONSTRAINT "waiver_signatures_user_id_facility_id_key" UNIQUE ("user_id", "facility_id");



CREATE INDEX "idx_booking_rosters_group_id" ON "public"."booking_rosters" USING "btree" ("booking_group_id");



CREATE INDEX "idx_booking_rosters_user_id" ON "public"."booking_rosters" USING "btree" ("user_id");



CREATE INDEX "idx_credit_user_id" ON "public"."credit_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_otp_admin_user" ON "public"."otp_verifications" USING "btree" ("admin_id", "user_id");



CREATE INDEX "idx_promo_codes_code" ON "public"."promo_codes" USING "btree" ("code");



CREATE INDEX "idx_promo_codes_facility_id" ON "public"."promo_codes" USING "btree" ("facility_id");



CREATE INDEX "idx_resource_bookings_facility_time" ON "public"."resource_bookings" USING "btree" ("facility_id", "start_time", "end_time");



CREATE INDEX "idx_resource_bookings_recurring_group" ON "public"."resource_bookings" USING "btree" ("recurring_group_id");



CREATE INDEX "idx_resource_bookings_resource_time" ON "public"."resource_bookings" USING "btree" ("resource_id", "start_time", "end_time");



CREATE INDEX "idx_security_logs_identifier_path_created_at" ON "public"."security_logs" USING "btree" ("identifier", "path", "created_at");



CREATE INDEX "idx_tournament_registrations_setup_intent" ON "public"."tournament_registrations" USING "btree" ("stripe_setup_intent_id");



CREATE INDEX "idx_tournament_registrations_vphoto" ON "public"."tournament_registrations" USING "btree" ("verification_photo_url");



CREATE OR REPLACE TRIGGER "handle_activity_types_updated_at" BEFORE UPDATE ON "public"."activity_types" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_league_matches_updated_at" BEFORE UPDATE ON "public"."league_matches" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_leagues_updated_at" BEFORE UPDATE ON "public"."leagues" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_resource_types_updated_at" BEFORE UPDATE ON "public"."resource_types" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."platform_settings" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "on_booking_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_current_players_count"();



CREATE OR REPLACE TRIGGER "set_resource_bookings_updated_at" BEFORE UPDATE ON "public"."resource_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_bookings_updated_at"();



CREATE OR REPLACE TRIGGER "tr_update_tournament_players_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."tournament_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_tournament_players_count"();



CREATE OR REPLACE TRIGGER "trg_update_player_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_current_players_count"();



ALTER TABLE ONLY "public"."booking_rosters"
    ADD CONSTRAINT "booking_rosters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_check_ins"
    ADD CONSTRAINT "event_check_ins_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_check_ins"
    ADD CONSTRAINT "event_check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_identities"
    ADD CONSTRAINT "event_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_activities"
    ADD CONSTRAINT "facility_activities_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_activities"
    ADD CONSTRAINT "facility_activities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_attendance"
    ADD CONSTRAINT "game_attendance_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_attendance"
    ADD CONSTRAINT "game_attendance_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_attendance"
    ADD CONSTRAINT "game_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_mvp_player_id_fkey" FOREIGN KEY ("mvp_player_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."league_matches"
    ADD CONSTRAINT "league_matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."league_matches"
    ADD CONSTRAINT "league_matches_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_matches"
    ADD CONSTRAINT "league_matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."league_matches"
    ADD CONSTRAINT "league_matches_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_resources"
    ADD CONSTRAINT "league_resources_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_resources"
    ADD CONSTRAINT "league_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activity_types"("id");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_lineups"
    ADD CONSTRAINT "match_lineups_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_lineups"
    ADD CONSTRAINT "match_lineups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_players"
    ADD CONSTRAINT "match_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mvp_votes"
    ADD CONSTRAINT "mvp_votes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mvp_votes"
    ADD CONSTRAINT "mvp_votes_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mvp_votes"
    ADD CONSTRAINT "mvp_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."otp_verifications"
    ADD CONSTRAINT "otp_verifications_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."otp_verifications"
    ADD CONSTRAINT "otp_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_checkouts"
    ADD CONSTRAINT "pending_checkouts_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_checkouts"
    ADD CONSTRAINT "pending_checkouts_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_booking_groups"
    ADD CONSTRAINT "recurring_booking_groups_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_booking_groups"
    ADD CONSTRAINT "recurring_booking_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_activities"
    ADD CONSTRAINT "resource_activities_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_activities"
    ADD CONSTRAINT "resource_activities_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_bookings"
    ADD CONSTRAINT "resource_bookings_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_bookings"
    ADD CONSTRAINT "resource_bookings_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_bookings"
    ADD CONSTRAINT "resource_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "public"."resource_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waiver_signatures"
    ADD CONSTRAINT "waiver_signatures_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waiver_signatures"
    ADD CONSTRAINT "waiver_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Activity Types are viewable by everyone" ON "public"."activity_types" FOR SELECT USING (true);



CREATE POLICY "Admins and Master Admins can delete games" ON "public"."games" FOR DELETE USING ("public"."is_admin_or_master"());



CREATE POLICY "Admins and Master Admins can delete matches" ON "public"."matches" FOR DELETE USING ("public"."is_admin_or_master"());



CREATE POLICY "Admins and Master Admins can insert games" ON "public"."games" FOR INSERT WITH CHECK ("public"."is_admin_or_master"());



CREATE POLICY "Admins and Master Admins can insert matches" ON "public"."matches" FOR INSERT WITH CHECK ("public"."is_admin_or_master"());



CREATE POLICY "Admins and Master Admins can update bookings" ON "public"."bookings" FOR UPDATE USING ("public"."is_admin_or_master"());



CREATE POLICY "Admins and Master Admins can update games" ON "public"."games" FOR UPDATE USING ("public"."is_admin_or_master"());



CREATE POLICY "Admins and Master Admins can update matches" ON "public"."matches" FOR UPDATE USING ("public"."is_admin_or_master"());



CREATE POLICY "Admins and Master Admins can view all bookings" ON "public"."bookings" FOR SELECT USING ("public"."is_admin_or_master"());



CREATE POLICY "Admins can insert games" ON "public"."games" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can manage match players" ON "public"."match_players" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admins can manage matches" ON "public"."matches" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage site content" ON "public"."site_content" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'master_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'master_admin'::"text"]))))));



CREATE POLICY "Admins can update bookings" ON "public"."bookings" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can view all bookings" ON "public"."bookings" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins have full access to attendance" ON "public"."game_attendance" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'host'::"text")))));



CREATE POLICY "Admins only access logs" ON "public"."security_logs" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'master_admin'::"text"))));



CREATE POLICY "Allow all access to master_admin and super_admin" ON "public"."system_settings" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'master_admin'::"text") OR (( SELECT "profiles"."system_role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'super_admin'::"text"))) WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'master_admin'::"text") OR (( SELECT "profiles"."system_role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'super_admin'::"text")));



CREATE POLICY "Allow read access to authenticated users" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can read active promo codes" ON "public"."promo_codes" FOR SELECT USING (true);



CREATE POLICY "Anyone can view league_resources" ON "public"."league_resources" FOR SELECT USING (true);



CREATE POLICY "Anyone can view platform settings" ON "public"."platform_settings" FOR SELECT USING (true);



CREATE POLICY "Anyone can view resource_bookings" ON "public"."resource_bookings" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create teams" ON "public"."teams" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert games" ON "public"."games" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can request bookings" ON "public"."resource_bookings" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'pending_facility_review'::"text")));



CREATE POLICY "Authenticated users can update games" ON "public"."games" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view all bookings" ON "public"."bookings" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Captains can draft free agents" ON "public"."tournament_registrations" FOR UPDATE USING (("public"."is_team_captain"("team_id") OR ("user_id" = "auth"."uid"()))) WITH CHECK (("public"."is_team_captain"("team_id") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Captains can manage their team rosters" ON "public"."team_players" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_players"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Captains can manage their teams" ON "public"."teams" FOR UPDATE USING (("captain_id" = "auth"."uid"()));



CREATE POLICY "Captains can remove players from their roster" ON "public"."booking_rosters" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."resource_bookings" "rb"
  WHERE (("rb"."id" = "booking_rosters"."booking_group_id") AND ("rb"."renter_name" = ( SELECT "profiles"."full_name"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))) OR (EXISTS ( SELECT 1
   FROM "public"."recurring_booking_groups" "rbg"
  WHERE (("rbg"."id" = "booking_rosters"."booking_group_id") AND ("rbg"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Captains can view their own booking rosters" ON "public"."booking_rosters" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."resource_bookings" "rb"
  WHERE (("rb"."id" = "booking_rosters"."booking_group_id") AND ("rb"."renter_name" = ( SELECT "profiles"."full_name"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))) OR (EXISTS ( SELECT 1
   FROM "public"."recurring_booking_groups" "rbg"
  WHERE (("rbg"."id" = "booking_rosters"."booking_group_id") AND ("rbg"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Captains have full control over their team's lineups" ON "public"."match_lineups" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "match_lineups"."team_id") AND ("teams"."captain_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "match_lineups"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Deny deletes to platform settings" ON "public"."platform_settings" FOR DELETE USING (false);



CREATE POLICY "Deny deletes to waiver signatures" ON "public"."waiver_signatures" FOR DELETE USING (false);



CREATE POLICY "Deny inserts to platform settings" ON "public"."platform_settings" FOR INSERT WITH CHECK (false);



CREATE POLICY "Deny updates to waiver signatures" ON "public"."waiver_signatures" FOR UPDATE USING (false);



CREATE POLICY "Enable delete for game admins" ON "public"."games" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Enable delete for users and game admins" ON "public"."bookings" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() IN ( SELECT "games"."admin_id"
   FROM "public"."games"
  WHERE ("games"."id" = "bookings"."game_id")))));



CREATE POLICY "Enable insert for authenticated users only with matching id" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable insert for participants" ON "public"."mvp_votes" FOR INSERT WITH CHECK ((("auth"."uid"() = "voter_id") AND (EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."game_id" = "mvp_votes"."game_id") AND ("bookings"."user_id" = "auth"."uid"()) AND ("bookings"."status" = ANY (ARRAY['active'::"text", 'paid'::"text"])))))));



CREATE POLICY "Enable insert for users matching user_id" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for users with matching admin_id" ON "public"."games" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "admin_id"));



CREATE POLICY "Enable read access for all authenticated users" ON "public"."bookings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."games" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable select for voters and admins" ON "public"."mvp_votes" FOR SELECT USING ((("auth"."uid"() = "voter_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'master_admin'::"text"])))))));



CREATE POLICY "Enable update for game admins" ON "public"."games" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "admin_id")) WITH CHECK (("auth"."uid"() = "admin_id"));



CREATE POLICY "Enable update for users and game admins" ON "public"."bookings" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() IN ( SELECT "games"."admin_id"
   FROM "public"."games"
  WHERE ("games"."id" = "bookings"."game_id"))))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."uid"() IN ( SELECT "games"."admin_id"
   FROM "public"."games"
  WHERE ("games"."id" = "bookings"."game_id")))));



CREATE POLICY "Enable update for users based on id" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Facilities are viewable by everyone." ON "public"."facilities" FOR SELECT USING (true);



CREATE POLICY "Facility Activities are viewable by everyone." ON "public"."facility_activities" FOR SELECT USING (true);



CREATE POLICY "Facility Admins can manage their activated activities." ON "public"."facility_activities" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."system_role" = 'super_admin'::"text") OR (("profiles"."system_role" = 'facility_admin'::"text") AND ("profiles"."facility_id" = "facility_activities"."facility_id")))))));



CREATE POLICY "Facility Admins can manage their resource activities." ON "public"."resource_activities" USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."resources" ON (("resources"."id" = "resource_activities"."resource_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."system_role" = 'super_admin'::"text") OR (("profiles"."system_role" = 'facility_admin'::"text") AND ("profiles"."facility_id" = "resources"."facility_id")))))));



CREATE POLICY "Facility Admins have full access to their resource_bookings" ON "public"."resource_bookings" USING (("facility_id" IN ( SELECT "profiles"."facility_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Facility admins can manage activity types" ON "public"."activity_types" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."system_role" = 'super_admin'::"text") OR ("profiles"."role" = 'master_admin'::"text") OR (("profiles"."system_role" = 'facility_admin'::"text") AND ("profiles"."facility_id" = "activity_types"."facility_id")))))));



CREATE POLICY "Facility admins can manage all teams in their facility" ON "public"."teams" USING (((EXISTS ( SELECT 1
   FROM ("public"."leagues" "l"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("l"."id" = "teams"."league_id") AND (("p"."system_role" = 'super_admin'::"text") OR ("p"."role" = 'master_admin'::"text") OR (("p"."system_role" = 'facility_admin'::"text") AND ("p"."facility_id" = "l"."facility_id")))))) OR (EXISTS ( SELECT 1
   FROM (("public"."games" "g"
     JOIN "public"."facilities" "f" ON (("f"."id" = "g"."facility_id")))
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("g"."id" = "teams"."game_id") AND (("p"."system_role" = 'super_admin'::"text") OR ("p"."role" = 'master_admin'::"text") OR (("p"."system_role" = 'facility_admin'::"text") AND ("p"."facility_id" = "f"."id"))))))));



CREATE POLICY "Facility admins can manage league matches" ON "public"."league_matches" USING ((EXISTS ( SELECT 1
   FROM ("public"."leagues" "l"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("l"."id" = "league_matches"."league_id") AND (("p"."system_role" = 'super_admin'::"text") OR ("p"."role" = 'master_admin'::"text") OR (("p"."system_role" = 'facility_admin'::"text") AND ("p"."facility_id" = "l"."facility_id")))))));



CREATE POLICY "Facility admins can manage leagues" ON "public"."leagues" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."system_role" = 'super_admin'::"text") OR ("profiles"."role" = 'master_admin'::"text") OR (("profiles"."system_role" = 'facility_admin'::"text") AND ("profiles"."facility_id" = "leagues"."facility_id")))))));



CREATE POLICY "Facility admins can manage tournament registrations" ON "public"."tournament_registrations" USING (((EXISTS ( SELECT 1
   FROM ("public"."leagues" "l"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("l"."id" = "tournament_registrations"."league_id") AND (("p"."system_role" = 'super_admin'::"text") OR ("p"."role" = 'master_admin'::"text") OR (("p"."system_role" = 'facility_admin'::"text") AND ("p"."facility_id" = "l"."facility_id")))))) OR (EXISTS ( SELECT 1
   FROM (("public"."games" "g"
     JOIN "public"."facilities" "f" ON (("f"."id" = "g"."facility_id")))
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("g"."id" = "tournament_registrations"."game_id") AND (("p"."system_role" = 'super_admin'::"text") OR ("p"."role" = 'master_admin'::"text") OR (("p"."system_role" = 'facility_admin'::"text") AND ("p"."facility_id" = "f"."id"))))))));



CREATE POLICY "Facility admins can view all rosters for their facility" ON "public"."booking_rosters" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."system_role" = 'facility_admin'::"text") AND ((EXISTS ( SELECT 1
           FROM "public"."resource_bookings" "rb"
          WHERE (("rb"."id" = "booking_rosters"."booking_group_id") AND ("rb"."facility_id" = "p"."facility_id")))) OR (EXISTS ( SELECT 1
           FROM "public"."recurring_booking_groups" "rbg"
          WHERE (("rbg"."id" = "booking_rosters"."booking_group_id") AND ("rbg"."facility_id" = "p"."facility_id")))))))));



CREATE POLICY "Facility admins can view facility signatures" ON "public"."waiver_signatures" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."facility_id" = "waiver_signatures"."facility_id")))));



CREATE POLICY "Facility admins can view groups for their facility" ON "public"."recurring_booking_groups" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."facility_id" = "recurring_booking_groups"."facility_id") AND ("p"."system_role" = 'facility_admin'::"text")))));



CREATE POLICY "Facility admins manage their promo codes" ON "public"."promo_codes" USING (("facility_id" IN ( SELECT "profiles"."facility_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."system_role" = 'facility_admin'::"text") AND ("profiles"."facility_id" IS NOT NULL)))));



CREATE POLICY "Games are viewable by everyone" ON "public"."games" FOR SELECT USING (true);



CREATE POLICY "Hosts can manage check-ins" ON "public"."event_check_ins" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = ANY (ARRAY['admin'::"text", 'host'::"text", 'master_admin'::"text"])) OR ("profiles"."system_role" = 'super_admin'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."games"
  WHERE (("games"."id" = "event_check_ins"."event_id") AND ("auth"."uid"() = ANY ("games"."host_ids")))))));



CREATE POLICY "Hosts can manage event identities" ON "public"."event_identities" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = ANY (ARRAY['admin'::"text", 'host'::"text", 'master_admin'::"text"])) OR ("profiles"."system_role" = 'super_admin'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."games"
  WHERE (("games"."id" = "event_identities"."event_id") AND ("auth"."uid"() = ANY ("games"."host_ids")))))));



CREATE POLICY "Hosts can view all check-ins" ON "public"."event_check_ins" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = ANY (ARRAY['admin'::"text", 'host'::"text", 'master_admin'::"text"])) OR ("profiles"."system_role" = 'super_admin'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."games"
  WHERE (("games"."id" = "event_check_ins"."event_id") AND ("auth"."uid"() = ANY ("games"."host_ids")))))));



CREATE POLICY "Hosts can view event identities" ON "public"."event_identities" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = ANY (ARRAY['admin'::"text", 'host'::"text", 'master_admin'::"text"])) OR ("profiles"."system_role" = 'super_admin'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."games"
  WHERE (("games"."id" = "event_identities"."event_id") AND ("auth"."uid"() = ANY ("games"."host_ids")))))));



CREATE POLICY "Insert messages policy" ON "public"."messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."tournament_registrations" "tr"
  WHERE (("tr"."team_id" = "messages"."team_id") AND ("tr"."user_id" = "auth"."uid"()) AND ("tr"."status" = ANY (ARRAY['paid'::"text", 'confirmed'::"text", 'registered'::"text", 'drafted'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "messages"."team_id") AND ("t"."captain_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."system_role" = 'super_admin'::"text") OR ("p"."role" = 'master_admin'::"text")))))));



CREATE POLICY "League matches are viewable by everyone" ON "public"."league_matches" FOR SELECT USING (true);



CREATE POLICY "Leagues are viewable by everyone" ON "public"."leagues" FOR SELECT USING (true);



CREATE POLICY "Lineups are viewable by all authenticated users" ON "public"."match_lineups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Master Admins can manage OTPs" ON "public"."otp_verifications" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'master_admin'::"text")))));



CREATE POLICY "Master Admins can update any profile" ON "public"."profiles" FOR UPDATE USING ("public"."is_master_admin"());



CREATE POLICY "Master Admins can view all credit transactions" ON "public"."credit_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'master_admin'::"text")))));



CREATE POLICY "Master admins can view all signatures" ON "public"."waiver_signatures" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."system_role" = 'super_admin'::"text") OR ("profiles"."role" = 'master_admin'::"text"))))));



CREATE POLICY "Match players are viewable by everyone" ON "public"."match_players" FOR SELECT USING (true);



CREATE POLICY "Only Super/Master Admins can manage resource types" ON "public"."resource_types" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."system_role" = 'super_admin'::"text") OR ("profiles"."role" = 'master_admin'::"text"))))));



CREATE POLICY "Players can manage own attendance" ON "public"."game_attendance" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Public can view games" ON "public"."games" FOR SELECT USING (true);



CREATE POLICY "Public can view matches" ON "public"."matches" FOR SELECT USING (true);



CREATE POLICY "Public can view site content" ON "public"."site_content" FOR SELECT USING (true);



CREATE POLICY "Resource Activities are viewable by everyone." ON "public"."resource_activities" FOR SELECT USING (true);



CREATE POLICY "Resource Types are viewable by everyone" ON "public"."resource_types" FOR SELECT USING (true);



CREATE POLICY "Resources are viewable by everyone." ON "public"."resources" FOR SELECT USING (true);



CREATE POLICY "Select messages policy" ON "public"."messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."tournament_registrations" "tr"
  WHERE (("tr"."team_id" = "messages"."team_id") AND ("tr"."user_id" = "auth"."uid"()) AND ("tr"."status" = ANY (ARRAY['paid'::"text", 'confirmed'::"text", 'registered'::"text", 'drafted'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "messages"."team_id") AND ("t"."captain_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."system_role" = 'super_admin'::"text") OR ("p"."role" = 'master_admin'::"text")))))));



CREATE POLICY "Service roles can insert notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Super Admins can update platform settings" ON "public"."platform_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."system_role" = 'super_admin'::"text") OR ("profiles"."role" = 'master_admin'::"text"))))));



CREATE POLICY "Super Admins have full access to resource_bookings" ON "public"."resource_bookings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."system_role" = 'super_admin'::"text") OR ("profiles"."role" = 'master_admin'::"text"))))));



CREATE POLICY "Super admins can view all groups" ON "public"."recurring_booking_groups" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."system_role" = 'super_admin'::"text") OR ("p"."role" = 'master_admin'::"text"))))));



CREATE POLICY "Super admins can view all rosters" ON "public"."booking_rosters" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."system_role" = 'super_admin'::"text") OR ("p"."role" = 'master_admin'::"text"))))));



CREATE POLICY "Super and Facility Admins have full access to league_resources" ON "public"."league_resources" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."system_role" = ANY (ARRAY['super_admin'::"text", 'facility_admin'::"text"])) OR ("profiles"."role" = 'master_admin'::"text"))))));



CREATE POLICY "Super and master admins can manage global promo codes" ON "public"."promo_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."system_role" = 'super_admin'::"text") OR ("profiles"."role" = 'master_admin'::"text"))))));



CREATE POLICY "Team rosters are viewable by everyone" ON "public"."team_players" FOR SELECT USING (true);



CREATE POLICY "Team visibility for attendance" ON "public"."game_attendance" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "game_attendance"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."tournament_registrations"
  WHERE (("tournament_registrations"."team_id" = "game_attendance"."team_id") AND ("tournament_registrations"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Teams are viewable by everyone" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Tournament registrations are viewable by everyone" ON "public"."tournament_registrations" FOR SELECT USING (true);



CREATE POLICY "Users can create their own pending checkouts" ON "public"."pending_checkouts" FOR INSERT WITH CHECK (("auth"."uid"() = "buyer_id"));



CREATE POLICY "Users can join a roster" ON "public"."booking_rosters" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can join games" ON "public"."bookings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave a roster" ON "public"."booking_rosters" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own roster requests" ON "public"."team_players" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own tournament registrations" ON "public"."tournament_registrations" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can sign waivers" ON "public"."waiver_signatures" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own bookings" ON "public"."bookings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own check-ins" ON "public"."event_check_ins" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own event identities" ON "public"."event_identities" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own waiver signatures" ON "public"."waiver_signatures" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view rosters they are on" ON "public"."booking_rosters" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own groups" ON "public"."recurring_booking_groups" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own pending checkouts" ON "public"."pending_checkouts" FOR SELECT USING (("auth"."uid"() = "buyer_id"));



ALTER TABLE "public"."activity_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_rosters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_check_ins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_identities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facility_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leagues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_lineups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mvp_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."otp_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_checkouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_booking_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waiver_signatures" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."games";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."matches";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."mvp_votes";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_path" "text", "p_max_reqs" integer, "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_path" "text", "p_max_reqs" integer, "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_path" "text", "p_max_reqs" integer, "p_window_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_security_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_security_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_security_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_bookings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_bookings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_bookings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_master"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_master"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_master"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_master_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_master_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_master_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_captain"("check_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_captain"("check_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_captain"("check_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_current_players_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_current_players_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_current_players_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tournament_players_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tournament_players_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tournament_players_count"() TO "service_role";


















GRANT ALL ON TABLE "public"."activity_types" TO "anon";
GRANT ALL ON TABLE "public"."activity_types" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_types" TO "service_role";



GRANT ALL ON TABLE "public"."booking_rosters" TO "anon";
GRANT ALL ON TABLE "public"."booking_rosters" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_rosters" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."credit_transactions" TO "anon";
GRANT ALL ON TABLE "public"."credit_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."event_check_ins" TO "anon";
GRANT ALL ON TABLE "public"."event_check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."event_check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."event_identities" TO "anon";
GRANT ALL ON TABLE "public"."event_identities" TO "authenticated";
GRANT ALL ON TABLE "public"."event_identities" TO "service_role";



GRANT ALL ON TABLE "public"."facilities" TO "anon";
GRANT ALL ON TABLE "public"."facilities" TO "authenticated";
GRANT ALL ON TABLE "public"."facilities" TO "service_role";



GRANT ALL ON TABLE "public"."facility_activities" TO "anon";
GRANT ALL ON TABLE "public"."facility_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_activities" TO "service_role";



GRANT ALL ON TABLE "public"."game_attendance" TO "anon";
GRANT ALL ON TABLE "public"."game_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."game_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";



GRANT ALL ON TABLE "public"."league_matches" TO "anon";
GRANT ALL ON TABLE "public"."league_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."league_matches" TO "service_role";



GRANT ALL ON TABLE "public"."league_resources" TO "anon";
GRANT ALL ON TABLE "public"."league_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."league_resources" TO "service_role";



GRANT ALL ON TABLE "public"."leagues" TO "anon";
GRANT ALL ON TABLE "public"."leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."leagues" TO "service_role";



GRANT ALL ON TABLE "public"."match_lineups" TO "anon";
GRANT ALL ON TABLE "public"."match_lineups" TO "authenticated";
GRANT ALL ON TABLE "public"."match_lineups" TO "service_role";



GRANT ALL ON TABLE "public"."match_players" TO "anon";
GRANT ALL ON TABLE "public"."match_players" TO "authenticated";
GRANT ALL ON TABLE "public"."match_players" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."mvp_votes" TO "anon";
GRANT ALL ON TABLE "public"."mvp_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."mvp_votes" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."otp_verifications" TO "anon";
GRANT ALL ON TABLE "public"."otp_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."otp_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."pending_checkouts" TO "anon";
GRANT ALL ON TABLE "public"."pending_checkouts" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_checkouts" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."player_stats" TO "anon";
GRANT ALL ON TABLE "public"."player_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."player_stats" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_booking_groups" TO "anon";
GRANT ALL ON TABLE "public"."recurring_booking_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_booking_groups" TO "service_role";



GRANT ALL ON TABLE "public"."resource_activities" TO "anon";
GRANT ALL ON TABLE "public"."resource_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_activities" TO "service_role";



GRANT ALL ON TABLE "public"."resource_bookings" TO "anon";
GRANT ALL ON TABLE "public"."resource_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."resource_types" TO "anon";
GRANT ALL ON TABLE "public"."resource_types" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_types" TO "service_role";



GRANT ALL ON TABLE "public"."resources" TO "anon";
GRANT ALL ON TABLE "public"."resources" TO "authenticated";
GRANT ALL ON TABLE "public"."resources" TO "service_role";



GRANT ALL ON TABLE "public"."security_logs" TO "anon";
GRANT ALL ON TABLE "public"."security_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."security_logs" TO "service_role";



GRANT ALL ON TABLE "public"."site_content" TO "anon";
GRANT ALL ON TABLE "public"."site_content" TO "authenticated";
GRANT ALL ON TABLE "public"."site_content" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."team_players" TO "anon";
GRANT ALL ON TABLE "public"."team_players" TO "authenticated";
GRANT ALL ON TABLE "public"."team_players" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_registrations" TO "anon";
GRANT ALL ON TABLE "public"."tournament_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."waiver_signatures" TO "anon";
GRANT ALL ON TABLE "public"."waiver_signatures" TO "authenticated";
GRANT ALL ON TABLE "public"."waiver_signatures" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































