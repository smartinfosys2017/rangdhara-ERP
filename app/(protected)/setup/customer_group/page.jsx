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

import CustomerGroupList from './components/customer-group-list';

export const metadata = {
  title: 'Customer Groups',
  description: 'Manage customer groups.',
};

export default async function Page() {
  const active = await isMenuActiveBySlug("customer-group");
  
  if (!active) {
    redirect("/404");
  }
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            {/* <ToolbarTitle>
              Customer Groups
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
                    Customer Groups
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb> */}
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container>

      <Container>
        <CustomerGroupList />
      </Container>
    </>
  );
}