'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// -- Resource Types --
export async function createResourceType(formData: FormData) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await adminSupabase.from('profiles').select('role, system_role').eq('id', user.id).single();
    if (profile?.role !== 'master_admin' && profile?.system_role !== 'super_admin') {
        return { error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name) return { error: 'Name is required' };

    const { error } = await adminSupabase
        .from('resource_types')
        .insert([{ name, description }]);

    if (error) {
        if (error.code === '23505') return { error: 'A resource type with this name already exists' };
        return { error: 'Failed to create resource type' };
    }

    revalidatePath('/admin/settings/resources');
    return { success: true };
}

export async function deleteResourceType(id: string) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await adminSupabase.from('profiles').select('role, system_role').eq('id', user.id).single();
    if (profile?.role !== 'master_admin' && profile?.system_role !== 'super_admin') {
        return { error: 'Unauthorized' };
    }

    const { error } = await adminSupabase
        .from('resource_types')
        .delete()
        .eq('id', id);

    if (error) return { error: 'Failed to delete resource type. It may be in use by facilities.' };

    revalidatePath('/admin/settings/resources');
    return { success: true };
}

// -- Activity Types --
export async function updateResourceType(id: string, formData: FormData) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await adminSupabase.from('profiles').select('role, system_role').eq('id', user.id).single();
    if (profile?.role !== 'master_admin' && profile?.system_role !== 'super_admin') {
        return { error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name) return { error: 'Name is required' };

    const { error } = await adminSupabase
        .from('resource_types')
        .update({ name, description })
        .eq('id', id);

    if (error) {
        if (error.code === '23505') return { error: 'A resource type with this name already exists' };
        return { error: 'Failed to update resource type' };
    }

    revalidatePath('/admin/settings/resources');
    return { success: true };
}
export async function createGlobalActivityType(formData: FormData) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await adminSupabase.from('profiles').select('role, system_role').eq('id', user.id).single();
    if (profile?.role !== 'master_admin' && profile?.system_role !== 'super_admin') {
        return { error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const colorCode = formData.get('colorCode') as string || '#00FF00';

    if (!name) return { error: 'Name is required' };

    const { error } = await adminSupabase
        .from('activity_types')
        .insert([{ name, color_code: colorCode }]);

    if (error) {
        if (error.code === '23505') return { error: 'An activity type with this name already exists' };
        return { error: 'Failed to create activity type' };
    }

    revalidatePath('/admin/settings/activities');
    return { success: true };
}

export async function deleteGlobalActivityType(id: string) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await adminSupabase.from('profiles').select('role, system_role').eq('id', user.id).single();
    if (profile?.role !== 'master_admin' && profile?.system_role !== 'super_admin') {
        return { error: 'Unauthorized' };
    }

    const { error } = await adminSupabase
        .from('activity_types')
        .delete()
        .eq('id', id);

    if (error) return { error: 'Failed to delete activity type. It may be in use.' };

    revalidatePath('/admin/settings/activities');
    return { success: true };
}

export async function updateGlobalActivityType(id: string, formData: FormData) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await adminSupabase.from('profiles').select('role, system_role').eq('id', user.id).single();
    if (profile?.role !== 'master_admin' && profile?.system_role !== 'super_admin') {
        return { error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const colorCode = formData.get('colorCode') as string || '#00FF00';

    if (!name) return { error: 'Name is required' };

    const { error } = await adminSupabase
        .from('activity_types')
        .update({ name, color_code: colorCode })
        .eq('id', id);

    if (error) {
        if (error.code === '23505') return { error: 'An activity type with this name already exists' };
        return { error: 'Failed to update activity type' };
    }

    revalidatePath('/admin/settings/activities');
    return { success: true };
}
