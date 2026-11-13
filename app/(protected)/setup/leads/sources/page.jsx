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

import SourceList from './components/source-list';

export const metadata = {
  title: 'Sources',
  description: 'Manage Sources.',
};

export default async function Page() {
  const active = await isMenuActiveBySlug("sources");
  
  if (!active) {
    redirect("/404");
  }    
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>
              Sources
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
                    Source Management
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container>

      <Container>
        <SourceList />
      </Container>
    </>
  );
}