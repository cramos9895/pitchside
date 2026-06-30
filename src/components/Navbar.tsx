
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { Sidebar } from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

export function Navbar() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Hide Navbar entirely on Live Projector Views & Field Displays
    if (pathname && (pathname.endsWith('/live') || pathname.includes('/display'))) {
        return null;
    }

    return (
        <>
            <nav className="sticky top-0 w-full z-50 border-b border-white/5 bg-pitch-black">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <Link href="/" className="text-2xl font-sans font-black italic tracking-tighter text-white">
                            PITCH<span className="text-pitch-accent">SIDE</span>
                        </Link>
                        <span className="bg-pitch-accent/20 text-pitch-accent text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-pitch-accent/30 mt-1">
                            BETA
                        </span>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3 sm:gap-6">
                        <div>
                            <AuthButton />
                        </div>

                        {/* Menu Toggle */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="text-white hover:text-pitch-accent transition-colors p-2 -mr-2"
                            aria-label="Open Menu"
                        >
                            <Menu className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Sidebar Overlay */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </>
    );
}
