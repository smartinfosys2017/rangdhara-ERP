import { redirect } from 'next/navigation';

import { isMenuActiveBySlug } from '@/lib/module-access';

export default async function EmailSettingsPage() {
    const active = await isMenuActiveBySlug('email');

    if (!active) {
        redirect('/404');
    }

    redirect('/setup/settings/general/email/smtp');
}