'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Textarea } from '@/components/ui/textarea';

// -----------------------------------------------------------------------------
// STATIC DATA
// -----------------------------------------------------------------------------

const TAXES = [
  {
    id: '1',
    rate: '12.00%',
    name: 'IGST',
  },
];

const ITEM_GROUPS = [];

// -----------------------------------------------------------------------------
// DEFAULT FORM
// -----------------------------------------------------------------------------

const DEFAULT_FORM = {
  description: '',
  longDescription: '',
  rate: '',
  tax1: '',
  tax2: '',
  unit: '',
  groupId: '',
};

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export default function ItemssAddDialog({
  open,
  closeDialog,
  onSuccess,
  item = null,
}) {
  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    ...(item
      ? {
          description: item.description || '',
          longDescription:
            item.longDescription ||
            item.long_description ||
            '',
          rate:
            item.rate !== undefined &&
            item.rate !== null
              ? String(item.rate)
              : '',
          tax1:
            item.tax1 ||
            item.tax_1 ||
            '',
          tax2:
            item.tax2 ||
            item.tax_2 ||
            '',
          unit: item.unit || '',
          groupId:
            item.groupId ||
            item.group_id ||
            '',
        }
      : {}),
  }));

  const [errors, setErrors] = useState({});

  // ---------------------------------------------------------------------------
  // UPDATE FIELD
  // ---------------------------------------------------------------------------

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  const validate = () => {
    const newErrors = {};

    if (!form.description.trim()) {
      newErrors.description =
        'Description is required.';
    }

    if (
      form.rate === '' ||
      form.rate === null ||
      form.rate === undefined
    ) {
      newErrors.rate =
        'Rate is required.';
    } else if (
      Number.isNaN(Number(form.rate))
    ) {
      newErrors.rate =
        'Please enter a valid rate.';
    } else if (Number(form.rate) < 0) {
      newErrors.rate =
        'Rate cannot be negative.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(
        'Please complete the required fields.',
      );

      return false;
    }

    return true;
  };

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const selectedTax1 = TAXES.find(
      (tax) => tax.id === form.tax1,
    );

    const selectedTax2 = TAXES.find(
      (tax) => tax.id === form.tax2,
    );

    const itemData = {
      id: item?.id || null,

      description:
        form.description.trim(),

      longDescription:
        form.longDescription.trim(),

      rate: Number(form.rate),

      tax1: form.tax1,

      tax1Rate:
        selectedTax1?.rate || null,

      tax1Name:
        selectedTax1?.name || null,

      tax2: form.tax2,

      tax2Rate:
        selectedTax2?.rate || null,

      tax2Name:
        selectedTax2?.name || null,

      unit: form.unit.trim(),

      groupId: form.groupId,

      action: item
        ? 'update'
        : 'create',
    };

    console.log(
      'Item Data:',
      itemData,
    );

    if (item) {
      toast.success(
        'Item updated successfully.',
      );
    } else {
      toast.success(
        'Item added successfully.',
      );
    }

    onSuccess?.(itemData);

    handleClose();
  };

  // ---------------------------------------------------------------------------
  // CLOSE
  // ---------------------------------------------------------------------------

  const handleClose = () => {
    setErrors({});

    setForm({
      ...DEFAULT_FORM,
    });

    closeDialog?.();
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent className="w-[96vw] max-w-2xl p-0">
        {/* ----------------------------------------------------------------- */}
        {/* HEADER */}
        {/* ----------------------------------------------------------------- */}

        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-xl font-bold">
            {item
              ? 'Edit Item'
              : 'Add Item'}
          </DialogTitle>

          <DialogDescription>
            {item
              ? 'Update item information.'
              : 'Create a new invoice item.'}
          </DialogDescription>
        </DialogHeader>

        {/* ----------------------------------------------------------------- */}
        {/* BODY */}
        {/* ----------------------------------------------------------------- */}

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {/* ============================================================= */}
            {/* WARNING */}
            {/* ============================================================= */}

            {item && (
              <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                Changing item information won't
                affect already created
                invoices, estimates, proposals,
                or credit notes.
              </div>
            )}

            {/* ============================================================= */}
            {/* DESCRIPTION */}
            {/* ============================================================= */}

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                <span className="text-destructive">
                  *
                </span>{' '}
                Description
              </label>

              <Input
                id="description"
                name="description"
                value={form.description}
                onChange={(event) =>
                  updateField(
                    'description',
                    event.target.value,
                  )
                }
                placeholder="Description"
                className={
                  errors.description
                    ? 'border-destructive'
                    : ''
                }
              />

              {errors.description && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.description}
                </p>
              )}
            </div>

            {/* ============================================================= */}
            {/* LONG DESCRIPTION */}
            {/* ============================================================= */}

            <div>
              <label
                htmlFor="long-description"
                className="mb-2 block text-sm font-medium"
              >
                Long Description
              </label>

              <Textarea
                id="long-description"
                name="long_description"
                rows={4}
                value={
                  form.longDescription
                }
                onChange={(event) =>
                  updateField(
                    'longDescription',
                    event.target.value,
                  )
                }
                placeholder="Long Description"
              />
            </div>

            {/* ============================================================= */}
            {/* RATE */}
            {/* ============================================================= */}

            <div>
              <label
                htmlFor="rate"
                className="mb-2 block text-sm font-medium"
              >
                <span className="text-destructive">
                  *
                </span>{' '}
                Rate - USD{' '}
                <small className="text-muted-foreground">
                  (Base Currency)
                </small>
              </label>

              <Input
                id="rate"
                name="rate"
                type="number"
                min="0"
                step="0.01"
                value={form.rate}
                onChange={(event) =>
                  updateField(
                    'rate',
                    event.target.value,
                  )
                }
                placeholder="0.00"
                className={
                  errors.rate
                    ? 'border-destructive'
                    : ''
                }
              />

              {errors.rate && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.rate}
                </p>
              )}
            </div>

            {/* ============================================================= */}
            {/* TAXES */}
            {/* ============================================================= */}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* TAX 1 */}

              <div>
                <label
                  htmlFor="tax1"
                  className="mb-2 block text-sm font-medium"
                >
                  Tax 1
                </label>

                <Select
                  value={form.tax1}
                  onValueChange={(value) =>
                    updateField(
                      'tax1',
                      value === 'none'
                        ? ''
                        : value,
                    )
                  }
                >
                  <SelectTrigger
                    id="tax1"
                    className="w-full"
                  >
                    <SelectValue placeholder="No Tax" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">
                      No Tax
                    </SelectItem>

                    {TAXES.map((tax) => (
                      <SelectItem
                        key={tax.id}
                        value={tax.id}
                      >
                        <div className="flex items-center gap-2">
                          <span>
                            {tax.rate}
                          </span>

                          <span className="text-xs text-muted-foreground">
                            {tax.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TAX 2 */}

              <div>
                <label
                  htmlFor="tax2"
                  className="mb-2 block text-sm font-medium"
                >
                  Tax 2
                </label>

                <Select
                  value={form.tax2}
                  onValueChange={(value) =>
                    updateField(
                      'tax2',
                      value === 'none'
                        ? ''
                        : value,
                    )
                  }
                  disabled
                >
                  <SelectTrigger
                    id="tax2"
                    className="w-full"
                  >
                    <SelectValue placeholder="No Tax" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">
                      No Tax
                    </SelectItem>

                    {TAXES.map((tax) => (
                      <SelectItem
                        key={tax.id}
                        value={tax.id}
                      >
                        <div className="flex items-center gap-2">
                          <span>
                            {tax.rate}
                          </span>

                          <span className="text-xs text-muted-foreground">
                            {tax.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ============================================================= */}
            {/* UNIT */}
            {/* ============================================================= */}

            <div>
              <label
                htmlFor="unit"
                className="mb-2 block text-sm font-medium"
              >
                Unit
              </label>

              <Input
                id="unit"
                name="unit"
                value={form.unit}
                onChange={(event) =>
                  updateField(
                    'unit',
                    event.target.value,
                  )
                }
                placeholder="Unit"
              />
            </div>

            {/* ============================================================= */}
            {/* ITEM GROUP */}
            {/* ============================================================= */}

            <div>
              <label
                htmlFor="group-id"
                className="mb-2 block text-sm font-medium"
              >
                Item Group
              </label>

              <Select
                value={form.groupId}
                onValueChange={(value) =>
                  updateField(
                    'groupId',
                    value === 'none'
                      ? ''
                      : value,
                  )
                }
              >
                <SelectTrigger
                  id="group-id"
                  className="w-full"
                >
                  <SelectValue placeholder="Nothing selected" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="none">
                    Nothing selected
                  </SelectItem>

                  {ITEM_GROUPS.map(
                    (group) => (
                      <SelectItem
                        key={group.id}
                        value={group.id}
                      >
                        {group.name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>

              <p className="mt-1 text-xs text-muted-foreground">
                Select an item group if
                applicable.
              </p>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* FOOTER */}
        {/* ----------------------------------------------------------------- */}

        <DialogFooter className="border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={handleSave}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}