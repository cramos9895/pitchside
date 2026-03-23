import { createClient } from '@/lib/supabase/server';
import { PublicFacilityCard } from '@/components/public/PublicFacilityCard';
import { Search, MapPin } from 'lucide-react';

export const metadata = {
    title: 'Find Facilities | PitchSide',
    description: 'Browse premier sports facilities and book fields directly on the PitchSide network.'
};

export default async function FacilitiesIndexPage() {
    const supabase = await createClient();

    // Fetch all facilities that have a slug (indicating they are ready for the public storefront)
    // In the future, we might add an `is_public` boolean to control visibility explicitly
    const { data: facilities, error } = await supabase
        .from('facilities')
        .select(`
            id,
            slug,
            name,
            city,
            state,
            hero_image_url,
            amenities,
            public_description
        `)
        .not('slug', 'is', null)
        .order('name');

    if (error) {
        console.error("Error fetching public facilities:", error);
    }

    return (
        <div className="min-h-screen bg-pitch-black pt-2 pb-20">
            {/* Header / Search Hero */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center md:text-left">
                    <h1 className="text-5xl md:text-7xl font-heading font-black italic uppercase tracking-tight text-white mb-4">
                        Find Your <br className="md:hidden" /> <span className="text-pitch-accent drop-shadow-[0_0_15px_rgba(204,255,0,0.5)]">Pitch</span>
                    </h1>
                    <p className="text-gray-400 text-lg md:text-xl max-w-2xl">
                        Discover premier facilities, view live availability, and request bookings instantly across the network.
                    </p>
                </div>

                {/* Simulated Search Bar (Visual Only for now) */}
                <div className="bg-slate-900 border border-white/10 rounded-lg p-2 flex items-center md:max-w-2xl relative">
                    <div className="absolute inset-0 bg-pitch-accent opacity-[0.03] rounded-lg"></div>
                    <Search className="w-6 h-6 text-gray-400 ml-4 mr-3 relative z-10" />
                    <input
                        type="text"
                        placeholder="Search by city, sport, or facility name..."
                        className="bg-transparent border-none focus:outline-none focus:ring-0 text-white w-full py-3 relative z-10"
                        disabled // Disabled until search logic is wired up
                    />
                    <button className="bg-pitch-accent text-pitch-black font-bold uppercase tracking-wider px-8 py-3 rounded hover:bg-white transition-colors relative z-10">
                        Search
                    </button>
                </div>
            </div>

            {/* Facilities Database Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-bold uppercase tracking-wide text-white flex items-center gap-3">
                        <MapPin className="w-6 h-6 text-pitch-secondary" />
                        Network Locations
                    </h2>
                    <span className="text-gray-400 font-numeric bg-white/5 border border-white/10 px-3 py-1 rounded">
                        {facilities?.length || 0} Facilities
                    </span>
                </div>

                {!facilities || facilities.length === 0 ? (
                    <div className="text-center py-24 bg-black/40 border border-white/5 rounded-xl">
                        <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Facilities Found</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            There are currently no public facilities listed on the network. Check back later or contact support if you own a facility.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {facilities.map((facility) => (
                            <PublicFacilityCard key={facility.id} facility={facility} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
