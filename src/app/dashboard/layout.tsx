'use client';

import Link from 'next/link';
import { LayoutDashboard, CalendarDays, Receipt } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const tabs = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Schedule', href: '/dashboard/schedule', icon: CalendarDays },
        { name: 'Billing & Contracts', href: '/dashboard/billing', icon: Receipt },
    ];

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-pitch-black">
            {/* Header Area */}
            <div className="bg-pitch-black text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter">
                        Player Hub
                    </h1>
                    <p className="mt-2 text-gray-400 font-medium">
                        Manage your games, rentals, and payments.
                    </p>
                </div>
            </div>

            {/* Main Content Area overlapping the header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12">
                <div className="flex flex-col md:flex-row gap-8">

                    {/* Navigation Sidebar */}
                    <div className="w-full md:w-64 shrink-0">
                        <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 hide-scrollbar rounded-xl bg-pitch-card shadow-sm ring-1 ring-white/5 p-4">
                            {tabs.map((tab) => {
                                const isActive = pathname === tab.href || (pathname === '' && tab.href === '/dashboard');
                                return (
                                    <Link
                                        key={tab.name}
                                        href={tab.href}
                                        className={`group flex items-center px-3 py-2.5 text-sm font-bold uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${isActive
                                                ? 'bg-white/10 text-pitch-accent'
                                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <tab.icon
                                            className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 ${isActive ? 'text-pitch-accent' : 'text-gray-500 group-hover:text-gray-300'
                                                }`}
                                        />
                                        <span className="truncate">{tab.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Tab Content Wrapper */}
                    <div className="flex-1 bg-pitch-black md:bg-pitch-card rounded-xl shadow-none md:shadow-lg md:ring-1 md:ring-white/5 p-0 md:p-8 min-h-[500px]">
                        {children}
                    </div>

                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}} />
        </div>
    );
}
