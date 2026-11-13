"use client";

import { Container } from "@/components/common/container";
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from "@/components/common/toolbar";

export default function GanttPage() {
  return (
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>Gantt</ToolbarTitle>
        </ToolbarHeading>

        <ToolbarActions />
      </Toolbar>

      <div className="rounded-xl border bg-background">
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-sm text-muted-foreground">
            No Tasks Found
          </div>
        </div>
      </div>
    </Container>
  );
}