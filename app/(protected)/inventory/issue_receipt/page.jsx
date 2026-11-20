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

import IssueReceiptList from "./components/issue-receipt-list";

export const metadata = {
  title: "Stock Movement",
  description: "Manage Stock Movement.",
};

export default async function Page() {
  const active = await isMenuActiveBySlug("inventory-issue-receipt");
  
    if (!active) {
      redirect("/404");
    }
  return (
    <>
      {/* <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>Stock Movement</ToolbarTitle>

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator />

                <BreadcrumbItem>
                  <BreadcrumbPage>Stock Movement Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container> */}

      <Container>
        <IssueReceiptList />
      </Container>
    </>
  );
}
