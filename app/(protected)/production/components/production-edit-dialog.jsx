
"use client";

import ProductionAddDialog from "./production-add-dialog";

export default function ProductionEditDialog({
  open,
  closeDialog,
  onSuccess,
  Production,
}) {
  return (
    <ProductionAddDialog
      open={open}
      closeDialog={closeDialog}
      onSuccess={onSuccess}
      item={Production}
    />
  );
}
