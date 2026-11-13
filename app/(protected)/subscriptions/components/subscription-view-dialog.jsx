"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { formatDate } from "@/lib/helpers";

// =====================================================
// COMPONENT
// =====================================================

export default function SubscriptionViewDialog({
    open,

    closeDialog,

    subscription,
}) {
    if (!subscription) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    closeDialog();
                }
            }}
        >
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Subscription Details</DialogTitle>

                    <DialogDescription>
                        View subscription information.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-5">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Subscription Name
                        </p>

                        <p className="font-medium">
                            {subscription.subscriptionName}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">
                            Customer
                        </p>

                        <p className="font-medium">{subscription.customer}</p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Project</p>

                        <p className="font-medium">
                            {subscription.project || "-"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Status</p>

                        <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium">
                            {subscription.status}
                        </span>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">
                            Next Billing Cycle
                        </p>

                        <p>
                            {subscription.nextBillingCycle
                                ? formatDate(
                                      new Date(subscription.nextBillingCycle),
                                  )
                                : "-"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">
                            Date Subscribed
                        </p>

                        <p>
                            {subscription.dateSubscribed
                                ? formatDate(
                                      new Date(subscription.dateSubscribed),
                                  )
                                : "-"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">
                            Last Sent
                        </p>

                        <p>
                            {subscription.dateLastNotified
                                ? formatDate(
                                      new Date(subscription.dateLastNotified),
                                  )
                                : "-"}
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={closeDialog}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
