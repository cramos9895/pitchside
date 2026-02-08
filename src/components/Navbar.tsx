
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { Sidebar } from '@/components/Sidebar';

export function Navbar() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <>
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-pitch-black/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="text-2xl font-heading font-bold italic tracking-tighter text-white">
                        PITCH<span className="text-pitch-accent">SIDE</span>
                    </Link>

                    {/* Right Actions */}
                    <div className="flex items-center gap-6">
                        <div className="hidden md:block">
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
