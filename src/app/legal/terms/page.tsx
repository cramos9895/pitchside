import Link from 'next/link';
import { ArrowLeft, FileText, AlertTriangle, ShieldCheck, CreditCard, Navigation } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-pitch-black text-white pt-28 pb-20 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pitch-secondary hover:text-pitch-accent transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Title Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-pitch-accent/10 border border-pitch-accent/30 rounded-full text-pitch-accent text-xs font-black uppercase tracking-wider mb-4">
            <FileText className="w-3.5 h-3.5" /> Legal Terms
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white">
            Terms of <span className="text-pitch-accent">Service</span>
          </h1>
          <p className="text-pitch-secondary text-sm mt-2">
            Last Updated: August 17, 2026 • Effective Immediately
          </p>
        </div>

        {/* Terms Content Cards */}
        <div className="space-y-8">
          {/* Section 1: Acceptance */}
          <div className="p-8 bg-pitch-card border border-white/10 rounded-sm space-y-4">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-300 leading-relaxed text-sm">
              By accessing or using the PitchSide platform, web applications, or mobile applications (iOS and Android), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our services.
            </p>
          </div>

          {/* Section 2: Real-World Service Classification & Payments */}
          <div className="p-8 bg-pitch-card border border-white/10 rounded-sm space-y-4">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-pitch-accent" /> 2. Real-World Services & Payment Processing
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              PitchSide facilitates the booking and coordination of physical sports events, including pickup soccer games, tournaments, leagues, facility rentals, and referee officiating. 
            </p>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li>All payments for real-world bookings are processed through our authorized payment partner, <strong className="text-white">Stripe</strong> (including Apple Pay and Google Pay).</li>
              <li>Booking reservations are confirmed once payment authorization is completed.</li>
              <li>Cancellation and refund policies for games and tournaments are subject to host guidelines and facility weather policies as communicated on event detail pages.</li>
            </ul>
          </div>

          {/* Section 3: Statutory Real-Time Route Guidance Disclaimer */}
          <div className="p-8 bg-pitch-card border border-pitch-accent/40 rounded-sm space-y-4">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-pitch-accent" /> 3. Real-Time Route Guidance Disclaimer
            </h2>
            <div className="p-4 bg-black/50 border border-pitch-accent/20 rounded-sm">
              <p className="text-sm font-bold text-pitch-accent tracking-wide uppercase font-mono">
                YOUR USE OF THIS REAL TIME ROUTE GUIDANCE APPLICATION IS AT YOUR SOLE RISK. LOCATION DATA MAY NOT BE ACCURATE.
              </p>
            </div>
            <p className="text-xs text-gray-400">
              PitchSide provides location mapping and facility directions for convenience only. Users are solely responsible for verifying route safety, driving conditions, and municipal navigation rules.
            </p>
          </div>

          {/* Section 4: Player Safety & Waivers */}
          <div className="p-8 bg-pitch-card border border-white/10 rounded-sm space-y-4">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-pitch-accent" /> 4. Physical Activity, Safety & Liability Waivers
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Soccer and physical athletics carry inherent risks of injury. Participation in any PitchSide game requires acceptance of our digital Athletic Participation Waiver. Players are responsible for ensuring their personal medical fitness prior to kickoff.
            </p>
          </div>

          {/* Section 5: Code of Conduct & Account Termination */}
          <div className="p-8 bg-pitch-card border border-white/10 rounded-sm space-y-4">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" /> 5. Player Conduct & Fair Play
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              PitchSide maintains zero tolerance for violence, discriminatory harassment, unsportsmanlike hostility toward match officials or organizers, and fraudulent chargeback abuse. Violations may result in immediate suspension or termination of platform access.
            </p>
          </div>

          {/* Section 6: Contact */}
          <div className="p-8 bg-pitch-card border border-white/10 rounded-sm space-y-3">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white">
              6. Contact Information
            </h2>
            <p className="text-gray-300 text-sm">
              For questions regarding these Terms of Service or organizer partnerships, contact:
            </p>
            <p className="text-sm font-mono text-pitch-accent">
              legal@pitchsidecf.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
