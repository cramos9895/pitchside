import { redirect } from 'next/navigation';

// Next.js 15 requires params to be a Promise
export default async function JoinRedirect({ params }: { params: Promise<{ id: string; team_id: string }> }) {
    const { team_id } = await params;
    redirect(`/invite/${team_id}`);
}
