import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PromotionsClient from '@/app/admin/settings/promotions/PromotionsClient';
import { Tag } from 'lucide-react';

export const metadata = { title: 'Rental Promotions | Pitch Side Facility' };

export default async function FacilityPromotionsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role, facility_id')
        .eq('id', user.id)
        .single();

    if (!profile?.facility_id || (profile.system_role !== 'facility_admin' && profile.role !== 'master_admin')) {
        redirect('/');
    }

    const { data: facilityPromos } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('facility_id', profile.facility_id)
        .order('created_at', { ascending: false });

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <header className="mb-8">
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                    <Tag className="w-8 h-8 text-pitch-accent" />
                    Rental Promotions
                </h1>
                <p className="text-gray-400 mt-2 font-medium">Manage discount codes for your facility's Private Rentals.</p>
            </header>

            <PromotionsClient initialPromos={facilityPromos || []} facilityId={profile.facility_id} isGlobal={false} />
        </div>
    );
}
