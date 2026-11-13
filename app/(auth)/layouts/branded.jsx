
import Link from 'next/link';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';

import { useSettings } from '@/providers/settings-provider';
export function BrandedLayout({ children }) {
  const { getOption, settingsLoading } = useSettings();

  const companyName =
    getOption('company.company_name') || 'Rangdhara Fabrics';

  return (
    <>
      <style>
        {`
          .branded-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/bg-1.png')}');
          }
          .dark .branded-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/bg-1-dark.png')}');
          }
        `}
      </style>
      <div className="grid lg:grid-cols-2 grow">
        <div className="flex justify-center items-center p-8 lg:p-10 order-2 lg:order-1">
          <Card className="w-full max-w-[400px]">
            <CardContent className="p-6">{children}</CardContent>
          </Card>
        </div>

        <div className="lg:rounded-xl lg:border lg:border-border lg:m-5 order-1 lg:order-2 bg-top xxl:bg-center xl:bg-cover bg-no-repeat branded-bg">
          <div className="flex flex-col p-8 lg:p-16 gap-4">
            <Link href="/">
              <img
                src={toAbsoluteUrl('/media/app/rangfavicon.png')}
                className="h-[28px] max-w-none"
                alt="" />

            </Link>

            <div className="flex flex-col gap-3">
              <h3 className="text-2xl font-semibold text-mono">
              {companyName} Dashboard Access
              </h3>
              <div className="text-base font-medium text-secondary-foreground">
                A robust authentication gateway ensuring
                <br /> secure&nbsp;
                <span className="text-mono font-semibold">
                  efficient user access
                </span>
                &nbsp;to the {companyName}
                <br /> Dashboard interface.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>);

}