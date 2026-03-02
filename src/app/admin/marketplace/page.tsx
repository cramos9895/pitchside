import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tag, Building2 } from 'lucide-react';
import { LiveCalendarLoader } from '@/components/admin/LiveCalendarLoader';

export const metadata = {
    title: 'Live Marketplace | Admin',
    description: 'Master view of live facility schedules',
};

export default async function AdminMarketplacePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Role verification
    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';
    if (!isSuperAdmin) {
        redirect('/');
    }

    // Fetch all active facilities for the dropdown
    const { data: facilities } = await supabase
        .from('facilities')
        .select('id, name, city, state')
        .order('name');

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-4xl font-heading font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                        <Tag className="w-8 h-8 text-pitch-accent" />
                        Live Marketplace
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium max-w-2xl">
                        God View of all network facilities. Select a facility to view their real-time schedule. Empty unbooked slots are automatically treated as Marketplace inventory.
                    </p>
                </div>
            </div>

            {!facilities || facilities.length === 0 ? (
                <div className="bg-black/40 border border-white/10 rounded-lg p-12 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">No Facilities Found</h3>
                    <p className="text-gray-400">There are no facilities registered on the network yet.</p>
                </div>
            ) : (
                <div className="relative z-10">
                    <LiveCalendarLoader facilities={facilities} />
                </div>
            )}
        </div>
    );
}
