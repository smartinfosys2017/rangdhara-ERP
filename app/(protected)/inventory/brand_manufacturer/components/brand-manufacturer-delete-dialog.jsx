"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BrandManufacturerDeleteDialog({
    open,
    closeDialog,
    BrandManufacturer,
    onConfirm,
    loading = false,
}) {
    return (
        <AlertDialog
            open={open}
            onOpenChange={(value) => {
                if (!value && !loading) {
                    closeDialog();
                }
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Delete Brand/Manufacturer?
                    </AlertDialogTitle>

                    <AlertDialogDescription>
                        Are you sure you want to delete this
                        Brand/Manufacturer?

                        {BrandManufacturer && (
                            <div className="mt-3 space-y-1">
                                <p>
                                    <strong>Brand:</strong>{" "}
                                    {BrandManufacturer.brandName}
                                </p>
                            </div>
                        )}

                        <p className="mt-2">
                            This action cannot be undone.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>
                        Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                        disabled={loading || !BrandManufacturer?.id}
                        onClick={(event) => {
                            event.preventDefault();
                            onConfirm();
                        }}
                        className="bg-destructive text-white hover:bg-destructive/90"
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}