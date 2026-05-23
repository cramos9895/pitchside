// 🏗️ Architecture: [[SignUpForm.md]]
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, User, Building, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerAccount } from '@/app/actions/auth';

function SignUpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = searchParams.get('next');

    // State Management
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [accountType, setAccountType] = useState<'player' | 'facility' | 'referee'>('player');

    // Form Data
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        dob: '',
        phone: '',
        zip: '',
        organizationName: '',
        jobTitle: 'Owner',
        certLevel: 'USSF Grassroots',
        primarySports: [] as string[]
    });

    const ALL_SPORTS = [
        "Soccer", "Basketball", "Volleyball", "Flag Football", 
        "Hockey", "Ultimate Frisbee", "Baseball", "Softball",
        "Pickleball", "Padel", "Tennis"
    ];

    const toggleSport = (sport: string) => {
        setFormData(prev => {
            const current = prev.primarySports;
            const next = current.includes(sport) 
                ? current.filter(s => s !== sport)
                : [...current, sport];
            return { ...prev, primarySports: next };
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const submissionData = new FormData();
        submissionData.append('accountType', accountType);
        submissionData.append('firstName', formData.firstName);
        submissionData.append('lastName', formData.lastName);
        submissionData.append('email', formData.email);
        submissionData.append('password', formData.password);
        submissionData.append('phone', formData.phone);
        submissionData.append('zip', formData.zip);

        if (accountType === 'player' || accountType === 'referee') {
            submissionData.append('dob', formData.dob);
        }

        if (accountType === 'facility') {
            submissionData.append('organizationName', formData.organizationName);
            submissionData.append('jobTitle', formData.jobTitle);
        }

        if (accountType === 'player') {
            submissionData.append('primarySports', JSON.stringify(formData.primarySports));
        }

        if (accountType === 'referee') {
            submissionData.append('certLevel', formData.certLevel);
        }

        try {
            const result = await registerAccount(submissionData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            // Redirect logic
            if (nextPath) {
                router.push(nextPath);
            } else if (accountType === 'facility' || accountType === 'referee') {
                router.push('/pending'); // Admins/Refs need approval
            } else {
                router.push('/dashboard');
            }
            router.refresh();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full bg-black/50 border border-white/10 focus:border-pitch-accent text-white px-4 py-3 rounded-sm outline-none transition-colors font-medium placeholder:text-gray-700 text-sm";
    const labelClasses = "block text-[10px] font-black uppercase tracking-[0.2em] text-pitch-secondary mb-2";

    return (
        <div className="min-h-screen bg-pitch-black flex items-center justify-center px-4 font-sans text-white py-20 relative overflow-hidden">
            {/* Background Aesthetics */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(circle_at_50%_0%,rgba(204,255,0,0.08)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-pitch-accent/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-2xl bg-pitch-card border border-white/10 p-4 sm:p-8 md:p-12 rounded-sm relative z-10 shadow-2xl">
                <div className="text-center mb-12">
                    <Link href="/" className="inline-block text-4xl font-heading font-black italic tracking-tighter mb-4 hover:text-pitch-accent transition-colors">
                        PITCH<span className="text-pitch-accent">SIDE</span>
                    </Link>
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-px w-8 bg-pitch-accent/30" />
                        <h2 className="text-sm font-black uppercase tracking-[0.4em] text-pitch-secondary">
                            Join the Network
                        </h2>
                        <div className="h-px w-8 bg-pitch-accent/30" />
                    </div>
                </div>

                {/* Persona Tabs */}
                <div className="grid grid-cols-3 gap-3 mb-10">
                    <button
                        type="button"
                        onClick={() => setAccountType('player')}
                        className={cn(
                            "flex flex-col items-center justify-center gap-3 p-3 sm:p-5 rounded-sm border transition-all duration-300",
                            accountType === 'player'
                                ? "border-pitch-accent bg-pitch-accent/5 text-pitch-accent"
                                : "border-white/5 bg-black/20 text-gray-500 hover:border-white/20"
                        )}
                    >
                        <User className="w-6 h-6" />
                        <span className="font-black uppercase tracking-widest text-[9px]">Player</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAccountType('facility')}
                        className={cn(
                            "flex flex-col items-center justify-center gap-3 p-3 sm:p-5 rounded-sm border transition-all duration-300",
                            accountType === 'facility'
                                ? "border-pitch-accent bg-pitch-accent/5 text-pitch-accent"
                                : "border-white/5 bg-black/20 text-gray-500 hover:border-white/20"
                        )}
                    >
                        <Building className="w-6 h-6" />
                        <span className="font-black uppercase tracking-widest text-[9px]">Owner</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAccountType('referee')}
                        className={cn(
                            "flex flex-col items-center justify-center gap-3 p-3 sm:p-5 rounded-sm border transition-all duration-300",
                            accountType === 'referee'
                                ? "border-pitch-accent bg-pitch-accent/5 text-pitch-accent"
                                : "border-white/5 bg-black/20 text-gray-500 hover:border-white/20"
                        )}
                    >
                        <ShieldCheck className="w-6 h-6" />
                        <span className="font-black uppercase tracking-widest text-[9px]">Referee</span>
                    </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-sm text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Row 1: Name */}
                        {accountType === 'facility' && (
                            <div className="md:col-span-2">
                                <label className={labelClasses}>Organization Name</label>
                                <input
                                    name="organizationName"
                                    type="text"
                                    value={formData.organizationName}
                                    onChange={handleChange}
                                    required
                                    className={inputClasses}
                                    placeholder="e.g. Elite Sports Complex"
                                />
                            </div>
                        )}

                        <div>
                            <label className={labelClasses}>First Name</label>
                            <input
                                name="firstName"
                                type="text"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                                className={inputClasses}
                                placeholder="Cristiano"
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Last Name</label>
                            <input
                                name="lastName"
                                type="text"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                                className={inputClasses}
                                placeholder="Ronaldo"
                            />
                        </div>

                        {/* Row 2: Auth */}
                        <div className="md:col-span-2">
                            <label className={labelClasses}>{accountType === 'facility' ? 'Work Email' : 'Email Address'}</label>
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className={inputClasses}
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="md:col-span-2 relative">
                            <label className={labelClasses}>Password</label>
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className={inputClasses}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-[38px] text-gray-500 hover:text-pitch-accent transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Row 3: Details */}
                        {accountType !== 'facility' && (
                            <div>
                                <label className={labelClasses}>Date of Birth</label>
                                <input
                                    name="dob"
                                    type="date"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    required
                                    className={inputClasses}
                                />
                            </div>
                        )}

                        <div>
                            <label className={labelClasses}>Phone Number</label>
                            <input
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                className={inputClasses}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>

                        <div>
                            <label className={labelClasses}>{accountType === 'facility' ? 'Facility Zip Code' : 'Zip Code'}</label>
                            <input
                                name="zip"
                                type="text"
                                value={formData.zip}
                                onChange={handleChange}
                                required
                                className={inputClasses}
                            placeholder="60102"
                                />
                            </div>

                            {/* Sports Selection (Player Only) */}
                            {accountType === 'player' && (
                                <div className="md:col-span-2">
                                    <label className={labelClasses}>What sports do you play?</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                        {ALL_SPORTS.map(sport => (
                                            <button
                                                key={sport}
                                                type="button"
                                                onClick={() => toggleSport(sport)}
                                                className={cn(
                                                    "px-1.5 sm:px-3 py-2 sm:py-2.5 rounded-sm border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all text-center flex items-center justify-center break-words min-h-[44px]",
                                                    formData.primarySports.includes(sport)
                                                        ? "bg-pitch-accent text-pitch-black border-pitch-accent shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                                                        : "bg-black/40 border-white/5 text-gray-500 hover:border-white/20"
                                                )}
                                            >
                                                {sport}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-gray-600 mt-3 font-bold uppercase tracking-widest italic">
                                        Select all that apply to customize your feed.
                                    </p>
                                </div>
                            )}

                        {accountType === 'facility' && (
                            <div>
                                <label className={labelClasses}>Job Title</label>
                                <select
                                    name="jobTitle"
                                    value={formData.jobTitle}
                                    onChange={handleChange}
                                    className={cn(inputClasses, "appearance-none bg-black/50 cursor-pointer")}
                                >
                                    <option value="Owner">Owner</option>
                                    <option value="General Manager">General Manager</option>
                                    <option value="Operations">Operations</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        )}

                        {accountType === 'referee' && (
                            <div className="md:col-span-2">
                                <label className={labelClasses}>Certification Level</label>
                                <select
                                    name="certLevel"
                                    value={formData.certLevel}
                                    onChange={handleChange}
                                    className={cn(inputClasses, "appearance-none bg-black/50 cursor-pointer")}
                                >
                                    <option value="USSF Regional">USSF Regional</option>
                                    <option value="USSF Grassroots">USSF Grassroots</option>
                                    <option value="High School / NFHS">High School / NFHS</option>
                                    <option value="Uncertified/Local">Uncertified/Local</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full py-4 sm:py-5 bg-pitch-accent text-pitch-black font-black uppercase tracking-widest sm:tracking-[0.3em] text-[10px] sm:text-xs rounded-sm hover:bg-white transition-all shadow-xl shadow-pitch-accent/10 flex items-center justify-center gap-3 overflow-hidden"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                Create {accountType} Account
                                <CheckCircle2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </>
                        )}
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </button>

                    <p className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest pt-4">
                        Already have an account?{' '}
                        <Link href="/login" className="text-pitch-accent hover:text-white underline underline-offset-4 transition-colors">
                            Sign In
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default function SignUpPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-pitch-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-pitch-accent" />
            </div>
        }>
            <SignUpForm />
        </Suspense>
    );
}
