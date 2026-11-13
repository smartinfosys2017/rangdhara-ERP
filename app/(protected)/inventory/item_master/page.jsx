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

import ItemMasterList from "./components/item-master-list";

export const metadata = {
  title: "Item",
  description: "Manage Item.",
};

export default async function Page() {
  const active = await isMenuActiveBySlug("item-master");
  
  if (!active) {
    redirect("/404");
  }
  return (
    <>
      {/* <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>Item</ToolbarTitle>

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator />

                <BreadcrumbItem>
                  <BreadcrumbPage>Item Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container> */}

      <Container>
        <ItemMasterList />
      </Container>
    </>
  );
}
