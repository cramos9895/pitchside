import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LegalSettingsForm } from '@/components/facility/LegalSettingsForm';

export default async function FacilityLegalSettingsPage() {
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
                .select('waiver_text')
                .eq('id', profile.facility_id)
                .single();

            facilityData = facility;
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header / Breadcrumb */}
            <div>
                <Link
                    href="/facility/settings"
                    className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-pitch-secondary hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Settings
                </Link>
                <h1 className="font-oswald text-4xl font-bold uppercase italic tracking-tighter flex items-center gap-3 text-white">
                    <ShieldAlert className="w-10 h-10 text-pitch-accent" />
                    Legal & <span className="text-gray-400">Compliance</span>
                </h1>
                <p className="text-gray-400 mt-2">
                    Manage facility-specific liability waivers for your players.
                </p>
            </div>

            {/* Legal Editor Form */}
            {facilityData ? (
                <LegalSettingsForm initialWaiverText={facilityData.waiver_text} />
            ) : (
                <div className="p-8 text-center bg-black/40 border border-white/5 rounded-lg text-gray-400">
                    Unable to load facility profile data. Please ensure you are assigned to a facility.
                </div>
            )}
        </div>
    );
}
