import Link from 'next/link';
import { Calendar, MapPin, Trophy, ChevronRight, ShieldAlert } from 'lucide-react';

export default function RefereeDashboard() {
    // Mock Data
    const upcomingMatches = [
        {
            id: '1',
            title: 'King of the Pitch - Summer Finals',
            matchStyle: 'King',
            location: 'Downtown Turf Field 1',
            date: 'TONIGHT • 8:00 PM',
            payment: '$45',
        },
        {
            id: '2',
            title: 'Friday Night Tourney',
            matchStyle: 'Tourney',
            location: 'Northside Indoor Arena',
            date: 'TOMORROW • 7:30 PM',
            payment: '$60',
        }
    ];

    const openMarket = [
        {
            id: '3',
            title: 'Weekend Warriors Cup',
            matchStyle: 'Tourney',
            location: 'Eastside Sports Complex',
            date: 'SUNDAY • 10:00 AM',
            payment: '$80',
        },
        {
            id: '4',
            title: 'Late Night Kings',
            matchStyle: 'King',
            location: 'Downtown Turf Field 2',
            date: 'NEXT FRIDAY • 10:00 PM',
            payment: '$50',
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Header / Command Center */}
            <header className="mb-16 border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldAlert className="w-8 h-8 text-[#cbff00]" />
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight text-white">
                            Referee <span className="text-[#cbff00]">Hub</span>
                        </h1>
                    </div>
                    <p className="text-gray-400 font-medium">Your tactical command center for match assignments.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Weekly Earnings</p>
                        <p className="text-2xl font-black text-[#cbff00]">$105.00</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Matches</p>
                        <p className="text-2xl font-black text-white">2 <span className="text-sm font-medium text-gray-500">assigned</span></p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Upcoming Slate Section */}
                <section>
                    <h2 className="text-2xl font-black italic uppercase mb-6 flex items-center gap-2 border-b border-white/10 pb-3 text-white">
                        <Calendar className="w-5 h-5 text-[#cbff00]" /> Upcoming Slate
                    </h2>
                    
                    <div className="space-y-4">
                        {upcomingMatches.length === 0 ? (
                            <div className="p-8 border border-white/10 bg-white/5 rounded-sm text-center">
                                <p className="text-gray-500 font-medium">No matches assigned. Check the Open Market.</p>
                            </div>
                        ) : (
                            upcomingMatches.map((match) => (
                                <div key={match.id} className="group border border-white/10 bg-white/5 rounded-sm p-5 hover:border-[#cbff00]/50 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-sm bg-[#cbff00]/10 text-[#cbff00] mb-3 inline-block">
                                                {match.matchStyle} Mode
                                            </span>
                                            <h3 className="text-xl font-black uppercase tracking-tight">{match.title}</h3>
                                        </div>
                                        <span className="text-lg font-black text-white">{match.payment}</span>
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                                            <Calendar className="w-4 h-4" /> {match.date}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                                            <MapPin className="w-4 h-4" /> {match.location}
                                        </div>
                                    </div>
                                    <button 
                                        className="w-full py-3 flex items-center justify-center gap-2 rounded-sm font-black uppercase tracking-widest text-sm transition-transform hover:scale-[1.02]"
                                        style={{ backgroundImage: 'linear-gradient(to right, #cbff00, #cbff00)', color: '#000000' }}
                                    >
                                        Check In <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Open Market Section */}
                <section>
                    <h2 className="text-2xl font-black italic uppercase mb-6 flex items-center gap-2 border-b border-white/10 pb-3 text-white">
                        <Trophy className="w-5 h-5 text-gray-400" /> Open Market
                    </h2>
                    
                    <div className="space-y-4">
                        {openMarket.length === 0 ? (
                            <div className="p-8 border border-white/10 bg-white/5 rounded-sm text-center">
                                <p className="text-gray-500 font-medium">No open matches available right now.</p>
                            </div>
                        ) : (
                            openMarket.map((match) => (
                                <div key={match.id} className="group border border-white/10 bg-black rounded-sm p-5 hover:border-white/30 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-sm bg-white/10 text-gray-300 mb-3 inline-block">
                                                {match.matchStyle} Mode
                                            </span>
                                            <h3 className="text-xl font-black uppercase tracking-tight text-gray-300 group-hover:text-white transition-colors">{match.title}</h3>
                                        </div>
                                        <span className="text-lg font-black text-gray-400 group-hover:text-white transition-colors">{match.payment}</span>
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                            <Calendar className="w-4 h-4" /> {match.date}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                            <MapPin className="w-4 h-4" /> {match.location}
                                        </div>
                                    </div>
                                    <button 
                                        className="w-full py-3 flex items-center justify-center gap-2 border border-white/20 rounded-sm font-black uppercase tracking-widest text-sm text-white hover:bg-white hover:text-black transition-all"
                                    >
                                        Claim Match
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
