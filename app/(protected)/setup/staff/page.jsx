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

import StaffList from './components/staff-list';

export const metadata = {
  title: 'Staff',
  description: 'Manage staff members',
};

export default async function Page() {
  const active = await isMenuActiveBySlug("staff");
  
    if (!active) {
      redirect("/404");
    }
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            {/* <ToolbarTitle>Staff</ToolbarTitle>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">
                    Setup
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Staff</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb> */}
          </ToolbarHeading>
          <ToolbarActions />
        </Toolbar>
      </Container>
      <Container>
        <StaffList />
      </Container>
    </>
  );
}