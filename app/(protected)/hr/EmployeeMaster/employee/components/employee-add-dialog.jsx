
"use client";

import { useEffect, useState } from "react";

import { useIsMobile } from "@/hooks/use-mobile";
import { useViewport } from "@/hooks/use-viewport";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";

import EmployeeBasicDetails from "./employee-basic-details";
import EmployeeFamilyDetails from "./employee-family-details";
import EmployeeSettingsSidebar from "./employee-sidebar";
import ProfessionalDetails from "./employee-professional-details";
import EmployeeChecklistDetails from "./employee-checklist-details";

export default function EmployeeAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  const mobileMode = useIsMobile();
  const [viewportHeight] = useViewport();

  const [sidebarHeight, setSidebarHeight] = useState(0);

  const [activeStep, setActiveStep] = useState("basic_details");

  const [createdEmployee, setCreatedEmployee] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Sidebar Height
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setSidebarHeight(Math.max(viewportHeight - 260, 200));
  }, [viewportHeight]);

  /*
  |--------------------------------------------------------------------------
  | Reset Wizard When Dialog Closes
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open) {
      setActiveStep("basic_details");
      setCreatedEmployee(null);
    }
  }, [open]);

  /*
  |--------------------------------------------------------------------------
  | Close Dialog
  |--------------------------------------------------------------------------
  */

  const handleClose = () => {
    setActiveStep("basic_details");
    setCreatedEmployee(null);

    closeDialog?.();
  };

  /*
  |--------------------------------------------------------------------------
  | Basic Details Success
  |--------------------------------------------------------------------------
  */

  const handleBasicDetailsSuccess = (employee) => {
    if (!employee?.id) {
      console.error("Created employee ID is missing:", employee);
      return;
    }

    setCreatedEmployee(employee);
    setActiveStep("family_details");
  };

  /*
  |--------------------------------------------------------------------------
  | Step Navigation
  |--------------------------------------------------------------------------
  */

  const handleStepChange = (step) => {
    if (step === "basic_details") {
      setActiveStep("basic_details");
      return;
    }

    if (step === "family_details" && createdEmployee?.id) {
      setActiveStep("family_details");
      return;
    }

    if (step === "professional_details" && createdEmployee?.id) {
      setActiveStep("professional_details");
      return;
    }

    if (step === "checklist_details" && createdEmployee?.id) {
      setActiveStep("checklist_details");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Family Details Success
  |--------------------------------------------------------------------------
  */

  const handleFamilyDetailsSuccess = async () => {
    if (!createdEmployee?.id) return;

    setActiveStep("professional_details");
  };

  /*
  |--------------------------------------------------------------------------
  | Professional Details Success
  |--------------------------------------------------------------------------
  */

  const handleProfessionalSuccess = async (professionalData) => {
    if (!createdEmployee?.id) return;

    setCreatedEmployee((previous) => ({
      ...previous,
      professionalDetail: professionalData || null,
    }));

    setActiveStep("checklist_details");
  };

  /*
  |--------------------------------------------------------------------------
  | Checklist Success
  |--------------------------------------------------------------------------
  */

  const handleChecklistSuccess = async (checklistData) => {
    if (!createdEmployee?.id) return;

    const employeeData = {
      ...createdEmployee,
      checklistDetails: checklistData || [],
    };

    try {
      await onSuccess?.(employeeData);
      handleClose();
    } catch (error) {
      console.error("EMPLOYEE WIZARD SUCCESS ERROR:", error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent
        className="mx-auto flex w-full max-w-[1320px] grow flex-col gap-0 overflow-hidden px-10 [&>button]:hidden"
        variant="fullscreen"
      >
        <DialogHeader>
          <DialogTitle />

          <div className="flex grow flex-wrap items-center justify-between gap-5 pb-7.5">
            <div className="flex flex-col justify-center gap-2">
              <h1 className="text-xl font-semibold leading-none text-mono">
                Employee -{" "}
                {activeStep === "basic_details"
                  ? "Basic Details"
                  : activeStep === "family_details"
                    ? "Family Details"
                    : activeStep === "professional_details"
                      ? "Professional Details"
                      : "Employee Checklist"}
              </h1>

              <p className="text-sm text-secondary-foreground">
                {activeStep === "basic_details"
                  ? "Enter employee personal and professional information."
                  : activeStep === "family_details"
                    ? "Add employee family and nominee information."
                    : activeStep === "professional_details"
                      ? "Add employee professional information."
                      : "Review and update employee checklist items."}
              </p>
            </div>

            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 grow gap-5 lg:gap-7.5">
          {/* SIDEBAR */}

          {!mobileMode && (
            <div
              className="w-[300px] shrink-0"
              style={{
                maxHeight: `${sidebarHeight}px`,
              }}
            >
              <ScrollArea className="h-full">
                <EmployeeSettingsSidebar
                  activeStep={activeStep}
                  onStepChange={handleStepChange}
                  hasEmployee={!!createdEmployee?.id}
                />
              </ScrollArea>
            </div>
          )}

          {/* FORM CONTENT */}

          <ScrollArea className="mb-5 min-w-0 grow py-0 pe-3">
            <div className="flex flex-col gap-5 lg:gap-7.5">
              {/* BASIC DETAILS */}

              {activeStep === "basic_details" && (
                <div id="basic_details">
                  <EmployeeBasicDetails
                    open={open}
                    mode="add"
                    employee={null}
                    onSuccess={handleBasicDetailsSuccess}
                    closeDialog={handleClose}
                  />
                </div>
              )}

              {/* FAMILY DETAILS */}

              {activeStep === "family_details" &&
                createdEmployee?.id && (
                  <div id="family_details">
                    <EmployeeFamilyDetails
                      mode="add"
                      employeeId={createdEmployee.id}
                      onPrevious={() =>
                        setActiveStep("basic_details")
                      }
                      onSuccess={handleFamilyDetailsSuccess}
                      closeDialog={handleClose}
                    />
                  </div>
                )}

              {/* PROFESSIONAL DETAILS */}

              {activeStep === "professional_details" &&
                createdEmployee?.id && (
                  <div id="professional_details">
                    <ProfessionalDetails
                      mode="add"
                      employeeId={createdEmployee.id}
                      onPrevious={() =>
                        setActiveStep("family_details")
                      }
                      onSuccess={handleProfessionalSuccess}
                      closeDialog={handleClose}
                    />
                  </div>
                )}

              {/* EMPLOYEE CHECKLIST */}

              {activeStep === "checklist_details" &&
                createdEmployee?.id && (
                  <div id="checklist_details">
                    <EmployeeChecklistDetails
                      employeeId={createdEmployee.id}
                      onPrevious={() =>
                        setActiveStep("professional_details")
                      }
                      onSuccess={handleChecklistSuccess}
                      closeDialog={handleClose}
                    />
                  </div>
                )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}