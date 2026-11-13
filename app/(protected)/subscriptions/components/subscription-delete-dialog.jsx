"use client";

import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

// =====================================================
// COMPONENT
// =====================================================

export default function SubscriptionDeleteDialog({
    open,

    closeDialog,

    subscription,

    onSuccess,
}) {
    if (!subscription) {
        return null;
    }

    const handleDelete = () => {
        toast.success("Subscription deleted successfully");

        onSuccess?.();
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    closeDialog();
                }
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Subscription</DialogTitle>

                    <DialogDescription>
                        Are you sure you want to delete this subscription?
                    </DialogDescription>
                </DialogHeader>

                <div className="py-5">
                    <div className="rounded-md border bg-muted/30 p-4">
                        <p className="text-sm text-muted-foreground">
                            Subscription Name
                        </p>

                        <p className="font-semibold">
                            {subscription.subscriptionName}
                        </p>

                        <p className="mt-3 text-sm text-muted-foreground">
                            Customer
                        </p>

                        <p className="font-medium">{subscription.customer}</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>
                        Cancel
                    </Button>

                    <Button variant="destructive" onClick={handleDelete}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
