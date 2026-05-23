// 🏗️ Architecture: [[League Architecture.md]]
import { LeagueForm } from '@/components/admin/LeagueForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateLeaguePage() {
    return (
        <div className="min-h-screen bg-pitch-black p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link 
                        href="/admin" 
                        className="inline-flex items-center gap-2 text-pitch-secondary hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                        Provision <span className="text-pitch-accent">League</span>
                    </h1>
                    <p className="text-pitch-secondary mt-2">
                        Create a structured, multi-week league with season dates and a division format.
                    </p>
                </div>

                <div className="bg-pitch-card border border-white/5 p-6 rounded-sm">
                    <LeagueForm />
                </div>
            </div>
        </div>
    );
}
