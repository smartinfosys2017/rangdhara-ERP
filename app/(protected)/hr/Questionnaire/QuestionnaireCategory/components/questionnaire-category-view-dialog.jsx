
"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";

export default function QuestionnaireCategoryViewDialog({
    open,
    questionnaireCategory,
    closeDialog,
}) {
    if (!questionnaireCategory) return null;

    return (
        <Dialog open={open} onOpenChange={(value) => {
            if (!value) closeDialog?.();
        }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Category Details</DialogTitle>
                    <DialogDescription>
                        View questionnaire category information.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Category Name</p>
                        <p className="font-medium">
                            {questionnaireCategory.categoryName || "-"}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="font-medium whitespace-pre-wrap">
                            {questionnaireCategory.description || "-"}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={questionnaireCategory.status ? "success" : "destructive"}>
                            {questionnaireCategory.status ? "Active" : "Inactive"}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Created Date</p>
                            <p className="text-sm">
                                {questionnaireCategory.createdAt
                                    ? new Date(questionnaireCategory.createdAt).toLocaleString()
                                    : "-"}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Updated Date</p>
                            <p className="text-sm">
                                {questionnaireCategory.updatedAt
                                    ? new Date(questionnaireCategory.updatedAt).toLocaleString()
                                    : "-"}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
