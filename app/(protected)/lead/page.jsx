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

import LeadList from "./components/lead-list";

export const metadata = {
    title: "Lead",
    description: "Manage Lead.",
};

export default async function Page() {
    const active = await isMenuActiveBySlug("lead");
  
    if (!active) {
      redirect("/404");
    }

    return (
        <>
            <Container>
                <Toolbar>
                    <ToolbarHeading>
                        <ToolbarTitle>Leads</ToolbarTitle>

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
                                        Lead Management
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </ToolbarHeading>

                    <ToolbarActions />
                </Toolbar>
            </Container>

            <Container>
                <LeadList />
            </Container>
        </>
    );
}