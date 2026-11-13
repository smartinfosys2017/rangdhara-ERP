
"use client";

import { ScrollspyMenu } from "@/partials/navbar/scrollspy-menu";

export default function CandidateSettingsSidebar({ activeStep }) {
  const items = [
    {
      title: "Basic Details",
      target: "basic_details",
      active: true,
    },
    {
      title: "Professional Detail",
      target: "professional_detail",
      active: activeStep === "professional_detail",
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
      title: "Email Read/Received",
      target: "email_read_received",
      active: activeStep === "email_read_received",
    },
  ];

  return <ScrollspyMenu items={items} />;
}
