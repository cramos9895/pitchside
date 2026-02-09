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

    // Fetch all profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) {
        return <div className="p-8 text-red-500">Error loading users: {error.message}</div>;
    }

    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 pt-32">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="font-heading text-4xl font-bold italic uppercase tracking-tighter mb-2 flex items-center gap-3">
                            <span className="text-purple-500"><Users className="w-8 h-8" /></span>
                            User <span className="text-white">Management</span>
                        </h1>
                        <p className="text-gray-400">Manage user roles and permissions.</p>
                    </div>
                </div>

                <UserTable initialProfiles={profiles || []} />
            </div>
        </div>
    );
}
