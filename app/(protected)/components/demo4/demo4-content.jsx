import { Fragment } from 'react';
import { CreateTeam } from '@/partials/common/create-team';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Highlights, Teams } from '../demo1';

export function Demo4Content() {
  return (
    <div className="grid gap-5 lg:gap-7.5">
      {/* Process Mill Overview */}
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
          <CreateTeam
            image={
              <Fragment>
                <img
                  src={toAbsoluteUrl('/media/illustrations/32.svg')}
                  className="dark:hidden max-h-[180px]"
                  alt="Rangdhara Fabrics process mill"
                />

                <img
                  src={toAbsoluteUrl('/media/illustrations/32-dark.svg')}
                  className="light:hidden max-h-[180px]"
                  alt="Rangdhara Fabrics process mill"
                />
              </Fragment>
            }
            className="h-full"
            title="Welcome to Rangdhara Fabrics"
            subTitle={
              <Fragment>
                Manage fabric processing operations, raw material inventory,
                production activities, and team coordination from one place.
                <br />
                Monitor mill resources and streamline daily manufacturing
                workflows with a centralized dashboard.
              </Fragment>
            }
            engage={{
              path: '/inventory/issue_receipt',
              label: 'Manage Inventory',
              btnColor: 'primary',
            }}
          />
        </div>

        {/* Inventory Highlights */}
        <div className="lg:col-span-1">
          <Highlights />
        </div>
      </div>

      {/* Production Team */}
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-6">
          <Teams />
        </div>
      </div>
    </div>
  );
}