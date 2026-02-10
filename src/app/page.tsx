
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { GameCard } from '@/components/GameCard';

// Define the Game interface matching the Supabase schema
interface Game {
  id: string;
  title: string;
  location: string;
  start_time: string;
  end_time: string | null;
  price: number;
  max_players: number;
  current_players: number;
  surface_type: string;
  status: string;
}

export const revalidate = 0; // Ensure fresh data on every request

export default async function Home() {
  const supabase = await createClient();

  // Fetch games from Supabase
  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .neq('status', 'cancelled') // Hide Cancelled Games from Feed
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching games:', error);
  }

  // Fetch current user for the GameCard logic
  const { data: { user } } = await supabase.auth.getUser();

  const bookingStatusMap = new Map<string, string>();
  if (user) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('game_id, status')
      .eq('user_id', user.id)
      .neq('status', 'cancelled');

    if (bookings) {
      bookings.forEach((b: any) => bookingStatusMap.set(b.game_id, b.status));
    }
  }

  return (
    // 'bg-pitch-black' sets the deep charcoal background (#0a0a0a)
    // 'text-white' ensures high contrast for primary text
    // 'font-sans' applies the Inter font for readability
    <div className="min-h-screen bg-pitch-black text-white font-sans selection:bg-pitch-accent selection:text-pitch-black">

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 min-h-[90vh] flex flex-col items-center justify-center text-center overflow-hidden">

        {/* Decorative Background Element */}
        {/* 'bg-pitch-accent/10' creates a subtle neon glow behind the text without overpowering it */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pitch-accent/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-widest text-pitch-accent mb-4">
            <span className="w-2 h-2 rounded-full bg-pitch-accent animate-pulse" />
            Live in NW Chicago Suburbs
          </div>

          {/* H1 Heading */}
          {/* 'font-heading' applies Oswald font */}
          {/* 'text-7xl md:text-9xl' creates massive scale for impact */}
          {/* 'uppercase italic' adds to the sports aesthetic */}
          <h1 className="font-heading text-7xl md:text-9xl font-bold uppercase italic leading-[0.9] tracking-tighter">
            FIND YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-pitch-accent to-white">GAME.</span> <br />
            OWN THE <span className="text-pitch-accent">PITCH.</span>
          </h1>

          {/* Subtitle */}
          {/* 'text-pitch-secondary' applies the light gray (#a3a3a3) for hierarchy */}
          {/* 'text-xl' ensures readability */}
          <p className="text-xl md:text-2xl text-pitch-secondary max-w-2xl mx-auto font-medium">
            The premier pickup soccer network in Northwest Chicago.
          </p>

          {/* CTA Button */}
          {/* 'bg-pitch-accent' gives the button the "Electric Volt" neon color */}
          {/* 'text-pitch-black' provides maximum contrast against the neon background */}
          {/* 'rounded-sm' keeps the corners sharp and professional */}
          <div className="pt-8">
            <Link
              href="/games"
              className="group relative inline-flex items-center justify-center px-10 py-5 bg-pitch-accent text-pitch-black text-lg md:text-xl font-black uppercase tracking-wider rounded-sm hover:bg-white transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(204,255,0,0.4)]"
            >
              Find Games Now
              <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Games Preview */}
      <section className="py-20 px-6 bg-pitch-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
            <h2 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter">
              Upcoming <span className="text-pitch-accent">Matches</span>
            </h2>
            <Link href="/games" className="hidden md:flex items-center gap-2 text-pitch-accent font-bold uppercase tracking-wider hover:text-white transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {!games || games.length === 0 ? (
            <div className="text-center py-12 border border-white/5 rounded-sm bg-pitch-card">
              <p className="text-xl text-pitch-secondary font-bold">No games scheduled yet.</p>
              <p className="text-sm text-gray-500 mt-2">Check back soon for upcoming matches.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {games.map((game: Game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  user={user}
                  bookingStatus={bookingStatusMap.get(game.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
