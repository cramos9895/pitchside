import Link from 'next/link';
import { ArrowRight, Star, Quote, CheckCircle2 } from 'lucide-react';
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
  facility_id?: string | null;
  resource_id?: string | null;
  status: string;
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

  if (user) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('game_id, status')
      .eq('user_id', user.id)
      .neq('status', 'cancelled');

    if (bookings) {
      bookings.forEach((b: any) => {
        joinedGameIds.push(b.game_id);
        bookingStatusMap.set(b.game_id, b.status);
      });
    }
  }

  // Fetch upcoming games not joined by user
  let query = supabase
    .from('games')
    .select('*')
    .neq('status', 'cancelled')
    .gt('start_time', new Date().toISOString()) // Only future games
    .order('start_time', { ascending: true })
    .limit(3);

  const { data: games, error } = await query;

  if (error) {
    console.error('Error fetching games:', error);
  }

  return (
    <div className="min-h-screen bg-pitch-black text-white font-sans selection:bg-pitch-accent selection:text-pitch-black pt-32 pb-20">

      {/* Hero Section */}
      <section className="relative px-6 min-h-[70vh] flex flex-col items-center justify-center text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pitch-accent/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-widest text-pitch-accent mb-4">
            <span className="w-2 h-2 rounded-full bg-pitch-accent animate-pulse" />
            Live in NW Chicago Suburbs
          </div>

          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold uppercase italic leading-[0.9] tracking-tighter">
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

      {/* 3-Step How It Works Section */}
      <section className="py-24 px-6 bg-black/50 border-y border-white/5 mt-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter text-white">
              Show Up & <span className="text-pitch-accent">Ball Out.</span>
            </h2>
            <p className="text-pitch-secondary mt-4 text-lg">Zero long-term commitments. Pure football.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Steps */}
            <div className="space-y-8">
              {[
                { num: '01', title: 'Find a Match', desc: 'Browse our live schedule of local games.' },
                { num: '02', title: 'Secure Your Spot', desc: 'RSVP in seconds and pay online or at the field.' },
                { num: '03', title: 'Play to Win', desc: 'We bring the bibs and balls. You bring the heat.' }
              ].map((step, idx) => (
                <div key={idx} className="flex gap-6 group">
                  <div className="w-16 h-16 rounded bg-white/5 border border-white/10 flex items-center justify-center font-heading text-3xl font-black italic text-pitch-accent group-hover:bg-pitch-accent group-hover:text-black transition-colors shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold uppercase italic text-white mb-2">{step.title}</h3>
                    <p className="text-pitch-secondary text-lg">{step.desc}</p>
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

      {/* Social Proof / Testimonial */}
      {siteContent.testimonial_text && (
        <section className="py-24 px-6 relative overflow-hidden">
          {/* Background flourish */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-pitch-accent/5 blur-[100px] pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <Quote className="w-16 h-16 text-pitch-accent/40 mx-auto mb-8" />
            <h3 className="font-heading text-3xl md:text-5xl font-bold italic text-white leading-tight mb-8">
              "{siteContent.testimonial_text}"
            </h3>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-6 h-6 fill-pitch-accent text-pitch-accent" />
              ))}
            </div>
            <p className="font-bold uppercase tracking-widest text-pitch-secondary mt-4 text-sm">Verified Player</p>
          </div>
        </section>
      )}

      {/* Featured Games Preview */}
      <section className="py-20 px-6 bg-pitch-black border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
            <h2 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter">
              Upcoming <span className="text-pitch-accent">Matches</span>
            </h2>
            <Link href="/schedule" className="flex items-center gap-2 text-pitch-accent font-bold uppercase tracking-wider hover:text-white transition-colors">
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
