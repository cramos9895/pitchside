'use client';

import { useState } from 'react';
import { ShieldCheck, XCircle, Clock, User, MessageSquare } from 'lucide-react';
import { approveRefereeApplication, rejectRefereeApplication } from '@/app/actions/referee-applications';
import { formatDistanceToNow } from 'date-fns';

export default function InternalApplicationsTable({ applications }: { applications: any[] }) {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = async (appId: string, userId: string) => {
        setProcessingId(appId);
        try {
            await approveRefereeApplication(appId, userId);
            // Revalidation handles UI update
        } catch (error: any) {
            alert(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (appId: string) => {
        const reason = window.prompt("Please provide a reason for rejecting this application (the player will see this):");
        if (reason === null) return; // User cancelled
        
        if (!reason.trim()) {
            alert("A rejection reason is required.");
            return;
        }

        setProcessingId(appId);
        try {
            await rejectRefereeApplication(appId, reason);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (!applications || applications.length === 0) return null;

    return (
        <div className="mt-12">
            <h2 className="text-2xl font-heading font-black italic uppercase tracking-tight text-white flex items-center gap-3 mb-6">
                Internal Applications <span className="text-sm bg-pitch-accent text-black px-2 py-1 rounded-full">{applications.length}</span>
            </h2>
            
            <div className="bg-pitch-card border border-white/10 rounded-lg overflow-hidden relative shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-pitch-accent opacity-50"></div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40 border-b border-white/10">
                                <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider w-1/3">Applicant Identity</th>
                                <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider">Experience Summary</th>
                                <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider">Waiting For</th>
                                <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {applications.map((app) => (
                                <tr key={app.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 border border-white/10 shrink-0 overflow-hidden">
                                                {app.profiles?.avatar_url ? (
                                                    <img src={app.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg text-white group-hover:text-pitch-accent transition-colors flex items-center gap-2">
                                                    {app.profiles?.first_name ? `${app.profiles.first_name} ${app.profiles.last_name}` : 'Unknown User'}
                                                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-500/30">Player</span>
                                                </div>
                                                <div className="text-sm text-gray-400 mt-0.5">
                                                    {app.profiles?.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-start gap-2 text-sm text-gray-300 max-w-md">
                                            <MessageSquare className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                                            <p className="line-clamp-2 italic">{app.experience_summary || 'No summary provided.'}</p>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2 text-gray-300 font-medium">
                                            <Clock className="w-4 h-4 text-orange-400" />
                                            {app.created_at ? formatDistanceToNow(new Date(app.created_at), { addSuffix: true }) : 'Unknown time'}
                                        </div>
                                    </td>
                                    <td className="p-5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            {processingId === app.id ? (
                                                <span className="text-pitch-accent text-sm font-bold animate-pulse">Processing...</span>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(app.id, app.user_id)}
                                                        title="Approve Application"
                                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border border-green-500/20 hover:border-green-500 transition-all shadow-sm hover:shadow-green-500/20 hover:-translate-y-0.5"
                                                    >
                                                        <ShieldCheck className="w-5 h-5" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleReject(app.id)}
                                                        title="Reject Application"
                                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all shadow-sm hover:shadow-red-500/20 hover:-translate-y-0.5"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
