'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GameForm } from '@/components/admin/GameForm';

export default function NewGamePage() {
    return (
        <div className="min-h-screen bg-pitch-black text-white p-6 pt-32">
            <div className="max-w-2xl mx-auto">
                <Link href="/admin" className="flex items-center text-pitch-secondary hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>

                <h1 className="font-heading text-4xl font-bold italic uppercase tracking-tighter mb-8">
                    Create <span className="text-pitch-accent">New Game</span>
                </h1>

                <div className="bg-pitch-card border border-white/10 p-8 rounded-sm shadow-xl">
                    <GameForm action="create" />
                </div>
            </div>
        </div>
    );
}
