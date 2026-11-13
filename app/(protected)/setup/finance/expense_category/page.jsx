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

import ExpenseCategoryList from './components/expense-category-list';

export const metadata = {
  title: 'Expense Categories',
  description: 'Manage expense categories.',
};

export default async function Page() {
  const active = await isMenuActiveBySlug("expense-category");
  
  if (!active) {
    redirect("/404");
  }
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            {/* <ToolbarTitle>
              Expense Categories
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
                    Expense Category Management
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb> */}
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container>

      <Container>
        <ExpenseCategoryList />
      </Container>
    </>
  );
}