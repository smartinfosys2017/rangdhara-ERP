import { toast } from 'sonner';

export async function syncUsersAfterUpdate() {
  try {
    const response = await fetch('/api/sync/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'User synchronization failed.');
    }

    console.log('[USER SYNC SUCCESS]', result);

    if ((result?.stats?.failed ?? 0) > 0) {
      toast.warning('Profile saved, but user sync reported errors.');
    }

    return true;
  } catch (error) {
    console.error('[USER SYNC ERROR]', error);
    toast.error(error.message || 'User sync failed.');
    return false;
  }
}