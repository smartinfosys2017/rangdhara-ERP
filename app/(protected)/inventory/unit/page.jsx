import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Container } from "@/components/common/container";

import { isMenuActiveBySlug } from "@/lib/module-access";
import { redirect } from "next/navigation";

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from "@/components/common/toolbar";

import ItemGroupList from "./components/unit-list";

export const metadata = {
  title: "Unit",
  description: "Manage Unit.",
};

export default async function Page() {
  const active = await isMenuActiveBySlug("unit");
  
  if (!active) {
    redirect("/404");
  }
  return (
    <>
      {/* <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>Unit</ToolbarTitle>

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator />

                <BreadcrumbItem>
                  <BreadcrumbPage>Unit Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container> */}

      <Container>
        <ItemGroupList />
      </Container>
    </>
  );
}
