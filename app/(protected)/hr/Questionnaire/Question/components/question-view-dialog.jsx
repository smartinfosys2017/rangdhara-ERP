
"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";

export default function QuestionViewDialog({
    open,
    question,
    closeDialog,
}) {
    if (!question) return null;

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) closeDialog?.();
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Question Details</DialogTitle>
                    <DialogDescription>
                        View question information.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">

                    {/* QUESTION NAME */}

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            Question Name
                        </p>
                        <p className="font-medium">
                            {question.questionName || "-"}
                        </p>
                    </div>

                    {/* QUESTIONNAIRE TYPE */}

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            Questionnaire Type
                        </p>
                        <p className="font-medium">
                            {question.questionnaireType?.typeName || "-"}
                        </p>
                    </div>

                    {/* QUESTION */}

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            Question
                        </p>
                        <p className="font-medium whitespace-pre-wrap">
                            {question.question || "-"}
                        </p>
                    </div>

                    {/* STATUS */}

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            Status
                        </p>
                        <Badge
                            variant={question.status ? "success" : "destructive"}
                        >
                            {question.status ? "Active" : "Inactive"}
                        </Badge>
                    </div>

                    {/* DATES */}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Created Date
                            </p>
                            <p className="text-sm">
                                {question.createdAt
                                    ? new Date(question.createdAt).toLocaleString()
                                    : "-"}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Updated Date
                            </p>
                            <p className="text-sm">
                                {question.updatedAt
                                    ? new Date(question.updatedAt).toLocaleString()
                                    : "-"}
                            </p>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}