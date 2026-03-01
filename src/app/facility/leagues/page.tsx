import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trophy, Users, Calendar, Activity, Info, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { LeagueRowActions } from '@/components/facility/LeagueRowActions';

export const metadata = {
  title: 'League Management | Pitch Side',
  description: 'Manage facility leagues and tournaments',
};

export default async function LeaguesDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get the facility ID from the user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('facility_id, system_role, role')
    .eq('id', user.id)
    .single();

  const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';
  const facilityId = profile?.facility_id;

  if (!isSuperAdmin && !facilityId) {
    redirect('/');
  }

  // Fetch leagues with activity type name and team counts
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select(`
      *,
      activity_types (name),
      teams (count)
    `)
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching leagues:", error);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-heading font-black italic uppercase tracking-tight text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-pitch-accent" />
            League Engine
          </h1>
          <p className="text-gray-400 mt-2 font-medium">
            Manage seasons, track registrations, and oversee team rosters.
          </p>
        </div>

        <Link
          href="/facility/leagues/create"
          className="flex items-center gap-2 bg-pitch-accent hover:bg-white text-pitch-black font-bold px-6 py-3 rounded-sm transition-all shadow-lg hover:shadow-pitch-accent/20 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          CREATE LEAGUE
        </Link>
      </div>

      {/* Leagues Data Table */}
      <div className="bg-pitch-card border border-white/10 rounded-lg overflow-hidden relative">
        {/* Glow effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pitch-accent via-blue-500 to-pitch-accent opacity-50"></div>

        {(!leagues || leagues.length === 0) ? (
          <div className="p-12 text-center flex flex-col items-center justify-center border-t border-white/5">
            <div className="w-20 h-20 bg-pitch-black border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-xl">
              <Trophy className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No leagues found</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-8 font-medium">
              Start your first season! Build a league, configure pricing, and open up team registrations for your facility.
            </p>
            <Link
              href="/facility/leagues/create"
              className="flex items-center gap-2 border border-pitch-accent text-pitch-accent hover:bg-pitch-accent hover:text-pitch-black font-bold uppercase tracking-wider px-8 py-3 rounded-sm transition-all"
            >
              <Plus className="w-5 h-5" />
              Build First League
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/50 border-b border-white/10">
                  <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider w-1/4">League Name & Season</th>
                  <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider">Sport</th>
                  <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider text-center">Teams</th>
                  <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider">Status</th>
                  <th className="p-5 font-heading italic uppercase text-gray-400 text-sm tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leagues.map((league) => (
                  <tr key={league.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-5">
                      <div className="font-bold text-lg text-white group-hover:text-pitch-accent transition-colors">
                        {league.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {league.season || 'TBD'}
                        {league.start_date && ` (${format(new Date(league.start_date), 'MMM d, yyyy')})`}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 text-gray-300 bg-white/5 w-max px-3 py-1 rounded-full text-sm font-medium border border-white/5">
                        <Activity className="w-4 h-4 text-pitch-accent" />
                        {league.activity_types?.name || league.sport}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1.5 text-xl font-bold font-numeric text-white">
                          <Users className="w-5 h-5 text-gray-500" />
                          {league.teams?.[0]?.count || 0}
                          <span className="text-gray-500 text-sm font-normal">/ {league.max_teams || '∞'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-2">
                        {/* Overall Status Banner */}
                        {league.status === 'active' && (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 w-max rounded-sm text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
                            Active Season
                          </span>
                        )}
                        {league.status === 'registration' && (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 w-max rounded-sm text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                            Registration Open
                          </span>
                        )}
                        {league.status === 'draft' && (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 w-max rounded-sm text-xs font-bold uppercase tracking-wider bg-gray-500/10 text-gray-400 border border-gray-500/20">
                            Draft (Hidden)
                          </span>
                        )}
                        {league.status === 'completed' && (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 w-max rounded-sm text-xs font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                            Completed
                          </span>
                        )}

                        {/* Registration Flag */}
                        {league.registration_open && league.status !== 'registration' && (
                          <span className="text-xs text-blue-400 font-bold flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div> Signups Active
                          </span>
                        )}
                      </div>
                    </td>
                    <LeagueRowActions leagueId={league.id} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
