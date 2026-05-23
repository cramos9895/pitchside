'use client';

import Link from 'next/link';
import { Users, ArrowRight, Instagram, Twitter, Facebook } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  // Hide footer on dashboard, admin, and live projector/display routes to ensure no UI disruption
  const isPrivateArea = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');
  const isProjectorView = pathname && (pathname.endsWith('/live') || pathname.includes('/display'));
  if (isPrivateArea || isProjectorView) return null;

  return (
    <footer className="bg-pitch-black pt-8 pb-10 px-6 overflow-hidden relative">
      {/* Background Flourish */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pitch-accent/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 translate-x-1/4" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-12 mb-12 lg:mb-20">
          
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-4 space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-pitch-accent rounded-sm flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
                <Users className="w-6 h-6 text-pitch-black" />
              </div>
              <span className="text-3xl font-black italic uppercase tracking-tighter text-white">
                PitchSide
              </span>
            </Link>
            <p className="text-white/60 text-lg max-w-xs font-medium">
              Elite infrastructure for grassroots sports
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-sm border border-white/10 flex items-center justify-center text-white/40 hover:text-pitch-accent hover:border-pitch-accent/50 transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-sm border border-white/10 flex items-center justify-center text-white/40 hover:text-pitch-accent hover:border-pitch-accent/50 transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-sm border border-white/10 flex items-center justify-center text-white/40 hover:text-pitch-accent hover:border-pitch-accent/50 transition-all">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Link Columns Wrapper for Mobile Pairing */}
          <div className="col-span-2 lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Platform Column */}
            <div className="space-y-6">
              <h4 className="text-white font-black uppercase italic tracking-widest text-xs">Platform</h4>
              <ul className="space-y-4">
                <li>
                  <Link href="/games" className="text-white/60 hover:text-pitch-accent transition-colors font-bold uppercase text-xs tracking-wider">
                    Find a Match
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/schedule" className="text-white/60 hover:text-pitch-accent transition-colors font-bold uppercase text-xs tracking-wider">
                    Player Hub
                  </Link>
                </li>
                <li>
                  <Link href="/referee" className="text-white/60 hover:text-pitch-accent transition-colors font-bold uppercase text-xs tracking-wider">
                    Referee Portal
                  </Link>
                </li>
                <li>
                  <Link href="/facility" className="text-white/60 hover:text-pitch-accent transition-colors font-bold uppercase text-xs tracking-wider">
                    Facility Partners
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="space-y-6">
              <h4 className="text-white font-black uppercase italic tracking-widest text-xs">Resources</h4>
              <ul className="space-y-4">
                <li>
                  <Link href="/faq" className="text-white/60 hover:text-pitch-accent transition-colors font-bold uppercase text-xs tracking-wider">
                    Help & FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-white/60 hover:text-pitch-accent transition-colors font-bold uppercase text-xs tracking-wider">
                    About Us
                  </Link>
                </li>
                <li>
                  <a href="mailto:support@pitchside.com" className="text-white/60 hover:text-pitch-accent transition-colors font-bold uppercase text-xs tracking-wider">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="space-y-6">
              <h4 className="text-white font-black uppercase italic tracking-widest text-xs">Legal</h4>
              <ul className="space-y-4">
                <li>
                  <Link href="/legal/terms" className="text-white/60 hover:text-pitch-accent transition-colors font-bold uppercase text-xs tracking-wider">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="text-white/60 hover:text-pitch-accent transition-colors font-bold uppercase text-xs tracking-wider">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/legal/waiver" className="text-white/60 hover:text-pitch-accent transition-colors font-bold uppercase text-xs tracking-wider">
                    Participant Waiver
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-center items-center gap-6">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
            &copy; {currentYear} PitchSide Network. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
