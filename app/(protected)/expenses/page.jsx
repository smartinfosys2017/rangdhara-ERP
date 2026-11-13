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

import ExpensesList from "./components/expenses-list";

export const metadata = {
    title: "Expenses",
    description: "Manage Expenses.",
};

export default async function Page() {
    const active = await isMenuActiveBySlug("expenses");

    if (!active) {
      redirect("/404");
    }

    return (
        <>
            <Container>
                <Toolbar>
                    <ToolbarHeading>
                        <ToolbarTitle>Expensess</ToolbarTitle>

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
                                        Expenses Management
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </ToolbarHeading>

                    <ToolbarActions />
                </Toolbar>
            </Container>

            <Container>
                <ExpensesList />
            </Container>
        </>
    );
}