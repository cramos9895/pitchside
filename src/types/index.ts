import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type Facility = Database['public']['Tables']['facilities']['Row'];
export type League = Database['public']['Tables']['leagues']['Row'];

// Insert & Update Types
export type GameUpdate = Database['public']['Tables']['games']['Update'];
export type BookingUpdate = Database['public']['Tables']['bookings']['Update'];
export type MatchUpdate = Database['public']['Tables']['matches']['Update'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Common Custom Types used across components
export interface TeamConfig {
    name: string;
    color: string;
    limit?: number;
    score?: number;
}

// --- Extended UI Types ---

export interface MatchWithTeams extends Match {
    home_team_obj?: Team;
    away_team_obj?: Team;
}

export interface GameWithPayments extends Omit<Game, "cash_amount" | "strict_waiver_required" | "waiver_details" | "payment_collection_type" | "player_registration_fee" | "cash_fee_structure"> {
    payment_collection_type?: string | null;
    player_registration_fee?: number | null;
    cash_fee_structure?: string | null;
    cash_amount?: number | null;
    strict_waiver_required?: boolean | null;
    waiver_details?: string | null;
}

export interface ProfileWithUI extends Omit<Profile, "first_name" | "last_name" | "free_game_credits"> {
    first_name?: string | null;
    last_name?: string | null;
    free_game_credits?: number | null;
}

export interface OperationsCheckInGame {
    id: string;
    recurring_group_id?: string;
    title?: string;
    start_time?: string;
    resource?: string;
}

export interface ProfileWithTeam extends Profile {
    team?: string;
    name?: string;
}

