import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/admin/Sidebar';

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role')
        .eq('id', user.id)
        .single();

    const isMasterAdmin = profile?.role === 'master_admin';
    const isSuperAdmin = profile?.system_role === 'super_admin';
    const isRegularAdmin = profile?.role === 'host';

    // Fetch pending count for Master Admin badge
    let pendingCount = 0;
    if (isMasterAdmin || isSuperAdmin) {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'pending');

        if (count) pendingCount = count;
    }

    if (!isMasterAdmin && !isSuperAdmin && !isRegularAdmin) {
        console.warn(`[ADMIN BLOCK]: User ${user.email} attempted to access Admin Portal without rights.`);
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-pitch-black flex">
            <Sidebar 
                isMasterAdmin={isMasterAdmin} 
                isSuperAdmin={isSuperAdmin} 
                pendingCount={pendingCount} 
            />

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto pt-2 max-w-7xl">
                {children}
            </main>
        </div>
    );
}
