'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  ContactRound,
  FileUser,
  MoveLeft,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { Button } from '@/components/ui/button';

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { Container } from '@/components/common/container';

import { CustomerViewSidebar } from './components/customer-view-sidebar';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';

import { CustomerProvider } from './components/customer-context';
import CustomerHero from './components/customer-hero';


export default function CustomerLayout({
  params,
  children,
}) {
  const { id } = use(params);

  const pathname = usePathname();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('details');


  /*
   * ---------------------------------------------------------
   * Customer Tabs
   * ---------------------------------------------------------
   */

  const navRoutes = useMemo(
    () => ({
      details: {
        title: 'Customer Details',
        icon: FileUser,
        path: `/customers/${id}`,
      },

      billing: {
        title: 'Billing & Shipping',
        icon: Building2,
        path: `/customers/${id}/billing-shipping`,
      },

      admins: {
        title: 'Customer Admins',
        icon: ContactRound,
        path: `/customers/${id}/admins`,
      },
    }),
    [id]
  );


  /*
   * ---------------------------------------------------------
   * Detect Active Tab From URL
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const found = Object.keys(navRoutes).find(
      (key) => pathname === navRoutes[key].path
    );

    if (found) {
      setActiveTab(found);
    } else {
      setActiveTab('details');
    }
  }, [navRoutes, pathname]);


  /*
   * ---------------------------------------------------------
   * Fetch Customer
   * ---------------------------------------------------------
   */

  const {
    data: customer,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['customer', id],

    queryFn: async () => {
      const response = await apiFetch(`/api/customers?id=${id}`);

      if (response.status === 404) {
        router.push('/customers');
        return null;
      }

      if (!response.ok) {
        const result = await response.json();

        throw new Error(
          result?.message || 'Failed to load customer'
        );
      }

      const result = await response.json();

      /*
       * Your API currently appears to return:
       *
       * {
       *   success: true,
       *   data: {...}
       * }
       *
       * So return the actual customer object.
       */

      return result?.data ?? result;
    },

    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,

    refetchOnWindowFocus: false,
    refetchOnReconnect: false,

    retry: 1,
  });


  /*
   * ---------------------------------------------------------
   * Tab Click
   * ---------------------------------------------------------
   */

  const handleTabClick = (key, path) => {
    setActiveTab(key);
    router.push(path);
  };


  return (
  <CustomerProvider
    customer={customer}
    isLoading={isLoading}
    isError={isError}
  >
    <Container>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-4">

        {/* LEFT SIDEBAR */}
        <aside className="lg:col-span-1">

          <div className="sticky top-24">
            <CustomerViewSidebar />
          </div>

        </aside>


        {/* RIGHT CONTENT */}
        <main className="space-y-5 lg:col-span-3">

          {/* Toolbar */}
          <Toolbar>

            <ToolbarHeading>

              <ToolbarTitle>
                Customer
              </ToolbarTitle>

              <Breadcrumb>

                <BreadcrumbList>

                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">
                      Home
                    </BreadcrumbLink>
                  </BreadcrumbItem>

                  <BreadcrumbSeparator />

                  <BreadcrumbItem>
                    <BreadcrumbLink href="/customers">
                      Customers
                    </BreadcrumbLink>
                  </BreadcrumbItem>

                  <BreadcrumbSeparator />

                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {customer?.company ||
                        customer?.name ||
                        `Customer #${id}`}
                    </BreadcrumbPage>
                  </BreadcrumbItem>

                </BreadcrumbList>

              </Breadcrumb>

            </ToolbarHeading>


            <ToolbarActions>

              <Button
                asChild
                variant="outline"
              >
                <Link href="/customers">
                  <MoveLeft />
                  Back to Customers
                </Link>
              </Button>

            </ToolbarActions>

          </Toolbar>


          {/* Customer Hero */}
          <CustomerHero
            customer={customer}
            isLoading={isLoading}
          />


          {/* CURRENT PAGE */}
          {children}


          {/* Actions */}
          <div className="mt-5 flex items-center justify-end gap-3 border-t pt-5">

            <Button
              asChild
              variant="outline"
            >
              <Link href="/customers">
                Cancel
              </Link>
            </Button>

            <Button
              type="submit"
              form="customer-form"
            >
              Save Customer
            </Button>

          </div>

        </main>

      </div>

    </Container>
  </CustomerProvider>
);
}