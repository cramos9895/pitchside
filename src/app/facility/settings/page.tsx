import { Settings, Users, Activity, Globe } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FacilityProfileForm } from '@/components/facility/FacilityProfileForm';

export default async function FacilitySettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let facilityData = null;

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('facility_id')
            .eq('id', user.id)
            .single();

        if (profile?.facility_id) {
            const { data: facility } = await supabase
                .from('facilities')
                .select('public_description, amenities, hero_image_url, contact_email, contact_phone, operating_hours')
                .eq('id', profile.facility_id)
                .single();

            facilityData = facility;
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="font-oswald text-3xl font-bold uppercase flex items-center gap-3 text-white">
                <Settings className="w-8 h-8 text-pitch-accent" />
                Facility Settings
            </h1>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/facility/settings/activities" className="block p-6 bg-pitch-card border border-white/5 hover:border-pitch-accent transition-colors rounded group">
                    <Activity className="w-8 h-8 text-pitch-secondary mb-4 group-hover:text-pitch-accent transition-colors" />
                    <h2 className="font-oswald text-xl font-bold uppercase text-white mb-2">Activities Available</h2>
                    <p className="text-sm text-gray-400">
                        Choose which standardized sports and activities are offered at your facility.
                    </p>
                </Link>

                <Link href="/facility/settings/team" className="block p-6 bg-pitch-card border border-white/5 hover:border-pitch-accent transition-colors rounded group">
                    <Users className="w-8 h-8 text-pitch-secondary mb-4 group-hover:text-pitch-accent transition-colors" />
                    <h2 className="font-oswald text-xl font-bold uppercase text-white mb-2">Team Management</h2>
                    <p className="text-sm text-gray-400">
                        Invite staff members to help manage your facility, leagues, and bookings.
                    </p>
                </Link>
            </div>

            {/* Public Profile Editor */}
            <div className="mt-12">
                <h2 className="font-oswald text-2xl font-bold uppercase flex items-center gap-3 text-white mb-6 border-b border-white/10 pb-4">
                    <Globe className="w-6 h-6 text-pitch-accent" />
                    Storefront Profile
                </h2>

                {facilityData ? (
                    <FacilityProfileForm initialData={facilityData} />
                ) : (
                    <div className="p-8 text-center bg-black/40 border border-white/5 rounded-lg text-gray-400">
                        Unable to load facility profile data. Please ensure you are assigned to a facility.
                    </div>
                )}
            </div>
        </div>
    );
}
