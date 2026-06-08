// 🏗️ Architecture: [[Home Page.md]]
import Link from 'next/link';
import { ArrowRight, Star, Quote, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PickupCard } from '@/components/public/pickup/PickupCard';
import { TournamentCard } from '@/components/public/tournaments/TournamentCard';
import { LeagueCard } from '@/components/public/leagues/LeagueCard';
import { RollingLeagueCard } from '@/components/public/RollingLeagueCard';
import { ReviewMarquee } from '@/components/public/ReviewMarquee';

// Define the Game interface matching the Supabase schema
interface Game {
    id: string;
    title: string;
    location_name?: string;
    location: string;
    location_nickname?: string;
    game_format?: string;
    start_time: string;
    end_time: string | null;
    price: number;
    max_players: number;
    max_teams: number | null;
    current_players: number;
    surface_type: string;
    facility_id?: string | null;
    resource_id?: string | null;
    status: string;
    has_mvp_reward?: boolean;
    match_style?: string;
    event_type?: string;
    is_league?: boolean;
    team_price: number | null;
    free_agent_price: number | null;
    prize_pool_percentage: number | null;
    fixed_prize_amount: number | null;
    reward: string | null;
    prize_type: string | null;
    tournament_style: string | null;
    roster_lock_date: string | null;
    regular_season_start: string | null;
    playoff_start_date: string | null;

    // Architecture Columns
    league_format?: 'structured' | 'rolling';
    payment_collection_type?: 'stripe' | 'cash';
}

export const revalidate = 0; // Ensure fresh data on every request

export default async function Home() {
  const supabase = await createClient();

  // Fetch Site Content
  const { data: content } = await supabase
    .from('site_content')
    .select('*')
    .eq('id', 1)
    .single();

  const siteContent = content || {
    hero_headline: 'FIND YOUR GAME. OWN THE PITCH.',
    hero_subtext: 'The premier pickup soccer network in Northwest Chicago.',
    hero_image_url: null,
    how_it_works_image_url: null,
    testimonial_text: 'Pitch Side completely changed my Thursdays. The games are organized, competitive, and super easy to join.'
  };

  // Fetch current user first to filter out joined games
  const { data: { user } } = await supabase.auth.getUser();

  let joinedGameIds: string[] = [];
  const bookingStatusMap = new Map<string, string>();
  const bookingIdMap = new Map<string, string>();
  const userRegistrationsMap = new Map<string, any[]>();

  if (user) {
    const [bookingsRes, regsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, game_id, status')
        .eq('user_id', user.id)
        .neq('status', 'cancelled'),
      supabase
        .from('tournament_registrations')
        .select('game_id, role, team_id, user_id, status, teams(id, name, captain_id)')
        .eq('user_id', user.id)
    ]);

    if (bookingsRes.data) {
      bookingsRes.data.forEach((b: any) => {
        bookingStatusMap.set(b.game_id, b.status);
        bookingIdMap.set(b.game_id, b.id);
      });
    }

    if (regsRes.data) {
      regsRes.data.forEach((r: any) => {
        if (r.game_id) {
          if (!userRegistrationsMap.has(r.game_id)) {
            userRegistrationsMap.set(r.game_id, []);
          }
          userRegistrationsMap.get(r.game_id)!.push(r);
        }
      });
    }
  }

  // Fetch upcoming games not joined by user
  let query = supabase
    .from('games')
    .select('*')
    .eq('is_active', true)
    .neq('status', 'cancelled')
    .gt('start_time', new Date().toISOString()) // Only future games
    .order('start_time', { ascending: true })
    .limit(3);

  const { data: games, error } = await query;

  if (error) {
    console.error('Error fetching games:', error);
  }

  return (
    <div className="min-h-screen bg-pitch-black text-white font-sans selection:bg-pitch-accent selection:text-pitch-black pb-20">

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-12 md:pb-20 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pitch-accent/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-widest text-pitch-accent mb-4">
            Live in NW Chicago Suburbs
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold uppercase italic leading-[0.9] tracking-tighter">
            {siteContent.hero_headline}
          </h1>

          <p className="text-xl md:text-2xl text-pitch-secondary max-w-2xl mx-auto font-medium">
            {siteContent.hero_subtext}
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <Link href="/schedule" className="px-8 py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-widest hover:bg-white transition-colors rounded-sm text-lg">
              Find a Game
            </Link>
          </div>
        </div>

        {/* Dynamic Hero Image */}
        {siteContent.hero_image_url && (
          <div className="relative z-10 w-full max-w-5xl mx-auto mt-16 rounded-sm overflow-hidden border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="aspect-[21/9] w-full bg-gray-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={siteContent.hero_image_url} alt="Hero Event" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
            </div>
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-pitch-black to-transparent" />
          </div>
        )}
      </section>

      {/* Featured Games Preview */}
      <section className="pt-8 pb-12 md:pb-20 px-6 bg-pitch-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter">
              Events & <span className="text-pitch-accent">Matches</span>
            </h2>
            <Link href="/schedule" className="px-5 py-2.5 bg-pitch-accent text-pitch-black text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-white transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.2)] group">
              View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {!games || games.length === 0 ? (
            <div className="text-center py-12 border border-white/5 rounded-sm bg-pitch-card">
              <p className="text-xl text-pitch-secondary font-bold">No games scheduled yet.</p>
              <p className="text-sm text-gray-500 mt-2">Check back soon for upcoming matches.</p>
            </div>
          ) : (
            <div className="flex overflow-x-auto -mx-6 px-6 gap-6 md:grid md:grid-cols-3 md:pb-0 md:mx-0 md:px-0 scrollbar-hide snap-x snap-mandatory items-stretch">
              {games.map((game: any) => {
                const registrations = userRegistrationsMap.get(game.id) || [];

                return (
                  <div key={game.id} className="min-w-[85vw] md:min-w-0 snap-center flex flex-col h-full">
                    {game.event_type === 'pickup' || game.event_type === 'standard' ? (
                      <PickupCard
                        game={game}
                        user={user}
                        bookingStatus={bookingStatusMap.get(game.id)}
                        bookingId={bookingIdMap.get(game.id)}
                      />
                    ) : game.event_type === 'tournament' ? (
                      <TournamentCard
                        tournament={game}
                        userId={user?.id}
                        registrations={registrations}
                      />
                    ) : game.event_type === 'league' ? (
                      game.league_format === 'rolling' ? (
                        <RollingLeagueCard
                          league={game}
                          userId={user?.id}
                          registrations={registrations}
                        />
                      ) : (
                        <LeagueCard
                          league={game}
                          userId={user?.id}
                          registrations={registrations}
                        />
                      )
                    ) : (
                      <PickupCard
                        game={game}
                        user={user}
                        bookingStatus={bookingStatusMap.get(game.id)}
                        bookingId={bookingIdMap.get(game.id)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 3-Step How It Works Section */}
      <section className="pt-8 pb-12 md:pb-20 px-6 bg-black/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter text-white">
              Show Up & <span className="text-pitch-accent">Ball Out.</span>
            </h2>
            <p className="text-pitch-secondary mt-4 text-lg">Zero long-term commitments. Pure football.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Steps */}
            <div className="space-y-6 md:space-y-8">
              {[
                { num: '01', title: 'Find a Match', desc: 'Browse our live schedule of local games.' },
                { num: '02', title: 'Secure Your Spot', desc: 'RSVP in seconds and pay online or at the field.' },
                { num: '03', title: 'Play to Win', desc: 'We bring the bibs and balls. You bring the heat.' }
              ].map((step, idx) => (
                <div key={idx} className="flex gap-4 md:gap-6 group">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded bg-white/5 border border-white/10 flex items-center justify-center font-heading text-2xl md:text-3xl font-black italic text-pitch-accent group-hover:bg-pitch-accent group-hover:text-black transition-colors shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold uppercase italic text-white mb-1 md:mb-2">{step.title}</h3>
                    <p className="text-pitch-secondary text-base md:text-lg">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Instructional Graphic */}
            <div className="relative aspect-square md:aspect-video lg:aspect-square bg-pitch-card rounded-sm border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
              {siteContent.how_it_works_image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={siteContent.how_it_works_image_url} alt="How It Works" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-8">
                  <CheckCircle2 className="w-16 h-16 text-pitch-accent mx-auto mb-4 opacity-50" />
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Automated Booking Pipeline</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <ReviewMarquee />

    </div>
  );
}
