'use client';

import { useCallback } from 'react';

import { RecentUploads } from '@/app/(protected)/public-profile/profiles/default/components/recent-uploads';
import { BasicSettings, PersonalInfo } from './components';
import { syncUsersAfterUpdate } from '@/lib/sync-users';

export function AccountUserProfileContent() {
  const handleUserDataUpdated = useCallback(async () => {
    await syncUsersAfterUpdate();
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 lg:gap-7.5">
      <div className="col-span-1">
        <div className="grid gap-5 lg:gap-7.5">
          <PersonalInfo onUserDataUpdated={handleUserDataUpdated} />

          <BasicSettings
            title="Basic Settings"
            onUserDataUpdated={handleUserDataUpdated}
          />
        </div>
      </div>

      <div className="col-span-1">
        <div className="grid gap-5 lg:gap-7.5">
          {/* Other components */}
        </div>
      </div>
    </div>
  );
}