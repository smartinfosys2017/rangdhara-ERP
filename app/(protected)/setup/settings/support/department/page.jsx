import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { Container } from '@/components/common/container';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';

import DepartmentList from './components/department-list';
 
import { isMenuActiveBySlug } from "@/lib/module-access";
import { redirect } from "next/navigation";

export const metadata = {
  title: 'Departments',
  description: 'Manage departments.',
};

export default async function Page() {
  const active = await isMenuActiveBySlug("department");
  
    if (!active) {
      redirect("/404");
    }
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            {/* <ToolbarTitle>
              Departments
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
                    Department Management
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb> */}
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container>

      <Container>
        <DepartmentList />
      </Container>
    </>
  );
}