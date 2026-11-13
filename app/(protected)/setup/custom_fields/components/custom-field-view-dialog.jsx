'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b py-3 last:border-b-0 sm:grid-cols-3 sm:gap-4">
      <div className="text-sm font-medium text-muted-foreground">
        {label}
      </div>

      <div className="break-words text-sm sm:col-span-2">
        {value !== undefined &&
        value !== null &&
        value !== ''
          ? String(value)
          : '-'}
      </div>
    </div>
  );
}

function booleanValue(value) {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true'
  );
}

export default function CustomFieldViewDialog({
  open,
  onOpenChange,
  field,
}) {
  const handleClose = () => {
    onOpenChange(false);
  };

  if (!field) {
    return null;
  }

  return (
    <Dialog
      open={Boolean(open)}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="max-h-[90vh] overflow-hidden sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>
            Custom Field Details
          </DialogTitle>

          <DialogDescription>
            View custom field information.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="max-h-[65vh] overflow-y-auto pr-2">
          <div className="rounded-md border">
            <Row
              label="Field Name"
              value={field.name}
            />

            <Row
              label="Slug"
              value={field.slug}
            />

            <Row
              label="Belongs To"
              value={
                field.fieldto ??
                field.fieldTo ??
                field.field_to
              }
            />

            <Row
              label="Type"
              value={field.type}
            />

            <Row
              label="Options"
              value={field.options}
            />

            <Row
              label="Default Value"
              value={
                field.defaultValue ??
                field.default_value
              }
            />

            <Row
              label="Order"
              value={
                field.fieldOrder ??
                field.field_order
              }
            />

            <Row
              label="Grid"
              value={`col-md-${
                field.bsColumn ??
                field.bs_column ??
                12
              }`}
            />

            <Row
              label="Disabled"
              value={
                booleanValue(field.disabled)
                  ? 'Yes'
                  : 'No'
              }
            />

            <Row
              label="Display Inline"
              value={
                booleanValue(
                  field.displayInline ??
                    field.display_inline
                )
                  ? 'Yes'
                  : 'No'
              }
            />

            <Row
              label="Admin Only"
              value={
                booleanValue(
                  field.onlyAdmin ??
                    field.only_admin
                )
                  ? 'Yes'
                  : 'No'
              }
            />

            <Row
              label="Disallow Client To Edit"
              value={
                booleanValue(
                  field.disallowClientToEdit ??
                    field.disallow_client_to_edit
                )
                  ? 'Yes'
                  : 'No'
              }
            />

            <Row
              label="Required"
              value={
                booleanValue(field.required)
                  ? 'Yes'
                  : 'No'
              }
            />

            <Row
              label="Show on Table"
              value={
                booleanValue(
                  field.showOnTable ??
                    field.show_on_table
                )
                  ? 'Yes'
                  : 'No'
              }
            />

            <Row
              label="Show on PDF"
              value={
                booleanValue(
                  field.showOnPdf ??
                    field.show_on_pdf
                )
                  ? 'Yes'
                  : 'No'
              }
            />

            <Row
              label="Show on Client Portal"
              value={
                booleanValue(
                  field.showOnClientPortal ??
                    field.show_on_client_portal
                )
                  ? 'Yes'
                  : 'No'
              }
            />

            <Row
              label="Show on Ticket Form"
              value={
                booleanValue(
                  field.showOnTicketForm ??
                    field.show_on_ticket_form
                )
                  ? 'Yes'
                  : 'No'
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}