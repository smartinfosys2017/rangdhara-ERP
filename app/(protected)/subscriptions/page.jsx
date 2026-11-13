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

import SubscriptionList from "./components/subscription-list";

export const metadata = {
    title: "Subscriptions",
    description: "Manage Subscriptions.",
};

export default function Page() {
    return (
        <>
            <Container>
                <Toolbar>
                    <ToolbarHeading>
                        <ToolbarTitle>Subscriptions</ToolbarTitle>

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
                                        Subscription Management
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </ToolbarHeading>

                    <ToolbarActions />
                </Toolbar>
            </Container>

            <Container>
                <SubscriptionList />
            </Container>
        </>
    );
}
