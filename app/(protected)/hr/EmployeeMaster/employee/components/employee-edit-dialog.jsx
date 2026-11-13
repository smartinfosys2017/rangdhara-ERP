
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import EmployeeSettingsSidebar from "./employee-sidebar";
import EmployeeBasicDetails from "./employee-basic-details";
import EmployeeFamilyDetails from "./employee-family-details";
import ProfessionalDetails from "./employee-professional-details";
import EmployeeChecklistDetails from "./employee-checklist-details";

export default function EmployeeEditDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}) {
  const [dialogOpen, setDialogOpen] = useState(open);
  const [activeStep, setActiveStep] = useState("basic_details");
  const [updatedEmployee, setUpdatedEmployee] = useState(employee || null);

  useEffect(() => {
    setDialogOpen(open);

    if (open) {
      setActiveStep("basic_details");
      setUpdatedEmployee(employee || null);
    }
  }, [open, employee]);

  const handleClose = useCallback(
    (nextOpen) => {
      setDialogOpen(nextOpen);

      if (!nextOpen) {
        setActiveStep("basic_details");
        setUpdatedEmployee(employee || null);
      }

      onOpenChange?.(nextOpen);
    },
    [employee, onOpenChange]
  );

  /*
  |--------------------------------------------------------------------------
  | Basic Details Success
  |--------------------------------------------------------------------------
  */

  const handleBasicDetailsSuccess = useCallback((updatedData) => {
    const data = updatedData?.data || updatedData;

    setUpdatedEmployee((previous) => ({
      ...(previous || {}),
      ...(data || {}),
    }));

    setActiveStep("family_details");
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Family Details Success
  |--------------------------------------------------------------------------
  */

  const handleFamilyDetailsSuccess = useCallback(
    (familyData) => {
      setUpdatedEmployee((previous) => ({
        ...(previous || employee || {}),
        familyDetail: familyData || null,
      }));

      setActiveStep("professional_details");
    },
    [employee]
  );

  /*
  |--------------------------------------------------------------------------
  | Professional Details Success
  |--------------------------------------------------------------------------
  */

  const handleProfessionalSuccess = useCallback((professionalData) => {
    setUpdatedEmployee((previous) => ({
      ...(previous || {}),
      professionalDetail: professionalData || null,
    }));

    setActiveStep("checklist_details");
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Checklist Success
  |--------------------------------------------------------------------------
  */

  const handleChecklistSuccess = useCallback(
    (checklistData) => {
      const finalEmployee = {
        ...(updatedEmployee || employee || {}),
        checklistDetails: checklistData || [],
      };

      onSuccess?.(finalEmployee);
      handleClose(false);
    },
    [updatedEmployee, employee, onSuccess, handleClose]
  );

  if (!employee) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="md:sticky md:top-0 md:self-start">
            <EmployeeSettingsSidebar
              activeStep={activeStep}
              onStepChange={setActiveStep}
              hasEmployee={true}
            />
          </aside>

          <div className="min-w-0">
            {/* BASIC DETAILS */}

            {activeStep === "basic_details" && (
              <EmployeeBasicDetails
                open={dialogOpen}
                mode="edit"
                employee={updatedEmployee || employee}
                onSuccess={handleBasicDetailsSuccess}
                closeDialog={() => handleClose(false)}
              />
            )}

            {/* FAMILY DETAILS */}

            {activeStep === "family_details" && (
              <EmployeeFamilyDetails
                mode="edit"
                employeeId={updatedEmployee?.id || employee.id}
                onPrevious={() => setActiveStep("basic_details")}
                onSuccess={handleFamilyDetailsSuccess}
                closeDialog={() => handleClose(false)}
              />
            )}

            {/* PROFESSIONAL DETAILS */}

            {activeStep === "professional_details" && (
              <ProfessionalDetails
                mode="edit"
                employeeId={updatedEmployee?.id || employee.id}
                onPrevious={() => setActiveStep("family_details")}
                onSuccess={handleProfessionalSuccess}
                closeDialog={() => handleClose(false)}
              />
            )}

            {/* EMPLOYEE CHECKLIST */}

            {activeStep === "checklist_details" && (
              <EmployeeChecklistDetails
                employeeId={updatedEmployee?.id || employee.id}
                onPrevious={() => setActiveStep("professional_details")}
                onSuccess={handleChecklistSuccess}
                closeDialog={() => handleClose(false)}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}