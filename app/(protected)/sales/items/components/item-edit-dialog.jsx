'use client';

import { useEffect, useState } from 'react';

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
    rate: '12.00',
    name: 'IGST',
  },
];

const ITEM_GROUPS = [
  {
    id: '1',
    name: 'Services',
  },
  {
    id: '2',
    name: 'Products',
  },
  {
    id: '3',
    name: 'Other',
  },
];

// -----------------------------------------------------------------------------
// EMPTY FORM
// -----------------------------------------------------------------------------

const EMPTY_FORM = {
  id: null,
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

export default function ItemEditDialog({
  open,
  closeDialog,
  onSuccess,
  item,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});

  // ---------------------------------------------------------------------------
  // LOAD ITEM
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) {
      return;
    }

    if (item) {
      setForm({
        id: item.id ?? null,

        description:
          item.description ??
          item.name ??
          '',

        longDescription:
          item.longDescription ??
          item.long_description ??
          '',

        rate:
          item.rate !== undefined &&
          item.rate !== null
            ? String(item.rate)
            : '',

        tax1:
          item.tax1 !== undefined &&
          item.tax1 !== null
            ? String(item.tax1)
            : '',

        tax2:
          item.tax2 !== undefined &&
          item.tax2 !== null
            ? String(item.tax2)
            : '',

        unit: item.unit ?? '',

        groupId:
          item.groupId !== undefined &&
          item.groupId !== null
            ? String(item.groupId)
            : '',
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setErrors({});
  }, [open, item]);

  // ---------------------------------------------------------------------------
  // FIELD CHANGE
  // ---------------------------------------------------------------------------

  const handleChange = (field, value) => {
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

    const itemData = {
      id: form.id,

      description:
        form.description.trim(),

      longDescription:
        form.longDescription.trim(),

      rate: Number(form.rate),

      tax1: form.tax1,

      tax2: form.tax2,

      unit: form.unit.trim(),

      groupId: form.groupId,
    };

    console.log(
      'Updated Item Data:',
      itemData,
    );

    toast.success(
      'Item updated successfully.',
    );

    onSuccess?.(itemData);

    handleClose();
  };

  // ---------------------------------------------------------------------------
  // CLOSE
  // ---------------------------------------------------------------------------

  const handleClose = () => {
    setErrors({});

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
      <DialogContent className="max-w-3xl w-[95vw] max-h-[95vh] overflow-y-auto p-0">
        {/* ================================================================= */}
        {/* HEADER */}
        {/* ================================================================= */}

        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-xl font-bold">
            Edit Item
          </DialogTitle>

          <DialogDescription>
            Update item information, pricing,
            tax and group details.
          </DialogDescription>
        </DialogHeader>

        {/* ================================================================= */}
        {/* FORM */}
        {/* ================================================================= */}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
          noValidate
        >
          <div className="space-y-6 px-6 py-6">
            {/* ============================================================= */}
            {/* WARNING */}
            {/* ============================================================= */}

            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Changing item info won't affect
              on the created
              invoices/estimates/proposals/credit
              notes.
            </div>

            {/* ============================================================= */}
            {/* DESCRIPTION */}
            {/* ============================================================= */}

            <div>
              <label
                htmlFor="item-description"
                className="mb-2 block text-sm font-medium"
              >
                <span className="text-destructive">
                  *
                </span>{' '}
                Description
              </label>

              <Input
                id="item-description"
                value={form.description}
                onChange={(event) =>
                  handleChange(
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
                htmlFor="item-long-description"
                className="mb-2 block text-sm font-medium"
              >
                Long Description
              </label>

              <Textarea
                id="item-long-description"
                rows={4}
                value={
                  form.longDescription
                }
                onChange={(event) =>
                  handleChange(
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
                htmlFor="item-rate"
                className="mb-2 block text-sm font-medium"
              >
                <span className="text-destructive">
                  *
                </span>{' '}
                Rate - USD (Base Currency)
              </label>

              <Input
                id="item-rate"
                type="number"
                min="0"
                step="0.01"
                value={form.rate}
                onChange={(event) =>
                  handleChange(
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

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* TAX 1 */}

              <div>
                <label
                  htmlFor="item-tax-1"
                  className="mb-2 block text-sm font-medium"
                >
                  Tax 1
                </label>

                <Select
                  value={
                    form.tax1 || 'no-tax'
                  }
                  onValueChange={(value) =>
                    handleChange(
                      'tax1',
                      value === 'no-tax'
                        ? ''
                        : value,
                    )
                  }
                >
                  <SelectTrigger id="item-tax-1">
                    <SelectValue placeholder="No Tax" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="no-tax">
                      No Tax
                    </SelectItem>

                    {TAXES.map((tax) => (
                      <SelectItem
                        key={tax.id}
                        value={tax.id}
                      >
                        <div className="flex flex-col">
                          <span>
                            {tax.rate}%
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
                  htmlFor="item-tax-2"
                  className="mb-2 block text-sm font-medium"
                >
                  Tax 2
                </label>

                <Select
                  value={
                    form.tax2 || 'no-tax'
                  }
                  onValueChange={(value) =>
                    handleChange(
                      'tax2',
                      value === 'no-tax'
                        ? ''
                        : value,
                    )
                  }
                  disabled
                >
                  <SelectTrigger id="item-tax-2">
                    <SelectValue placeholder="No Tax" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="no-tax">
                      No Tax
                    </SelectItem>

                    {TAXES.map((tax) => (
                      <SelectItem
                        key={tax.id}
                        value={tax.id}
                      >
                        <div className="flex flex-col">
                          <span>
                            {tax.rate}%
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
                htmlFor="item-unit"
                className="mb-2 block text-sm font-medium"
              >
                Unit
              </label>

              <Input
                id="item-unit"
                value={form.unit}
                onChange={(event) =>
                  handleChange(
                    'unit',
                    event.target.value,
                  )
                }
                placeholder="Unit"
              />
            </div>

            {/* ============================================================= */}
            {/* CUSTOM FIELDS */}
            {/* ============================================================= */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Custom Fields
              </label>

              <div className="min-h-[50px] rounded-md border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                No custom fields available.
              </div>
            </div>

            {/* ============================================================= */}
            {/* ITEM GROUP */}
            {/* ============================================================= */}

            <div>
              <label
                htmlFor="item-group"
                className="mb-2 block text-sm font-medium"
              >
                Item Group
              </label>

              <Select
                value={
                  form.groupId || 'nothing-selected'
                }
                onValueChange={(value) =>
                  handleChange(
                    'groupId',
                    value ===
                      'nothing-selected'
                      ? ''
                      : value,
                  )
                }
              >
                <SelectTrigger id="item-group">
                  <SelectValue placeholder="Nothing selected" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="nothing-selected">
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
            </div>
          </div>

          {/* =============================================================== */}
          {/* FOOTER */}
          {/* =============================================================== */}

          <DialogFooter className="border-t bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Close
            </Button>

            <Button type="submit">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}