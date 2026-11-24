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

import ProductionList from "./components/production-list";

export const metadata = {
  title: "Production",
  description: "Manage Production.",
};

export default async function Page() {
  const active = await isMenuActiveBySlug("production");

  if (!active) {
    redirect("/404");
  }
  return (
    <>
      <Container>
        <ProductionList />
      </Container>
    </>
  );
}