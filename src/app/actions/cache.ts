'use server';

import { revalidatePath } from 'next/cache';

export async function clearGlobalCache() {
    revalidatePath('/', 'layout');
}
