import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PromotionsClient from './PromotionsClient';
import { Tag } from 'lucide-react';

export const metadata = { title: 'Global Promotions | Pitch Side Admin' };

export default async function AdminPromotionsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'master_admin' && profile?.system_role !== 'super_admin') {
        redirect('/');
    }

    const { data: globalPromos } = await supabase
        .from('promo_codes')
        .select('*')
        .is('facility_id', null)
        .order('created_at', { ascending: false });

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <header className="mb-8">
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                    <Tag className="w-8 h-8 text-pitch-accent" />
                    Global Promotions
                </h1>
                <p className="text-gray-400 mt-2 font-medium">Manage discount codes for Pitch Side Platform games.</p>
            </header>

            <PromotionsClient initialPromos={globalPromos || []} isGlobal={true} />
        </div>
    );
}
