import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Calendar, MapPin } from 'lucide-react';
import { PublicFacilityCalendar } from '@/components/public/PublicFacilityCalendar';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    const supabase = await createClient();
    const { data: facility } = await supabase
        .from('facilities')
        .select('name')
        .eq('slug', resolvedParams.slug)
        .single();

    return {
        title: `${facility?.name || 'Facility'} | Pitch Side`,
        description: `Book courts and fields at ${facility?.name || 'our facility'}`,
    };
}

export default async function PublicFacilityPage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    const supabase = await createClient();

    // 1. Fetch Facility Data
    const { data: facility, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('slug', resolvedParams.slug)
        .single();

    if (error || !facility) {
        notFound();
    }

    // 2. We can pass the authenticated user status down to the client to know if they need to login
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="min-h-screen bg-pitch-black pb-20">
            {/* Storefront Hero Section */}
            <div className="relative h-[300px] md:h-[400px] w-full bg-slate-900 border-b border-white/10 overflow-hidden">
                {/* Fallback pattern if no hero image */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:20px_20px]"></div>

                {(facility.hero_image_url || facility.cover_image_url) ? (
                    <img
                        src={facility.hero_image_url || facility.cover_image_url}
                        alt={`${facility.name} cover`}
                        className="w-full h-full object-cover opacity-60"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-pitch-black via-slate-900 to-pitch-accent/20"></div>
                )}

                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-pitch-black to-transparent">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end gap-6">
                        {facility.logo_url && (
                            <img
                                src={facility.logo_url}
                                alt={`${facility.name} logo`}
                                className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover border-4 border-pitch-black shadow-2xl bg-black"
                            />
                        )}
                        <div className="pb-2 flex-1">
                            <h1 className="text-4xl md:text-5xl font-heading font-black italic uppercase tracking-tight text-white drop-shadow-lg">
                                {facility.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-300 font-medium text-sm md:text-base">
                                <MapPin className="w-5 h-5 text-pitch-accent" />
                                <span>{facility.city}, {facility.state}</span>

                                {facility.contact_phone && (
                                    <>
                                        <span className="text-white/20 hidden md:inline">|</span>
                                        <span>{facility.contact_phone}</span>
                                    </>
                                )}
                                {facility.contact_email && (
                                    <>
                                        <span className="text-white/20 hidden md:inline">|</span>
                                        <span>{facility.contact_email}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">

                {/* Description & Amenities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Col: Description */}
                    <div className="md:col-span-2 space-y-6">
                        {(facility.public_description || facility.description) && (
                            <div className="bg-black/40 border border-white/10 rounded-lg p-6 md:p-8">
                                <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">About this Facility</h2>
                                <p className="text-gray-300 leading-relaxed max-w-4xl whitespace-pre-wrap">
                                    {facility.public_description || facility.description}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Col: Amenities Sidebar */}
                    <div className="space-y-6">
                        {facility.amenities && facility.amenities.length > 0 && (
                            <div className="bg-pitch-card border border-white/5 rounded-lg p-6">
                                <h3 className="text-lg font-heading font-black italic uppercase text-white mb-4">Facility Features</h3>
                                <div className="flex flex-wrap gap-2">
                                    {facility.amenities.map((amenity: string) => (
                                        <span
                                            key={amenity}
                                            className="bg-white/5 border border-white/10 text-gray-300 px-3 py-1.5 rounded-full text-sm hover:border-pitch-accent/50 hover:text-white transition-colors"
                                        >
                                            {amenity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar Booking Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                        <Calendar className="w-8 h-8 text-pitch-accent" />
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">Live Schedule & Bookings</h2>
                            <p className="text-gray-400 text-sm mt-1">Click any empty slot to request a booking.</p>
                        </div>
                    </div>

                    {/* The Interactive Read-Only Calendar */}
                    <div className="relative font-sans text-sm leading-normal">
                        <PublicFacilityCalendar
                            facilityId={facility.id}
                            facilityName={facility.name}
                            isAuthenticated={!!user}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
