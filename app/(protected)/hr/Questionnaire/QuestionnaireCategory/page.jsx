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

import QuestionnaireCategoryList from "./components/questionnaire-category-list";

export const metadata = {
  title: "Questionnaire Category",
  description: "Manage Questionnaire Category.",
};

export default async function Page() {
  const active = await isMenuActiveBySlug("questionnaire-category");
  
  if (!active) {
    redirect("/404");
  }
  return (
    <>
      {/* <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>QuestionnaireCategory</ToolbarTitle>

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Setup</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Inventrory</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>QuestionnaireCategory</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container> */}

      
        <QuestionnaireCategoryList />
      
    </>
  );
}