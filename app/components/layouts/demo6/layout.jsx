'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { addDays, format } from 'date-fns';
import { CalendarDays, Download, Printer, FileSpreadsheet, Mail } from 'lucide-react';

import { useBodyClass } from '@/hooks/use-body-class';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/providers/settings-provider';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from
  '@/components/ui/popover';
import { Footer } from './components/footer';
import { Header } from './components/header';
import { Sidebar } from './components/sidebar';
import { Toolbar, ToolbarActions, ToolbarHeading } from './components/toolbar';

const Demo6Layout = ({ children }) => {
  const isMobile = useIsMobile();
  const { setOption } = useSettings();
  const pathname = usePathname();

  const [date, setDate] = useState({
    from: new Date(2025, 0, 20),
    to: addDays(new Date(2025, 0, 20), 20)
  });

  useBodyClass(`
    [--header-height:60px]
    [--sidebar-width:270px]
    lg:overflow-hidden
    bg-muted!
  `);

  useEffect(() => {
    setOption('layout', 'demo6');
  }, [setOption]);

  return (
    <>
      <div className="flex grow">
        {!isMobile && <Sidebar />}

        {isMobile && <Header />}

        <div className="flex flex-col lg:flex-row grow pt-(--header-height) lg:pt-0">
          <div className="flex flex-col grow items-stretch rounded-xl bg-background border border-input lg:ms-(--sidebar-width) mt-0 lg:mt-[15px] m-[15px]">
            <div className="flex flex-col grow kt-scrollable-y-auto [--kt-scrollbar-width:auto] pt-5">
              <main className="grow" role="content">
                {!pathname.includes('/user-management') && !pathname.includes('/estimate-request') && !pathname.includes('/task') && !pathname.includes('/customers') &&  !pathname.includes('/employee') &&
                  <Toolbar>
                    <ToolbarHeading />

                    <ToolbarActions>
                      <>
                        {["/item_group", "/product_type", "/transaction_type","/item_master","/issue_receipt","/inventory_register","/inventory_change_log","/Holiday","/BreakTime","/Shift","/Security","/Position","/Checklist","/ContactCategory","/EmployeeCandidate"].some(route => pathname.includes(route)) && (
                          <div className="flex items-center justify-end">
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                              {!pathname.includes('/transaction_type') && !pathname.includes('/inventory_change_log') &&(
                              <Button
                                type="button"
                                id="Print"
                                variant="outline"
                                className="w-full sm:w-auto"
                              >
                                <Printer className="mr-2 size-4" />
                                Print
                              </Button>
                              )}
                              <Button
                                type="button"
                                id="Export"
                                variant="outline"
                                className="w-full sm:w-auto"
                              >
                                <Download className="mr-2 size-4" />
                                Export
                              </Button>

                              <Button
                                type="button"
                                id="Email"
                                variant="outline"
                                className="w-full sm:w-auto"
                              >
                                <Mail className="mr-2 size-4" />
                                Email Report
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    </ToolbarActions>
                  </Toolbar>
                }

                {children}
              </main>

              <Footer />
            </div>
          </div>
        </div>
      </div>
    </>);

};

export { Demo6Layout };
export default Demo6Layout;