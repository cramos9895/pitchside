'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedProfile } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

export async function saveTemplate(title: string, formType: string, templateData: any) {
    const profile = await getAuthenticatedProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('event_templates')
        .insert({
            admin_id: profile.id,
            title,
            form_type: formType,
            template_data: templateData
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving template:', error);
        throw new Error('Failed to save template');
    }

    revalidatePath('/admin');
    return { success: true, data };
}

export async function getTemplates(formType: string) {
    const profile = await getAuthenticatedProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('event_templates')
        .select('*')
        .eq('admin_id', profile.id)
        .eq('form_type', formType)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching templates:', error);
        throw new Error('Failed to fetch templates');
    }

    return data;
}

export async function deleteTemplate(templateId: string) {
    const profile = await getAuthenticatedProfile();
    const supabase = await createClient();

    const { error } = await supabase
        .from('event_templates')
        .delete()
        .eq('id', templateId)
        .eq('admin_id', profile.id);

    if (error) {
        console.error('Error deleting template:', error);
        throw new Error('Failed to delete template');
    }

    revalidatePath('/admin');
    return { success: true };
}
