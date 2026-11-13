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
  DialogHeader,
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import { Textarea } from '@/components/ui/textarea';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Checkbox } from '@/components/ui/checkbox';

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// =======================================================
// FIELD BELONGS TO
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
  { value: 'employee', label: 'Employee' },
];


// =======================================================
// FIELD TYPES
// =======================================================

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
// SLUG
// =======================================================

function generateSlug(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}


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

const CustomFieldAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  const [form, setForm] =
    useState(INITIAL_FORM);

  const [loading, setLoading] =
    useState(false);


  // =====================================================
  // RESET FORM
  // =====================================================

  useEffect(() => {
    if (open) {
      setForm({
        ...INITIAL_FORM,
      });
    }
  }, [open]);


  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    setForm({
      ...INITIAL_FORM,
    });

    closeDialog();
  };


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
  // NAME CHANGE
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
  // FILE EXTENSIONS
  // =====================================================

  const normalizeFileExtensions = (
    value
  ) => {
    return [
      ...new Set(
        value
          .split(',')
          .map((item) =>
            item
              .trim()
              .toLowerCase()
              .replace(/^\*\*\./, '')
              .replace(/^\*\./, '')
              .replace(/^\./, '')
          )
          .filter(Boolean)
      ),
    ];
  };


  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();


    // ===================================================
    // FIELD BELONGS TO
    // ===================================================

    if (!form.fieldto) {
      showErrorToast(
        'Please select Field Belongs to.'
      );

      return;
    }


    // ===================================================
    // FIELD NAME
    // ===================================================

    const fieldName =
      form.name.trim();

    if (!fieldName) {
      showErrorToast(
        'Field Name is required.'
      );

      return;
    }


    // ===================================================
    // SLUG
    // ===================================================

    const finalSlug =
      generateSlug(form.slug);

    if (!finalSlug) {
      showErrorToast(
        'Slug is required.'
      );

      return;
    }


    // ===================================================
    // TYPE
    // ===================================================

    if (!form.type) {
      showErrorToast(
        'Please select Type.'
      );

      return;
    }


    // ===================================================
    // GRID
    // ===================================================

    const column =
      Number(form.bsColumn);

    if (
      !column ||
      column < 1 ||
      column > 12
    ) {
      showErrorToast(
        'Grid column must be between 1 and 12.'
      );

      return;
    }


    // ===================================================
    // ORDER
    // ===================================================

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


    // ===================================================
    // OPTIONS
    // ===================================================

    let options =
      form.options.trim();


    // ===================================================
    // SELECT / MULTI SELECT / CHECKBOX
    // ===================================================

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
        'Options are required for this field type.'
      );

      return;
    }


    // ===================================================
    // FILE
    // ===================================================

    if (form.type === 'file') {
      if (!options) {
        showErrorToast(
          'Please enter allowed file types.'
        );

        return;
      }

      const extensions =
        normalizeFileExtensions(
          options
        );

      if (!extensions.length) {
        showErrorToast(
          'Please enter valid file extensions.'
        );

        return;
      }

      const invalidExtension =
        extensions.some(
          (extension) =>
            !/^[a-z0-9]+$/.test(
              extension
            )
        );

      if (invalidExtension) {
        showErrorToast(
          'Invalid file extension. Example: pdf, jpg, png.'
        );

        return;
      }

      options =
        extensions.join(', ');
    }


    // ===================================================
    // CREATE
    // ===================================================

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/custom_fields',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              fieldto:
                form.fieldto,

              name:
                fieldName,

              slug:
                finalSlug,

              type:
                form.type,

              options:
                options || null,

              defaultValue:
                form.defaultValue ||
                null,

              fieldOrder,

              bsColumn: column,

              disabled:
                Boolean(
                  form.disabled
                ),

              displayInline:
                Boolean(
                  form.displayInline
                ),

              onlyAdmin:
                Boolean(
                  form.onlyAdmin
                ),

              disallowClientToEdit:
                Boolean(
                  form.disallowClientToEdit
                ),

              required:
                Boolean(
                  form.required
                ),

              showOnTable:
                Boolean(
                  form.showOnTable
                ),

              showOnPdf:
                Boolean(
                  form.showOnPdf
                ),

              showOnClientPortal:
                Boolean(
                  form.showOnClientPortal
                ),

              showOnTicketForm:
                Boolean(
                  form.showOnTicketForm
                ),
            }),
          }
        );


      const result =
        await response
          .json()
          .catch(() => ({}));


      // =================================================
      // ERROR
      // =================================================

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
          'Failed to create custom field.'
        );
      }


      // =================================================
      // SUCCESS
      // =================================================

      showSuccessToast(
        result?.message ||
        'Custom field created successfully.'
      );


      // Reset
      setForm({
        ...INITIAL_FORM,
      });


      // Refresh React Query list
      if (onSuccess) {
        await onSuccess(result);
      } else {
        closeDialog();
      }

    } catch (error) {
      console.error(
        'CREATE CUSTOM FIELD ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
        'Failed to create custom field.'
      );

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // CONDITIONAL FIELDS
  // =====================================================

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
  //form.type === 'file';


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
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                Add Custom Field
              </DialogTitle>

              <DialogDescription>
                Create a new custom field.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              <DialogBody>

                <div className="space-y-2">
                  <Label>
                    Field Belongs to
                    <span className="ms-1 text-destructive">
                      *
                    </span>
                  </Label>

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
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-6 md:grid-cols-2">

                  <div className="space-y-2">
                    <Label>
                      Field Name
                      <span className="ms-1 text-destructive">
                        *
                      </span>
                    </Label>

                    <Input
                      value={form.name}
                      onChange={(event) =>
                        handleNameChange(
                          event.target.value
                        )
                      }
                      placeholder="GST Number"
                      disabled={loading}
                      autoFocus
                    />
                  </div>


                  <div className="space-y-2">
                    <Label>
                      Slug
                      <span className="ms-1 text-destructive">
                        *
                      </span>
                    </Label>

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

                <div className="space-y-2">
                  <Label>
                    Type
                    <span className="ms-1 text-destructive">
                      *
                    </span>
                  </Label>

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
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {showOptions && (
                  <div className="space-y-2">
                    <Label>
                      Options
                      <span className="ms-1 text-destructive">
                        *
                      </span>
                    </Label>

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

                    <p className="text-xs text-muted-foreground">
                      Enter options separated by commas.
                    </p>
                  </div>
                )}

                {showFileOptions && (
                  <div className="space-y-2">
                    <Label>
                      Allowed File Types
                      <span className="ms-1 text-destructive">
                        *
                      </span>
                    </Label>

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

                    <p className="text-xs text-muted-foreground">
                      Example: pdf, jpg, png, docx
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>
                    Default Value
                  </Label>

                  {form.type === 'textarea' ? (
                    <Textarea
                      value={
                        form.defaultValue
                      }
                      onChange={(event) =>
                        handleChange(
                          'defaultValue',
                          event.target.value
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
                          event.target.value
                        )
                      }
                      disabled={loading}
                    />
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">

                  <div className="space-y-2">
                    <Label>
                      Order
                    </Label>

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
                    <Label>
                      Grid
                    </Label>

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

                <Settings
                  form={form}
                  onChange={handleChange}
                  disabled={loading}
                />


              </DialogBody>
            </ScrollArea>

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
                {loading
                  ? 'Creating...'
                  : 'Create Custom Field'}
              </Button>

            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

function Settings({
  form,
  onChange,
  disabled,
}) {
  const options = [
    [
      'disabled',
      'Disabled',
    ],

    [
      'displayInline',
      'Display Inline',
    ],

    [
      'onlyAdmin',
      'Restrict visibility for administrators only',
    ],

    [
      'disallowClientToEdit',
      'Disallow customer to edit this field',
    ],

    [
      'required',
      'Required',
    ],

    [
      'showOnTable',
      'Show on table',
    ],

    [
      'showOnPdf',
      'Show on PDF',
    ],

    [
      'showOnClientPortal',
      'Show on client portal',
    ],

    [
      'showOnTicketForm',
      'Show on ticket form',
    ],
  ];


  return (
    <div className="space-y-4">

      <h3 className="font-semibold">
        Field Settings
      </h3>

      <div className="grid gap-4 md:grid-cols-2">

        {options.map(
          ([id, label]) => (
            <div
              key={id}
              className="flex items-start gap-3"
            >

              <Checkbox
                id={`custom-field-${id}`}
                checked={Boolean(
                  form[id]
                )}
                onCheckedChange={(
                  value
                ) =>
                  onChange(
                    id,
                    Boolean(value)
                  )
                }
                disabled={disabled}
              />

              <Label
                htmlFor={`custom-field-${id}`}
                className="cursor-pointer leading-5"
              >
                {label}
              </Label>

            </div>
          )
        )}

      </div>

    </div>
  );
}


export default CustomFieldAddDialog;