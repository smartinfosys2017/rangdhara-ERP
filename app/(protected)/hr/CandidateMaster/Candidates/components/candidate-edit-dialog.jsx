
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import CandidateSettingsSidebar from "./candidate-sidebar";
import CandidateBasicDetails from "./candidate-basic-details";
import ProfessionalDetails from "./candidate-professional-details";
// import CandidateChecklistDetails from "./candidate-checklist-details";

export default function CandidateEditDialog({
  open,
  onOpenChange,
  candidate,
  onSuccess,
}) {
  const [dialogOpen, setDialogOpen] = useState(open);
  const [activeStep, setActiveStep] = useState("basic_details");
  const [updatedCandidate, setUpdatedCandidate] = useState(candidate || null);

  useEffect(() => {
    setDialogOpen(open);

    if (open) {
      setActiveStep("basic_details");
      setUpdatedCandidate(candidate || null);
    }
  }, [open, candidate]);

  const handleClose = useCallback(
    (nextOpen) => {
      setDialogOpen(nextOpen);

      if (!nextOpen) {
        setActiveStep("basic_details");
        setUpdatedCandidate(candidate || null);
      }

      onOpenChange?.(nextOpen);
    },
    [candidate, onOpenChange]
  );

  /*
  |--------------------------------------------------------------------------
  | Basic Details Success
  |--------------------------------------------------------------------------
  */

  const handleBasicDetailsSuccess = useCallback((updatedData) => {
    const data = updatedData?.data || updatedData;

    setUpdatedCandidate((previous) => ({
      ...(previous || {}),
      ...(data || {}),
    }));

    setActiveStep("professional_details");
  }, []);
  // Basic Details Update Success
  // const handleBasicDetailsSuccess = useCallback( async (updatedData) => {
  //     const data = updatedData?.data || updatedData;

  //     setUpdatedCandidate((previous) => ({
  //       ...(previous || {}),
  //       ...(data || {}),
  //     }));

  //     // Notify parent about successful update
  //     await onSuccess?.(data);

  //     // Close dialog after successful update
  //     handleClose(false);
  //   },
  //   [onSuccess, handleClose]
  // );

  /*
  |--------------------------------------------------------------------------
  | Professional Details Success
  |--------------------------------------------------------------------------
  */

  const handleProfessionalSuccess = useCallback(async (professionalData) => {
  try {
    const updatedData = {
      ...(updatedCandidate || {}),
      professionalDetail: professionalData || null,
    };

    setUpdatedCandidate(updatedData);

    await onSuccess?.(updatedData);

    // Move to the next step or close the dialog
    // setActiveStep("checklist_details");
    handleClose();

  } catch (error) {
    console.error("CANDIDATE SAVE SUCCESS ERROR:", error);
  }
}, [updatedCandidate, onSuccess]);

  /*
  |--------------------------------------------------------------------------
  | Checklist Success
  |--------------------------------------------------------------------------
  */

  const handleChecklistSuccess = useCallback(
    (checklistData) => {
      const finalCandidate = {
        ...(updatedCandidate || candidate || {}),
        checklistDetails: checklistData || [],
      };

      onSuccess?.(finalCandidate);
      handleClose(false);
    },
    [updatedCandidate, candidate, onSuccess, handleClose]
  );

  if (!candidate) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Edit Candidate</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="md:sticky md:top-0 md:self-start">
            <CandidateSettingsSidebar
              activeStep={activeStep}
              onStepChange={setActiveStep}
              hasCandidate={true}
            />
          </aside>

          <div className="min-w-0">
            {/* BASIC DETAILS */}

            {activeStep === "basic_details" && (
              <CandidateBasicDetails
                open={dialogOpen}
                mode="edit"
                candidate={updatedCandidate || candidate}
                onSuccess={handleBasicDetailsSuccess}
                closeDialog={() => handleClose(false)}
              />
            )}

            {/* PROFESSIONAL DETAILS */}

            {activeStep === "professional_details" && (
              <ProfessionalDetails
                mode="edit"
                candidateId={updatedCandidate?.id || candidate.id}
                onPrevious={() => setActiveStep("basic_details")}
                onSuccess={handleProfessionalSuccess}
                closeDialog={() => handleClose(false)}
              />
            )}

            {/* Candidate CHECKLIST */}
            {/* 
            {activeStep === "checklist_details" && (
              <CandidateChecklistDetails
                candidateId={updatedCandidate?.id || candidate.id}
                onPrevious={() => setActiveStep("professional_details")}
                onSuccess={handleChecklistSuccess}
                closeDialog={() => handleClose(false)}
              />
            )} */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}