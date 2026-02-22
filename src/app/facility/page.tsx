import { createClient } from '@/lib/supabase/server';
import { Calendar, MapPin, Users } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function FacilityDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, facility_id')
        .eq('id', user.id)
        .single();

    let facilityName = "Your Facility";

    if (profile?.facility_id) {
        const { data: facility } = await supabase
            .from('facilities')
            .select('name')
            .eq('id', profile.facility_id)
            .single();

        if (facility) {
            facilityName = facility.name;
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-heading font-black italic uppercase text-white tracking-wider">
                    Welcome, <span className="text-pitch-accent">{facilityName}</span>
                </h1>
                <p className="text-pitch-secondary mt-2">Manage your leagues, resources, and bookings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-pitch-card border border-white/5 p-6 rounded-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-pitch-accent/10 rounded-sm">
                            <Users className="w-6 h-6 text-pitch-accent" />
                        </div>
                        <h3 className="font-bold text-lg text-white">Active Leagues</h3>
                    </div>
                    <div className="text-3xl font-black text-white">0</div>
                    <p className="text-sm text-pitch-secondary mt-2">Currently running leagues</p>
                </div>

                <div className="bg-pitch-card border border-white/5 p-6 rounded-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-sm">
                            <MapPin className="w-6 h-6 text-blue-500" />
                        </div>
                        <h3 className="font-bold text-lg text-white">Total Resources</h3>
                    </div>
                    <div className="text-3xl font-black text-white">0</div>
                    <p className="text-sm text-pitch-secondary mt-2">Fields & Courts</p>
                </div>

                <div className="bg-pitch-card border border-white/5 p-6 rounded-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-sm">
                            <Calendar className="w-6 h-6 text-purple-500" />
                        </div>
                        <h3 className="font-bold text-lg text-white">Upcoming Games</h3>
                    </div>
                    <div className="text-3xl font-black text-white">0</div>
                    <p className="text-sm text-pitch-secondary mt-2">Scheduled next 7 days</p>
                </div>
            </div>
        </div>
    );
}
