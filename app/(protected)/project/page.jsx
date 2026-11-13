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

import ProjectList from "./components/project-list";

export const metadata = {
    title: "Project",
    description: "Manage Project.",
};

export default async function Page() {
    const active = await isMenuActiveBySlug("project");
  
    if (!active) {
      redirect("/404");
    }
    return (
        <>
            <Container>
                <Toolbar>
                    <ToolbarHeading>
                        <ToolbarTitle>Projects</ToolbarTitle>

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
                                        Project Management
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </ToolbarHeading>

                    <ToolbarActions />
                </Toolbar>
            </Container>

            <Container>
                <ProjectList />
            </Container>
        </>
    );
}
