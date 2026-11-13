'use client';

import { useEffect, useState } from 'react';

import { toast } from 'sonner';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import { apiFetch } from '@/lib/api';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';

import { Textarea } from '@/components/ui/textarea';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Checkbox } from '@/components/ui/checkbox';

import { LoaderCircleIcon } from 'lucide-react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// =======================================================
// OPTIONS
// =======================================================

const FIELD_TO_OPTIONS = [
  { value: 'company', label: 'Company' },
  { value: 'leads', label: 'Leads' },
  { value: 'customers', label: 'Customers' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'tickets', label: 'Tickets' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'staff', label: 'Staff' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'items', label: 'Items' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'projects', label: 'Projects' },
  { value: 'transaction', label: 'Transaction' },
];

const FIELD_TYPES = [
  {
    value: 'input',
    label: 'Input',
  },
  {
    value: 'number',
    label: 'Number',
  },
  {
    value: 'textarea',
    label: 'Textarea',
  },
  {
    value: 'email',
    label: 'Email',
  },
  {
    value: 'phone',
    label: 'Phone',
  },
  {
    value: 'url',
    label: 'URL',
  },
  {
    value: 'select',
    label: 'Select',
  },
  {
    value: 'multiselect',
    label: 'Multi Select',
  },
  {
    value: 'radio',
    label: 'Radio',
  },
  {
    value: 'checkbox',
    label: 'Checkbox',
  },
  {
    value: 'date_picker',
    label: 'Date Picker',
  },
  {
    value: 'time_picker',
    label: 'Time Picker',
  },
  {
    value: 'date_picker_time',
    label: 'Datetime Picker',
  },
  {
    value: 'colorpicker',
    label: 'Color Picker',
  },
  {
    value: 'link',
    label: 'Hyperlink',
  },
  {
    value: 'file',
    label: 'Attachment',
  },
  {
    value: 'multi_file',
    label: 'Multi Attachment',
  },
  {
    value: 'image',
    label: 'Image',
  },
  {
    value: 'multi_image',
    label: 'Multi Image',
  },
];

// =======================================================
// HELPERS
// =======================================================

function getValue(object, ...keys) {
  for (const key of keys) {
    if (
      object?.[key] !== undefined &&
      object?.[key] !== null
    ) {
      return object[key];
    }
  }

  return '';
}

function toBoolean(value) {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true' ||
    value === 'yes' ||
    value === 'on'
  );
}

function generateSlug(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// =======================================================
// INITIAL FORM
// =======================================================

const INITIAL_FORM = {
  fieldto: '',
  name: '',
  slug: '',
  type: '',
  options: '',
  defaultValue: '',
  fieldOrder: 0,
  bsColumn: 12,

  disabled: false,
  displayInline: false,
  onlyAdmin: false,
  disallowClientToEdit: false,
  required: false,
  showOnTable: false,
  showOnPdf: false,
  showOnClientPortal: false,
  showOnTicketForm: false,
};

// =======================================================
// TOAST
// =======================================================

function showSuccessToast(message) {
  toast.custom(
    () => (
      <Alert
        variant="mono"
        icon="success"
        className="min-w-[320px] max-w-[500px] shadow-lg"
      >
        <AlertIcon>
          <RiCheckboxCircleFill className="size-5" />
        </AlertIcon>

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 4000,
    }
  );
}

function showErrorToast(message) {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close={true}
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() => {
          toast.dismiss(t);
        }}
      >
        <AlertIcon>
          <RiErrorWarningFill className="size-5" />
        </AlertIcon>

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 5000,
    }
  );
}

// =======================================================
// COMPONENT
// =======================================================

export default function CustomFieldEditDialog({
  open,
  closeDialog,
  field,
  onSuccess,
}) {
  const [form, setForm] =
    useState(INITIAL_FORM);

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // FILL FORM WHEN FIELD CHANGES
  // =====================================================

  useEffect(() => {
    if (!field) {
      setForm(INITIAL_FORM);
      return;
    }

    console.log(
      'EDIT CUSTOM FIELD:',
      field
    );

    setForm({
      fieldto: String(
        getValue(
          field,
          'fieldto',
          'field_to',
          'fieldTo'
        ) || ''
      ),

      name: String(
        getValue(
          field,
          'name',
          'field_name',
          'fieldName'
        ) || ''
      ),

      slug: String(
        getValue(
          field,
          'slug',
          'field_slug',
          'fieldSlug'
        ) || ''
      ),

      type: String(
        getValue(
          field,
          'type',
          'field_type',
          'fieldType'
        ) || ''
      ),

      options: String(
        getValue(
          field,
          'options',
          'field_options',
          'fieldOptions'
        ) || ''
      ),

      defaultValue: String(
        getValue(
          field,
          'defaultValue',
          'default_value',
          'defaultvalue'
        ) || ''
      ),

      fieldOrder: Number(
        getValue(
          field,
          'fieldOrder',
          'field_order',
          'fieldorder'
        ) || 0
      ),

      bsColumn: Number(
        getValue(
          field,
          'bsColumn',
          'bs_column',
          'bscolumn'
        ) || 12
      ),

      disabled: toBoolean(
        getValue(
          field,
          'disabled'
        )
      ),

      displayInline: toBoolean(
        getValue(
          field,
          'displayInline',
          'display_inline',
          'displayinline'
        )
      ),

      onlyAdmin: toBoolean(
        getValue(
          field,
          'onlyAdmin',
          'only_admin',
          'onlyadmin'
        )
      ),

      disallowClientToEdit: toBoolean(
        getValue(
          field,
          'disallowClientToEdit',
          'disallow_client_to_edit',
          'disallowclienttoedit'
        )
      ),

      required: toBoolean(
        getValue(
          field,
          'required'
        )
      ),

      showOnTable: toBoolean(
        getValue(
          field,
          'showOnTable',
          'show_on_table',
          'showontable'
        )
      ),

      showOnPdf: toBoolean(
        getValue(
          field,
          'showOnPdf',
          'show_on_pdf',
          'showonpdf'
        )
      ),

      showOnClientPortal: toBoolean(
        getValue(
          field,
          'showOnClientPortal',
          'show_on_client_portal',
          'showonclientportal'
        )
      ),

      showOnTicketForm: toBoolean(
        getValue(
          field,
          'showOnTicketForm',
          'show_on_ticket_form',
          'showonticketform'
        )
      ),
    });
  }, [field]);

  // =====================================================
  // CHANGE
  // =====================================================

  const handleChange = (
    name,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // NAME
  // =====================================================

  const handleNameChange = (
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      name: value,
      slug: generateSlug(value),
    }));
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    setForm(INITIAL_FORM);

    closeDialog();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!field?.id) {
      showErrorToast(
        'Invalid custom field.'
      );

      return;
    }

    const name =
      form.name.trim();

    const slug =
      generateSlug(form.slug);

    if (!form.fieldto) {
      showErrorToast(
        'Please select Field Belongs to.'
      );

      return;
    }

    if (!name) {
      showErrorToast(
        'Field name is required.'
      );

      return;
    }

    if (!slug) {
      showErrorToast(
        'Slug is required.'
      );

      return;
    }

    if (!form.type) {
      showErrorToast(
        'Please select field type.'
      );

      return;
    }

    const fieldOrder =
      Number(form.fieldOrder);

    if (
      Number.isNaN(fieldOrder) ||
      fieldOrder < 0
    ) {
      showErrorToast(
        'Order must be 0 or greater.'
      );

      return;
    }

    const bsColumn =
      Number(form.bsColumn);

    if (
      !bsColumn ||
      bsColumn < 1 ||
      bsColumn > 12
    ) {
      showErrorToast(
        'Grid column must be between 1 and 12.'
      );

      return;
    }

    let options =
      String(form.options || '').trim();

    if (
      [
        'select',
        'multiselect',
        'checkbox',
        'radio',
      ].includes(form.type) &&
      !options
    ) {
      showErrorToast(
        'Please enter Options.'
      );

      return;
    }

    if (form.type === 'file') {
      if (!options) {
        showErrorToast(
          'Please enter allowed file types.'
        );

        return;
      }

      const extensions = [
        ...new Set(
          options
            .split(',')
            .map((item) =>
              item
                .trim()
                .toLowerCase()
                .replace(/^\*\*\./, '')
                .replace(/^\./, '')
            )
            .filter(Boolean)
        ),
      ];

      if (
        extensions.some(
          (extension) =>
            !/^[a-z0-9]+$/.test(
              extension
            )
        )
      ) {
        showErrorToast(
          'Invalid file extension.'
        );

        return;
      }

      options =
        extensions.join(', ');
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/custom_fields',
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: field.id,

              fieldto:
                form.fieldto,

              name,

              slug,

              type:
                form.type,

              options,

              defaultValue:
                form.defaultValue,

              fieldOrder,

              bsColumn,

              disabled:
                form.disabled,

              displayInline:
                form.displayInline,

              onlyAdmin:
                form.onlyAdmin,

              disallowClientToEdit:
                form.disallowClientToEdit,

              required:
                form.required,

              showOnTable:
                form.showOnTable,

              showOnPdf:
                form.showOnPdf,

              showOnClientPortal:
                form.showOnClientPortal,

              showOnTicketForm:
                form.showOnTicketForm,
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
          'Failed to update custom field.'
        );
      }

      showSuccessToast(
        result?.message ||
        'Custom field updated successfully.'
      );

      setForm(INITIAL_FORM);

      if (onSuccess) {
        onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'UPDATE CUSTOM FIELD ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
        'Failed to update custom field.'
      );
    } finally {
      setLoading(false);
    }
  };

  const showOptions = [
    'select',
    'multiselect',
    'checkbox',
    'radio',
  ].includes(form.type);

  const showFileOptions = [
    'file',
    'multi_file',
    'image',
    'multi_image'
  ].includes(form.type);
  //  form.type === 'file';

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-6" >
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                Edit Custom Field
              </DialogTitle>

              <DialogDescription>
                Update custom field information.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              <DialogBody>

                {/* FIELD BELONGS TO */}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Field Belongs to
                    <span className="ms-1 text-destructive">
                      *
                    </span>
                  </label>

                  <Select
                    value={form.fieldto}
                    onValueChange={(value) =>
                      handleChange(
                        'fieldto',
                        value
                      )
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select module..." />
                    </SelectTrigger>

                    <SelectContent>
                      {FIELD_TO_OPTIONS.map(
                        (option) => (
                          <SelectItem
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* NAME + SLUG */}

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Field Name
                      <span className="ms-1 text-destructive">
                        *
                      </span>
                    </label>

                    <Input
                      value={form.name}
                      onChange={(event) =>
                        handleNameChange(
                          event.target.value
                        )
                      }
                      placeholder="GST Number"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Slug
                      <span className="ms-1 text-destructive">
                        *
                      </span>
                    </label>

                    <Input
                      value={form.slug}
                      onChange={(event) =>
                        handleChange(
                          'slug',
                          generateSlug(
                            event.target.value
                          )
                        )
                      }
                      placeholder="gst_number"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* TYPE */}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type
                    <span className="ms-1 text-destructive">
                      *
                    </span>
                  </label>

                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      handleChange(
                        'type',
                        value
                      )
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>

                    <SelectContent>
                      {FIELD_TYPES.map(
                        (option) => (
                          <SelectItem
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* OPTIONS */}

                {showOptions && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Options
                      <span className="ms-1 text-destructive">
                        *
                      </span>
                    </label>

                    <Textarea
                      value={form.options}
                      onChange={(event) =>
                        handleChange(
                          'options',
                          event.target.value
                        )
                      }
                      placeholder="Apple, Orange, Banana"
                      rows={3}
                      disabled={loading}
                    />
                  </div>
                )}

                {/* FILE OPTIONS */}

                {showFileOptions && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Allowed File Types
                      <span className="ms-1 text-destructive">
                        *
                      </span>
                    </label>

                    <Input
                      value={form.options}
                      onChange={(event) =>
                        handleChange(
                          'options',
                          event.target.value
                        )
                      }
                      placeholder="doc, pdf, png, jpg"
                      disabled={loading}
                    />
                  </div>
                )}

                {/* DEFAULT */}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Default Value
                  </label>

                  {form.type ===
                    'textarea' ? (
                    <Textarea
                      value={
                        form.defaultValue
                      }
                      onChange={(event) =>
                        handleChange(
                          'defaultValue',
                          event.target
                            .value
                        )
                      }
                      disabled={loading}
                    />
                  ) : (
                    <Input
                      value={
                        form.defaultValue
                      }
                      onChange={(event) =>
                        handleChange(
                          'defaultValue',
                          event.target
                            .value
                        )
                      }
                      disabled={loading}
                    />
                  )}
                </div>

                {/* ORDER + GRID */}

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Order
                    </label>

                    <Input
                      type="number"
                      min="0"
                      value={
                        form.fieldOrder
                      }
                      onChange={(event) =>
                        handleChange(
                          'fieldOrder',
                          event.target.value
                        )
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Grid
                    </label>

                    <div className="flex">
                      <div className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm">
                        col-md-
                      </div>

                      <Input
                        type="number"
                        min="1"
                        max="12"
                        className="rounded-l-none"
                        value={
                          form.bsColumn
                        }
                        onChange={(event) =>
                          handleChange(
                            'bsColumn',
                            event.target.value
                          )
                        }
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* SETTINGS */}

                <div className="space-y-4">
                  <h3 className="font-semibold">
                    Field Settings
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Setting
                      id="disabled"
                      label="Disabled"
                      checked={
                        form.disabled
                      }
                      onChange={(value) =>
                        handleChange(
                          'disabled',
                          value
                        )
                      }
                    />

                    <Setting
                      id="displayInline"
                      label="Display Inline"
                      checked={
                        form.displayInline
                      }
                      onChange={(value) =>
                        handleChange(
                          'displayInline',
                          value
                        )
                      }
                    />

                    <Setting
                      id="onlyAdmin"
                      label="Restrict visibility for administrators only"
                      checked={
                        form.onlyAdmin
                      }
                      onChange={(value) =>
                        handleChange(
                          'onlyAdmin',
                          value
                        )
                      }
                    />

                    <Setting
                      id="disallowClientToEdit"
                      label="Disallow customer to edit this field"
                      checked={
                        form.disallowClientToEdit
                      }
                      onChange={(value) =>
                        handleChange(
                          'disallowClientToEdit',
                          value
                        )
                      }
                    />

                    <Setting
                      id="required"
                      label="Required"
                      checked={
                        form.required
                      }
                      onChange={(value) =>
                        handleChange(
                          'required',
                          value
                        )
                      }
                    />

                    <Setting
                      id="showOnTable"
                      label="Show on table"
                      checked={
                        form.showOnTable
                      }
                      onChange={(value) =>
                        handleChange(
                          'showOnTable',
                          value
                        )
                      }
                    />

                    <Setting
                      id="showOnPdf"
                      label="Show on PDF"
                      checked={
                        form.showOnPdf
                      }
                      onChange={(value) =>
                        handleChange(
                          'showOnPdf',
                          value
                        )
                      }
                    />

                    <Setting
                      id="showOnClientPortal"
                      label="Show on client portal"
                      checked={
                        form.showOnClientPortal
                      }
                      onChange={(value) =>
                        handleChange(
                          'showOnClientPortal',
                          value
                        )
                      }
                    />

                    <Setting
                      id="showOnTicketForm"
                      label="Show on ticket form"
                      checked={
                        form.showOnTicketForm
                      }
                      onChange={(value) =>
                        handleChange(
                          'showOnTicketForm',
                          value
                        )
                      }
                    />
                  </div>
                </div>


              </DialogBody>
            </ScrollArea>

            {/* FOOTER */}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={loading}
              >
                {loading && (
                  <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                )}

                {loading
                  ? 'Updating...'
                  : 'Update Custom Field'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =======================================================
// SETTING COMPONENT
// =======================================================

function Setting({
  id,
  label,
  checked,
  onChange,
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={Boolean(checked)}
        onCheckedChange={(value) =>
          onChange(Boolean(value))
        }
      />

      <label
        htmlFor={id}
        className="cursor-pointer text-sm leading-5"
      >
        {label}
      </label>
    </div>
  );
}