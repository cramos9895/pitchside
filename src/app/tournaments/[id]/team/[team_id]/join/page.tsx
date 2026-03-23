import { redirect } from 'next/navigation';

export default async function JoinRedirect({ params }: { params: { id: string, team_id: string } }) {
    const { team_id } = await params;
    redirect(`/invite/${team_id}`);
}
