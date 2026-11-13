
"use client";

import { ScrollspyMenu } from "@/partials/navbar/scrollspy-menu";

export default function EmployeeSettingsSidebar({ activeStep }) {
  const items = [
    {
      title: "Basic Details",
      target: "basic_details",
      active: true,
    },
    {
      title: "Family Details",
      target: "family_details",
      active: activeStep === "family_details",
    },
    {
      title: "Professional Detail",
      target: "professional_detail",
      active: activeStep === "professional_detail",
    },
    {
      title: "Checklist Detail",
      target: "checklist_detail",
      active: activeStep === "checklist_detail",
    },
     {
      title: "Email /Print Template List",
      target: "email_print_template_list",
      active: activeStep === "email_print_template_list",
    },
     {
      title: "Salary Documents",
      target: "salary_documents",
      active: activeStep === "salary_documents",
    },
     {
      title: "Follow Up",
      target: "follow_up",
      active: activeStep === "follow_up",
    },
     {
      title: "HR Questionnaire",
      target: "hr_questionnaire",
      active: activeStep === "hr_questionnaire",
    },
     {
      title: "Legal Proceed",
      target: "legal_proceed",
      active: activeStep === "legal_proceed",
    },
     {
      title: "Email Read/Received",
      target: "email_read_received",
      active: activeStep === "email_read_received",
    },
  ];

  return <ScrollspyMenu items={items} />;
}
