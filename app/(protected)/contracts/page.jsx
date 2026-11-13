import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Container } from "@/components/common/container";

import {
    Toolbar,
    ToolbarActions,
    ToolbarHeading,
    ToolbarTitle,
} from "@/components/common/toolbar";

import ContractList from "./components/contracts-list";

export const metadata = {
    title: "Contract",
    description: "Manage Contract.",
};

export default function Page() {
    return (
        <>
            <Container>
                <Toolbar>
                    <ToolbarHeading>
                        <ToolbarTitle>Contracts</ToolbarTitle>

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
                                        Contract Management
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </ToolbarHeading>

                    <ToolbarActions />
                </Toolbar>
            </Container>

            <Container>
                <ContractList />
            </Container>
        </>
    );
}
