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

import BrandManufacturerList from "./components/brand-manufacturer-list";

export const metadata = {
  title: "Brand/Manufacturer",
  description: "Manage Brand/Manufacturer.",
};

export default async function Page() {
  const active = await isMenuActiveBySlug("brand_manufacturer");
  
  if (!active) {
    redirect("/404");
  }
  return (
    <>
      {/* <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>Brand Manufacturer</ToolbarTitle>

            <Breadcrumb>
              <BreadcrumbList>              
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Inventrory</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Brand Manufacturer</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container> */}

      <Container>
        <BrandManufacturerList />
      </Container>
    </>
  );
}
