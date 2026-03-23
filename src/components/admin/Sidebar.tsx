'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Users, 
    Settings, 
    ArrowLeft, 
    Building2, 
    Banknote, 
    Tag,
    ChevronLeft,
    ChevronRight,
    Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
    isMasterAdmin: boolean;
    isSuperAdmin: boolean;
    pendingCount: number;
}

export function Sidebar({ isMasterAdmin, isSuperAdmin, pendingCount }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    // Persist collapse state in local storage
    useEffect(() => {
        const saved = localStorage.getItem('admin-sidebar-collapsed');
        if (saved) setIsCollapsed(JSON.parse(saved));
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(newState));
    };

    const navItems = [
        {
            href: '/admin',
            label: 'Game Manager',
            icon: LayoutDashboard,
            show: true
        },
        {
            href: '/admin/facilities',
            label: 'Facilities',
            icon: Building2,
            show: isMasterAdmin || isSuperAdmin
        },
        {
            href: '/admin/users',
            label: 'Users',
            icon: Users,
            show: isMasterAdmin || isSuperAdmin
        },
        {
            href: '/admin/financials',
            label: 'Financials',
            icon: Banknote,
            show: isMasterAdmin || isSuperAdmin,
            disabled: true
        },
        {
            href: '/admin/requests',
            label: 'Requests',
            icon: Users,
            show: isMasterAdmin || isSuperAdmin,
            badge: pendingCount > 0 ? pendingCount : null
        },
        {
            href: '/admin/marketplace',
            label: 'Marketplace Feed',
            icon: Tag,
            show: isMasterAdmin || isSuperAdmin,
            accent: 'pitch-accent'
        },
        {
            href: '/admin/settings',
            label: 'Settings',
            icon: Settings,
            show: isMasterAdmin || isSuperAdmin
        }
    ];

    return (
        <aside 
            className={cn(
                "border-r border-white/10 bg-pitch-card hidden md:flex flex-col h-[calc(100vh-5rem)] sticky top-20 transition-all duration-300 ease-in-out z-40",
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            {/* Collapse Toggle Button */}
            <button 
                onClick={toggleCollapse}
                className="absolute -right-3 top-6 bg-pitch-card border border-white/10 rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/5 transition-all shadow-lg z-50"
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className={cn("mb-8 transition-all duration-300", isCollapsed ? "opacity-0 h-0" : "opacity-100")}>
                    <h2 className="text-xl font-heading font-black italic text-red-500 uppercase tracking-wider truncate">
                        {isMasterAdmin || isSuperAdmin ? 'Master Panel' : 'Admin Panel'}
                    </h2>
                </div>

                <nav className="space-y-1.5">
                    {navItems.map((item, idx) => {
                        if (!item.show) return null;
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        
                        return (
                            <Link 
                                key={idx}
                                href={item.disabled ? '#' : item.href} 
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-sm transition-all group relative",
                                    isActive 
                                        ? "bg-pitch-accent/10 text-pitch-accent border-l-2 border-pitch-accent" 
                                        : "text-gray-400 hover:bg-white/5 hover:text-white",
                                    item.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-gray-600"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <div className={cn("flex shrink-0 items-center justify-center transition-all", isCollapsed ? "w-full" : "w-5")}>
                                    <Icon className={cn(
                                        "w-5 h-5 transition-colors",
                                        isActive && "text-pitch-accent",
                                        item.accent && !isActive && `group-hover:text-${item.accent}`
                                    )} />
                                </div>
                                
                                {!isCollapsed && (
                                    <span className="font-bold uppercase tracking-wider text-[11px] truncate flex-1">
                                        {item.label}
                                    </span>
                                )}

                                {item.badge && (
                                    <div className={cn(
                                        "bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                                        isCollapsed ? "absolute top-1 right-3 w-4 h-4" : "w-5 h-5"
                                    )}>
                                        {item.badge}
                                    </div>
                                )}
                            </Link>
                        );
                    })}

                    {/* Nested Promotion Link */}
                    {(isMasterAdmin || isSuperAdmin) && !isCollapsed && (
                        <Link 
                            href="/admin/settings/promotions" 
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors ml-4 border-l border-white/10 group",
                                pathname === '/admin/settings/promotions' ? "text-pitch-accent" : "text-pitch-accent/60 hover:text-pitch-accent hover:bg-white/5"
                            )}
                        >
                            <Tag className="w-4 h-4" />
                            <span className="font-bold uppercase tracking-wider text-[10px] truncate">Promotions Hub</span>
                        </Link>
                    )}
                </nav>
            </div>

            {/* Back to Site */}
            <div className="p-4 border-t border-white/10 bg-black/20 mt-auto">
                <Link 
                    href="/" 
                    className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-sm text-gray-500 hover:bg-white/5 hover:text-white transition-all group",
                        isCollapsed && "justify-center"
                    )}
                    title={isCollapsed ? "Main Site" : undefined}
                >
                    <ArrowLeft className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span className="font-bold uppercase tracking-wider text-xs truncate">Main Site</span>}
                </Link>
            </div>
        </aside>
    );
}
