import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { Container } from '@/components/common/container';

import { isMenuActiveBySlug } from "@/lib/module-access";
import { redirect } from "next/navigation";

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';

import CurrencyList from './components/currency-list';

export const metadata = {
  title: 'currency',
  description: 'Manage currency.',
};

export default async function Page() {
  const active = await isMenuActiveBySlug("currencies");
  
  if (!active) {
    redirect("/404");
  }
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            {/* <ToolbarTitle>
              currency
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
                  <BreadcrumbPage>
                    currency Management
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb> */}
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container>

      <Container>
        <CurrencyList />
      </Container>
    </>
  );
}