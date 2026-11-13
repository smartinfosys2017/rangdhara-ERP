
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

import CandidateBasicDetails from "./candidate-basic-details";
import CandidateSettingsSidebar from "./candidate-sidebar";
import ProfessionalDetails from "./candidate-professional-details";
// import CandidateChecklistDetails from "./candidate-checklist-details";

export default function CandidateAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  const mobileMode = useIsMobile();
  const [viewportHeight] = useViewport();

  const [sidebarHeight, setSidebarHeight] = useState(0);

  const [activeStep, setActiveStep] = useState("basic_details");

  const [createdCandidate, setCreatedCandidate] = useState(null);

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
      setCreatedCandidate(null);
    }
  }, [open]);

  /*
  |--------------------------------------------------------------------------
  | Close Dialog
  |--------------------------------------------------------------------------
  */

  const handleClose = () => {
    setActiveStep("basic_details");
    setCreatedCandidate(null);

    closeDialog?.();
  };

  /*
  |--------------------------------------------------------------------------
  | Basic Details Success
  |--------------------------------------------------------------------------
  */

  const handleBasicDetailsSuccess = async (candidate) => {
    if (!candidate?.id) {
      console.error("Created candidate ID is missing:", candidate);
      return;
    }
    // try {
    //   await onSuccess?.(candidate);

    //   handleClose();
    // } catch (error) {
    //   console.error("CANDIDATE SAVE SUCCESS ERROR:", error);
    // }

    setCreatedCandidate(candidate);
    setActiveStep("professional_details");
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
    if (step === "professional_details" && createdCandidate?.id) {
      setActiveStep("professional_details");
      return;
    }

    if (step === "checklist_details" && createdCandidate?.id) {
      setActiveStep("checklist_details");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Professional Details Success
  |--------------------------------------------------------------------------
  */

  const handleProfessionalSuccess = async (professionalData) => {
    if (!createdCandidate?.id) return;

    setCreatedCandidate((previous) => ({
      ...previous,
      professionalDetail: professionalData || null,
    }));
     try {
      await onSuccess?.(candidate);

      handleClose();
    } catch (error) {
      console.error("CANDIDATE professionalData SAVE SUCCESS ERROR:", error);
    }
    // setActiveStep("checklist_details");
  };

  /*
  |--------------------------------------------------------------------------
  | Checklist Success
  |--------------------------------------------------------------------------
  */

  const handleChecklistSuccess = async (checklistData) => {
    if (!createdCandidate?.id) return;

    const candidateData = {
      ...createdCandidate,
      checklistDetails: checklistData || [],
    };

    try {
      await onSuccess?.(candidateData);
      handleClose();
    } catch (error) {
      console.error("Candidate WIZARD SUCCESS ERROR:", error);
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
                Candidate -{" "}
                {activeStep === "basic_details"
                  ? "Basic Details"
                    : activeStep === "professional_details"
                      ? "Professional Details"
                      : "Candidate Checklist"}
              </h1>

              <p className="text-sm text-secondary-foreground">
                {activeStep === "basic_details"
                  ? "Enter candidate personal and professional information."
                    : activeStep === "professional_details"
                      ? "Add candidate professional information."
                      : "Review and update candidate checklist items."}
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
                <CandidateSettingsSidebar
                  activeStep={activeStep}
                  onStepChange={handleStepChange}
                  hasCandidate={!!createdCandidate?.id}
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
                  <CandidateBasicDetails
                    open={open}
                    mode="add"
                    candidate={null}
                    onSuccess={handleBasicDetailsSuccess}
                    closeDialog={handleClose}
                  />
                </div>
              )}

              {/* PROFESSIONAL DETAILS */}

              {activeStep === "professional_details" &&
                createdCandidate?.id && (
                  <div id="professional_details">
                    <ProfessionalDetails
                      mode="add"
                      candidateId={createdCandidate.id}
                      onPrevious={() =>
                        setActiveStep("basic_details")
                      }
                      onSuccess={handleProfessionalSuccess}
                      closeDialog={handleClose}
                    />
                  </div>
                )}

              {/* Candidate CHECKLIST */}

              {/* {activeStep === "checklist_details" &&
                createdCandidate?.id && (
                  <div id="checklist_details">
                    <CandidateChecklistDetails
                      candidateId={createdCandidate.id}
                      onPrevious={() =>
                        setActiveStep("professional_details")
                      }
                      onSuccess={handleChecklistSuccess}
                      closeDialog={handleClose}
                    />
                  </div>
                )} */}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}