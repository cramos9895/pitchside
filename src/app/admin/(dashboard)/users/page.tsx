import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import UserTable from '@/components/admin/UserTable';
import { Shield, Users } from 'lucide-react';

export default async function UsersPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Double check role server-side (middleware handles access, but good for safety)
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'master_admin') {
        redirect('/admin');
    }

    // Fetch all profiles and their platform-wide waiver signatures
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
            *,
            waiver_signatures (id, agreed_at)
        `)
        .is('waiver_signatures.facility_id', null)
        .order('updated_at', { ascending: false });

    if (error) {
        return <div className="p-8 text-red-500">Error loading users: {error.message}</div>;
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div>
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="font-heading text-4xl font-bold italic uppercase tracking-tighter mb-2 flex items-center gap-3">
                            <span className="text-purple-500"><Users className="w-8 h-8" /></span>
                            User <span className="text-white">Management</span>
                        </h1>
                        <p className="text-gray-400">Manage user roles and permissions.</p>
                    </div>

                    <div className="bg-pitch-card border border-white/10 rounded-sm p-4 flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-full">
                            <Users className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-pitch-secondary">Total Platform Users</p>
                            <p className="text-2xl font-black font-numeric text-white">{profiles?.length || 0}</p>
                        </div>
                    </div>
                </div>

                <UserTable initialProfiles={profiles || []} />
            </div>
        </div>
    );
}
