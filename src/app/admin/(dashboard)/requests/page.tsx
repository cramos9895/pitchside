import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ShieldCheck, XCircle, Clock, User, Building } from 'lucide-react';
import { approveUser, denyUser } from '@/app/actions/admin-approvals';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export const metadata = {
    title: 'Approval Queue | Pitch Side Master Admin',
    description: 'Manage facility access requests',
};

// Revalidate dynamically since this is a queue
export const revalidate = 0;

export default async function RequestsDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Ensure user is master admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, system_role')
        .eq('id', user.id)
        .single();

    const isMasterAdmin = profile?.role === 'master_admin' || profile?.system_role === 'super_admin';
    if (!isMasterAdmin) {
        redirect('/admin'); // Boot regular admins out of this specific queue
    }

    // Fetch pending requests
    const { data: pendingUsers, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, system_role, updated_at, facilities (name)')
        .eq('verification_status', 'pending')
        .order('updated_at', { ascending: true }); // Oldest first (FIFO queue)

    if (error) {
        console.error("Error fetching pending requests:", error);
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="inline-block px-3 py-1 bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-widest rounded mb-2">
                        Master Portal
                    </div>
                    <h1 className="text-4xl font-heading font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                        Approval Queue
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium">
                        Review and manage accounts awaiting platform verification.
                    </p>
                </div>

                <div className="px-6 py-3 bg-black/50 border border-white/10 rounded-lg flex items-center justify-center gap-4">
                    <span className="text-sm font-bold uppercase tracking-wider text-gray-500">Pending Requests</span>
                    <span className="text-3xl font-numeric font-bold text-white">
                        {pendingUsers?.length || 0}
                    </span>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-pitch-card border border-white/10 rounded-lg overflow-hidden relative shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pitch-accent to-red-500 opacity-50"></div>

                {(!pendingUsers || pendingUsers.length === 0) ? (
                    <div className="p-16 text-center flex flex-col items-center justify-center">
                        <div className="w-24 h-24 bg-black/40 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <ShieldCheck className="w-12 h-12 text-green-500/50" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 font-heading italic uppercase">Queue Empty</h3>
                        <p className="text-gray-400 max-w-md mx-auto font-medium">
                            You're all caught up! There are no facilities or users currently waiting for verification.
                        </p>
                        <Link
                            href="/admin/users"
                            className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-wider rounded-sm transition-all"
                        >
                            View All Users
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/40 border-b border-white/10">
                                    <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider w-1/3">Applicant Identity</th>
                                    <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider">Requested Role</th>
                                    <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider">Waiting For</th>
                                    <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {pendingUsers.map((applicant) => (
                                    <tr key={applicant.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 border border-white/10 shrink-0">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg text-white group-hover:text-pitch-accent transition-colors">
                                                        {applicant.full_name || 'Unknown User'}
                                                    </div>
                                                    <div className="text-sm text-gray-400 mt-0.5">
                                                        {applicant.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 w-max px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-widest border border-blue-500/20">
                                                    {applicant.system_role === 'facility_admin' ? (
                                                        <><Building className="w-3.5 h-3.5" /> Facility Admin</>
                                                    ) : (
                                                        <><User className="w-3.5 h-3.5" /> {applicant.role}</>
                                                    )}
                                                </div>
                                                {/* Display Organization Name if Available */}
                                                {(applicant as any).facilities?.name && (
                                                    <div className="text-xs text-pitch-accent font-bold uppercase tracking-wider mt-1">
                                                        Org: {(applicant as any).facilities.name}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2 text-gray-300 font-medium">
                                                <Clock className="w-4 h-4 text-orange-400" />
                                                {applicant.updated_at ? formatDistanceToNow(new Date(applicant.updated_at), { addSuffix: true }) : 'Unknown time'}
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {/* Approve Action */}
                                                <form action={approveUser.bind(null, applicant.id)}>
                                                    <button
                                                        type="submit"
                                                        title="Approve Verification"
                                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border border-green-500/20 hover:border-green-500 transition-all shadow-sm hover:shadow-green-500/20 hover:-translate-y-0.5"
                                                    >
                                                        <ShieldCheck className="w-5 h-5" />
                                                    </button>
                                                </form>

                                                {/* Deny Action */}
                                                <form action={denyUser.bind(null, applicant.id)}>
                                                    <button
                                                        type="submit"
                                                        title="Reject Application"
                                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all shadow-sm hover:shadow-red-500/20 hover:-translate-y-0.5"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
