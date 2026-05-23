// 🏗️ Architecture: [[Dashboard.md]]
import { Shield, Users, Trophy, Zap, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateHubPage() {
    return (
        <div className="min-h-screen bg-pitch-black p-8 animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link 
                        href="/admin" 
                        className="inline-flex items-center gap-2 text-pitch-secondary hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                        Provision <span className="text-pitch-accent">Event</span>
                    </h1>
                    <p className="text-pitch-secondary mt-2">
                        Select the type of event you want to create.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Standard Pickup */}
                    <Link href="/admin/create/pickup" className="group bg-pitch-card border border-white/5 p-6 rounded-sm hover:border-[#cbff00] transition-colors flex flex-col gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-[#cbff00]/10 transition-colors">
                            <Users className="w-6 h-6 text-white group-hover:text-[#cbff00]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-wide text-white group-hover:text-[#cbff00] transition-colors">Standard Pickup</h2>
                            <p className="text-sm text-pitch-secondary mt-2">One-off games with flexible formatting, free-agent credits, and waitlists.</p>
                        </div>
                    </Link>

                    {/* Tournament */}
                    <Link href="/admin/create/tournament" className="group bg-pitch-card border border-white/5 p-6 rounded-sm hover:border-[#cbff00] transition-colors flex flex-col gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-[#cbff00]/10 transition-colors">
                            <Trophy className="w-6 h-6 text-white group-hover:text-[#cbff00]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-wide text-white group-hover:text-[#cbff00] transition-colors">Tournament</h2>
                            <p className="text-sm text-pitch-secondary mt-2">Group stages, knockout brackets, team registration, and prize pools.</p>
                        </div>
                    </Link>

                    {/* Structured League */}
                    <Link href="/admin/create/league" className="group bg-pitch-card border border-white/5 p-6 rounded-sm hover:border-[#cbff00] transition-colors flex flex-col gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-[#cbff00]/10 transition-colors">
                            <Calendar className="w-6 h-6 text-white group-hover:text-[#cbff00]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-wide text-white group-hover:text-[#cbff00] transition-colors">Structured League</h2>
                            <p className="text-sm text-pitch-secondary mt-2">Multi-week fixed schedules, team standings, and division formats.</p>
                        </div>
                    </Link>

                    {/* Rolling League */}
                    <Link href="/admin/create/rolling-league" className="group bg-pitch-card border border-white/5 p-6 rounded-sm hover:border-[#cbff00] transition-colors flex flex-col gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-[#cbff00]/10 transition-colors">
                            <Zap className="w-6 h-6 text-white group-hover:text-[#cbff00]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-wide text-white group-hover:text-[#cbff00] transition-colors">Rolling League</h2>
                            <p className="text-sm text-pitch-secondary mt-2">Flexible rolling format with automated lifecycle management and skip dates.</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
