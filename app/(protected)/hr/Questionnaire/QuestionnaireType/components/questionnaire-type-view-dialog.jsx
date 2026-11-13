"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";

export default function QuestionnaireTypeViewDialog({
    open,
    questionnaireType,
    closeDialog,
}) {
    if (!questionnaireType) return null;

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) closeDialog?.();
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Questionnaire Type Details</DialogTitle>
                    <DialogDescription>
                        View questionnaire type information.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">

                    {/* TYPE NAME */}

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            Type Name
                        </p>
                        <p className="font-medium">
                            {questionnaireType.typeName || "-"}
                        </p>
                    </div>

                    {/* QUESTIONNAIRE CATEGORY */}

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            Questionnaire Category
                        </p>
                        <p className="font-medium">
                            {questionnaireType.questionnaireCategory?.categoryName || "-"}
                        </p>
                    </div>

                    {/* DESCRIPTION */}

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            Description
                        </p>
                        <p className="font-medium whitespace-pre-wrap">
                            {questionnaireType.description || "-"}
                        </p>
                    </div>

                    {/* STATUS */}

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            Status
                        </p>
                        <Badge
                            variant={questionnaireType.status ? "success" : "destructive"}
                        >
                            {questionnaireType.status ? "Active" : "Inactive"}
                        </Badge>
                    </div>

                    {/* DATES */}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Created Date
                            </p>
                            <p className="text-sm">
                                {questionnaireType.createdAt
                                    ? new Date(questionnaireType.createdAt).toLocaleString()
                                    : "-"}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Updated Date
                            </p>
                            <p className="text-sm">
                                {questionnaireType.updatedAt
                                    ? new Date(questionnaireType.updatedAt).toLocaleString()
                                    : "-"}
                            </p>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}