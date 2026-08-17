import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Trash2, MapPin, CreditCard, Mail } from 'lucide-react';

export default function PrivacyPage() {
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
            <Shield className="w-3.5 h-3.5" /> Official Policy
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white">
            Privacy <span className="text-pitch-accent">Policy</span>
          </h1>
          <p className="text-pitch-secondary text-sm mt-2">
            Last Updated: August 17, 2026 • Effective Immediately
          </p>
        </div>

        {/* Policy Content Cards */}
        <div className="space-y-8">
          {/* Section 1: Overview */}
          <div className="p-8 bg-pitch-card border border-white/10 rounded-sm space-y-4">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white flex items-center gap-2">
              1. Overview & Commitment
            </h2>
            <p className="text-gray-300 leading-relaxed text-sm">
              PitchSide ("we", "our", or "us") respects your personal privacy. This Privacy Policy explains how we collect, use, disclose, and protect personal information when you use our web platform, mobile applications (iOS and Android), and related soccer match organization services.
            </p>
          </div>

          {/* Section 2: Data We Collect */}
          <div className="p-8 bg-pitch-card border border-white/10 rounded-sm space-y-6">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white">
              2. Information We Collect
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-black/40 border border-white/5 rounded-sm space-y-2">
                <div className="flex items-center gap-2 text-pitch-accent font-bold text-sm">
                  <Mail className="w-4 h-4" /> Account & Profile Data
                </div>
                <p className="text-xs text-gray-300">
                  Name, email address, phone number, primary player position, jersey number, and optional profile photos.
                </p>
              </div>

              <div className="p-4 bg-black/40 border border-white/5 rounded-sm space-y-2">
                <div className="flex items-center gap-2 text-pitch-accent font-bold text-sm">
                  <MapPin className="w-4 h-4" /> Location Information
                </div>
                <p className="text-xs text-gray-300">
                  Precise or coarse location data provided with your permission to discover nearby soccer pitches, pickup games, and facilities.
                </p>
              </div>

              <div className="p-4 bg-black/40 border border-white/5 rounded-sm space-y-2">
                <div className="flex items-center gap-2 text-pitch-accent font-bold text-sm">
                  <CreditCard className="w-4 h-4" /> Payment Details
                </div>
                <p className="text-xs text-gray-300">
                  Payment card information is tokenized and processed securely via Stripe. PitchSide never stores full credit card numbers on our servers.
                </p>
              </div>

              <div className="p-4 bg-black/40 border border-white/5 rounded-sm space-y-2">
                <div className="flex items-center gap-2 text-pitch-accent font-bold text-sm">
                  <Lock className="w-4 h-4" /> Match & Communication Logs
                </div>
                <p className="text-xs text-gray-300">
                  Event registrations, attendance check-ins, waiver signatures, match stats, and community message threads.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Third-Party Service Providers */}
          <div className="p-8 bg-pitch-card border border-white/10 rounded-sm space-y-4">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white">
              3. Third-Party Sub-Processors
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              We partner with trusted third-party providers to power essential infrastructure:
            </p>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li><strong className="text-white">Stripe:</strong> PCI-DSS Level 1 payment gateway for physical match entries and venue reservations.</li>
              <li><strong className="text-white">Resend:</strong> Secure transactional email delivery for booking confirmations, game alerts, and receipts.</li>
              <li><strong className="text-white">Supabase / AWS:</strong> Cloud hosting, encrypted PostgreSQL databases, and authentication services.</li>
              <li><strong className="text-white">Google Maps / Apple Maps:</strong> Geocoding and venue routing interfaces.</li>
            </ul>
          </div>

          {/* Section 4: Mandatory In-App Account Deletion & Rights */}
          <div className="p-8 bg-pitch-card border border-red-500/30 rounded-sm space-y-4">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" /> 4. In-App Account Deletion & User Rights
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              In full compliance with <strong className="text-white">Apple App Store Review Guideline 5.1.1(v)</strong> and <strong className="text-white">Google Play User Data Policies</strong>, all users have the absolute right to delete their PitchSide account at any time.
            </p>
            <div className="p-4 bg-black/40 border border-white/5 rounded-sm space-y-2">
              <h3 className="font-bold text-sm text-white">How to Delete Your Account:</h3>
              <p className="text-xs text-gray-300">
                1. Navigate to <strong className="text-pitch-accent">Settings → Security</strong> in either the PitchSide web app or mobile application.<br />
                2. Under the <strong className="text-red-400">Delete Account</strong> card, click "Delete Account".<br />
                3. Confirm the action by typing <code className="text-red-400 font-mono">DELETE</code>.
              </p>
              <p className="text-xs text-pitch-secondary pt-2">
                Upon confirmation, your profile, authentication credentials, notifications, and device push tokens are immediately purged. Historical match transaction identifiers are anonymized to maintain financial accounting ledgers.
              </p>
            </div>
          </div>

          {/* Section 5: Data Security & Push Notifications */}
          <div className="p-8 bg-pitch-card border border-white/10 rounded-sm space-y-4">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white">
              5. Data Security & Push Notifications
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              We employ strict industry-standard technical safeguards, including HTTPS / TLS 1.3 encryption in transit and AES-256 database encryption at rest. Push notifications transmitted via Apple Push Notification service (APNs) and Firebase Cloud Messaging (FCM) never contain unencrypted financial data, auth tokens, or private credentials in notification banners.
            </p>
          </div>

          {/* Section 6: Contact & Questions */}
          <div className="p-8 bg-pitch-card border border-white/10 rounded-sm space-y-3">
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-white">
              6. Contact Us
            </h2>
            <p className="text-gray-300 text-sm">
              If you have any questions regarding this Privacy Policy or your personal data, contact us at:
            </p>
            <p className="text-sm font-mono text-pitch-accent">
              privacy@pitchsidecf.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
