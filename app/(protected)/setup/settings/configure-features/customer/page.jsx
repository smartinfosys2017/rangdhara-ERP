'use client';

import { useEffect, useState } from 'react';
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Label } from '@/components/ui/label';

import { Textarea } from '@/components/ui/textarea';

import { Checkbox } from '@/components/ui/checkbox';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { LoaderCircleIcon } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';

import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { toast } from 'sonner';
import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

/*
|--------------------------------------------------------------------------
| CUSTOMER PROFILE TABS
|--------------------------------------------------------------------------
*/

const PROFILE_TABS = [
  {
    value: 'notes',
    label: 'Notes',
  },
  {
    value: 'statement',
    label: 'Statement',
  },
  {
    value: 'invoices',
    label: 'Invoices',
  },
  {
    value: 'payments',
    label: 'Payments',
  },
  {
    value: 'proposals',
    label: 'Proposals',
  },
  {
    value: 'credit_notes',
    label: 'Credit Notes',
  },
  {
    value: 'estimates',
    label: 'Estimates',
  },
  {
    value: 'subscriptions',
    label: 'Subscriptions',
  },
  {
    value: 'expenses',
    label: 'Expenses',
  },
  {
    value: 'contracts',
    label: 'Contracts',
  },
  {
    value: 'projects',
    label: 'Projects',
  },
  {
    value: 'tasks',
    label: 'Tasks',
  },
  {
    value: 'tickets',
    label: 'Tickets',
  },
  {
    value: 'attachments',
    label: 'Files',
  },
  {
    value: 'vault',
    label: 'Vault',
  },
  {
    value: 'reminders',
    label: 'Reminders',
  },
  {
    value: 'map',
    label: 'Map',
  },
];

/*
|--------------------------------------------------------------------------
| REQUIRED REGISTRATION FIELDS
|--------------------------------------------------------------------------
*/

const REQUIRED_FIELDS = [
  {
    value: 'contact_firstname',
    label: 'First Name - Contact',
    disabled: true,
  },
  {
    value: 'contact_lastname',
    label: 'Last Name - Contact',
    disabled: true,
  },
  {
    value: 'contact_email',
    label: 'Email Address - Contact',
    disabled: true,
  },
  {
    value: 'contact_contact_phonenumber',
    label: 'Phone - Contact',
  },
  {
    value: 'contact_website',
    label: 'Website - Contact',
  },
  {
    value: 'contact_title',
    label: 'Position - Contact',
  },
  {
    value: 'company_company',
    label: 'Company - Company',
    disabled: true,
  },
  {
    value: 'company_vat',
    label: 'VAT Number - Company',
  },
  {
    value: 'company_phonenumber',
    label: 'Phone - Company',
  },
  {
    value: 'company_country',
    label: 'Country - Company',
  },
  {
    value: 'company_city',
    label: 'City - Company',
  },
  {
    value: 'company_address',
    label: 'Address - Company',
  },
  {
    value: 'company_zip',
    label: 'Zip Code - Company',
  },
  {
    value: 'company_state',
    label: 'State - Company',
  },
];

/*
|--------------------------------------------------------------------------
| DEFAULT CONTACT PERMISSIONS
|--------------------------------------------------------------------------
*/

const CONTACT_PERMISSIONS = [
  {
    value: '1',
    label: 'Invoices',
  },
  {
    value: '2',
    label: 'Estimates',
  },
  {
    value: '3',
    label: 'Contracts',
  },
  {
    value: '4',
    label: 'Proposals',
  },
  {
    value: '5',
    label: 'Support',
  },
  {
    value: '6',
    label: 'Projects',
  },
];

/*
|--------------------------------------------------------------------------
| INITIAL SETTINGS
|--------------------------------------------------------------------------
*/

const INITIAL_SETTINGS = {
  customer_settings: '1',

  clients_default_theme: 'perfex',

  customer_default_country: '',

  visible_customer_profile_tabs:
    PROFILE_TABS.map((item) => item.value),

  required_register_fields: [
    'contact_firstname',
    'contact_lastname',
    'contact_email',
    'company_company',
  ],

  company_is_required: '1',

  company_requires_vat_number_field: '1',

  allow_registration: '0',

  customers_register_require_confirmation: '0',

  allow_primary_contact_to_manage_other_contacts: '0',

  enable_honeypot_spam_validation: '0',

  allow_primary_contact_to_view_edit_billing_and_shipping: '0',

  only_own_files_contacts: '0',

  allow_contact_to_delete_files: '0',

  use_knowledge_base: '1',

  knowledge_base_without_registration: '1',

  show_estimate_request_in_customers_area: '0',

  default_contact_permissions: [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
  ],

  customer_info_format: `{company_name}
{street}
{city} {state}
{country_code} {zip_code}
{vat_number_with_label}`,
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Normalize a value into a string boolean value.
 */
function normalizeYesNo(value, fallback = '0') {
  if (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true'
  ) {
    return '1';
  }

  if (
    value === false ||
    value === 0 ||
    value === '0' ||
    value === 'false'
  ) {
    return '0';
  }

  return fallback;
}

/**
 * Safely normalize an array setting.
 */
function normalizeArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map(String);
    }
  }

  return fallback;
}

/**
 * Parse custom field options.
 */
function parseFieldOptions(options) {
  if (Array.isArray(options)) {
    return options;
  }

  if (typeof options === 'string') {
    const trimmed = options.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Continue with comma-separated values.
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

/**
 * Normalize custom field value for FormData JSON.
 *
 * File objects cannot be serialized with JSON.stringify.
 */
function prepareCustomFieldValues(values) {
  const prepared = {};

  Object.entries(values || {}).forEach(
    ([slug, value]) => {
      if (value instanceof File) {
        prepared[slug] = '';
        return;
      }

      if (Array.isArray(value)) {
        prepared[slug] = value.map((item) =>
          item instanceof File ? '' : item
        );

        return;
      }

      prepared[slug] = value;
    }
  );

  return prepared;
}

/*
|--------------------------------------------------------------------------
| YES / NO FIELD
|--------------------------------------------------------------------------
*/

function YesNoField({
  label,
  value,
  onChange,
}) {
  const idBase = `yes-no-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className="py-5 border-b last:border-b-0">
      <Label className="block mb-3">
        {label}
      </Label>

      <RadioGroup
        value={normalizeYesNo(value)}
        onValueChange={onChange}
        className="flex items-center gap-6"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem
            value="1"
            id={`${idBase}-yes`}
          />

          <Label
            htmlFor={`${idBase}-yes`}
            className="font-normal cursor-pointer"
          >
            Yes
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <RadioGroupItem
            value="0"
            id={`${idBase}-no`}
          />

          <Label
            htmlFor={`${idBase}-no`}
            className="font-normal cursor-pointer"
          >
            No
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

 /*
   * =========================================================
   * SUCCESS TOAST
   * =========================================================
   */

  const showSuccessToast = (message) => {
    toast.custom(
      () => (
        <Alert variant="mono" icon="success">
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>

          <AlertTitle>
            {message}
          </AlertTitle>
        </Alert>
      ),
      {
        position: 'top-center',
      }
    );
  };

  /*
   * =========================================================
   * ERROR TOAST
   * =========================================================
   */

  const showErrorToast = (message) => {
    toast.custom(
      (t) => (
        <Alert
          variant="mono"
          icon="destructive"
          close={true}
          onClose={() => {
            toast.dismiss(t);
          }}
        >
          <AlertIcon>
            <RiErrorWarningFill />
          </AlertIcon>

          <AlertTitle>
            {message}
          </AlertTitle>
        </Alert>
      ),
      {
        position: 'top-center',
      }
    );
  };
/*
|--------------------------------------------------------------------------
| CUSTOM FIELD
|--------------------------------------------------------------------------
*/

function CustomField({
  field,
  value,
  onChange,
}) {
  const fieldType = String(
    field?.type || 'input'
  ).toLowerCase();

  const label =
    field?.name ||
    field?.label ||
    field?.slug ||
    'Custom Field';

  const fieldValue =
    value === null || value === undefined
      ? ''
      : value;

  const fieldId = `custom-${field?.id ?? field?.slug}`;

  const isDisabled = Boolean(
    field?.disabled
  );

  const isRequired = Boolean(
    field?.required
  );

  const FieldLabel = () => (
    <Label htmlFor={fieldId}>
      {label}

      {isRequired && (
        <span className="text-destructive ml-1">
          *
        </span>
      )}
    </Label>
  );

  /*
  |--------------------------------------------------------------------------
  | INPUT / TEXT / NUMBER / EMAIL
  |--------------------------------------------------------------------------
  */

  if (
    fieldType === 'input' ||
    fieldType === 'text' ||
    fieldType === 'number' ||
    fieldType === 'email'
  ) {
    let inputType = 'text';

    if (fieldType === 'number') {
      inputType = 'number';
    }

    if (fieldType === 'email') {
      inputType = 'email';
    }

    return (
      <div className="space-y-2 w-full">
        <FieldLabel />

        <Input
          id={fieldId}
          type={inputType}
          value={String(fieldValue)}
          disabled={isDisabled}
          required={isRequired}
          placeholder={
            field?.placeholder || ''
          }
          onChange={(event) =>
            onChange(
              field.slug,
              event.target.value
            )
          }
        />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | TEXTAREA
  |--------------------------------------------------------------------------
  */

  if (fieldType === 'textarea') {
    return (
      <div className="space-y-2 w-full">
        <FieldLabel />

        <Textarea
          id={fieldId}
          rows={5}
          value={String(fieldValue)}
          disabled={isDisabled}
          required={isRequired}
          placeholder={
            field?.placeholder || ''
          }
          onChange={(event) =>
            onChange(
              field.slug,
              event.target.value
            )
          }
        />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CHECKBOX
  |--------------------------------------------------------------------------
  */

  if (fieldType === 'checkbox') {
    const isChecked =
      fieldValue === true ||
      fieldValue === 'true' ||
      fieldValue === '1' ||
      fieldValue === 1;

    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={fieldId}
          checked={isChecked}
          disabled={isDisabled}
          onCheckedChange={(checked) =>
            onChange(
              field.slug,
              checked === true
            )
          }
        />

        <FieldLabel />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SELECT
  |--------------------------------------------------------------------------
  */

  if (fieldType === 'select') {
    const options = parseFieldOptions(
      field?.options
    );

    return (
      <div className="space-y-2 w-full">
        <FieldLabel />

        <Select
          value={
            fieldValue !== ''
              ? String(fieldValue)
              : undefined
          }
          disabled={isDisabled}
          onValueChange={(selected) =>
            onChange(
              field.slug,
              selected
            )
          }
        >
          <SelectTrigger id={fieldId}>
            <SelectValue
              placeholder={
                field?.placeholder ||
                'Nothing selected'
              }
            />
          </SelectTrigger>

          <SelectContent>
            {options.length === 0 ? (
              <SelectItem
                value="__no_options__"
                disabled
              >
                No options available
              </SelectItem>
            ) : (
              options.map(
                (option, index) => {
                  const optionValue =
                    typeof option ===
                    'object'
                      ? option.value ??
                        option.id ??
                        option.label
                      : option;

                  const optionLabel =
                    typeof option ===
                    'object'
                      ? option.label ??
                        option.name ??
                        option.value
                      : option;

                  return (
                    <SelectItem
                      key={`${fieldId}-${index}`}
                      value={String(
                        optionValue
                      )}
                    >
                      {String(
                        optionLabel ?? ''
                      )}
                    </SelectItem>
                  );
                }
              )
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RADIO
  |--------------------------------------------------------------------------
  */

  if (fieldType === 'radio') {
    const options = parseFieldOptions(
      field?.options
    );

    return (
      <div className="space-y-3">
        <FieldLabel />

        <RadioGroup
          value={
            fieldValue !== ''
              ? String(fieldValue)
              : ''
          }
          disabled={isDisabled}
          onValueChange={(selected) =>
            onChange(
              field.slug,
              selected
            )
          }
          className="flex flex-wrap gap-5"
        >
          {options.map(
            (option, index) => {
              const optionValue =
                typeof option ===
                'object'
                  ? option.value ??
                    option.id ??
                    option.label
                  : option;

              const optionLabel =
                typeof option ===
                'object'
                  ? option.label ??
                    option.name ??
                    option.value
                  : option;

              const optionId = `${fieldId}-${index}`;

              return (
                <div
                  key={optionId}
                  className="flex items-center gap-2"
                >
                  <RadioGroupItem
                    value={String(
                      optionValue
                    )}
                    id={optionId}
                  />

                  <Label
                    htmlFor={optionId}
                    className="font-normal cursor-pointer"
                  >
                    {String(
                      optionLabel ?? ''
                    )}
                  </Label>
                </div>
              );
            }
          )}
        </RadioGroup>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MULTISELECT
  |--------------------------------------------------------------------------
  */

  if (fieldType === 'multiselect') {
    const options = parseFieldOptions(
      field?.options
    );

    const selectedValues =
      normalizeArray(fieldValue);

    return (
      <div className="space-y-3">
        <FieldLabel />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map(
            (option, index) => {
              const optionValue =
                typeof option ===
                'object'
                  ? option.value ??
                    option.id ??
                    option.label
                  : option;

              const optionLabel =
                typeof option ===
                'object'
                  ? option.label ??
                    option.name ??
                    option.value
                  : option;

              const stringValue =
                String(optionValue);

              const checked =
                selectedValues.includes(
                  stringValue
                );

              const optionId = `${fieldId}-${index}`;

              return (
                <div
                  key={optionId}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    id={optionId}
                    checked={checked}
                    disabled={isDisabled}
                    onCheckedChange={(
                      isChecked
                    ) => {
                      let updated = [
                        ...selectedValues,
                      ];

                      if (
                        isChecked === true
                      ) {
                        if (
                          !updated.includes(
                            stringValue
                          )
                        ) {
                          updated.push(
                            stringValue
                          );
                        }
                      } else {
                        updated =
                          updated.filter(
                            (item) =>
                              item !==
                              stringValue
                          );
                      }

                      onChange(
                        field.slug,
                        updated
                      );
                    }}
                  />

                  <Label
                    htmlFor={optionId}
                    className="font-normal cursor-pointer"
                  >
                    {String(
                      optionLabel ?? ''
                    )}
                  </Label>
                </div>
              );
            }
          )}
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | FILE
  |--------------------------------------------------------------------------
  */

  if (fieldType === 'file') {
    return (
      <div className="space-y-2 w-full">
        <FieldLabel />

        <Input
          id={fieldId}
          type="file"
          disabled={isDisabled}
          required={isRequired}
          onChange={(event) => {
            const file =
              event.target.files?.[0] ||
              null;

            onChange(
              field.slug,
              file
            );
          }}
        />

        {typeof fieldValue ===
          'string' &&
          fieldValue && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Current file:
              </span>

              <a
                href={toAbsoluteUrl(
                  fieldValue
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
              >
                View File
              </a>
            </div>
          )}

        {typeof File !== 'undefined' &&
          fieldValue instanceof File && (
            <p className="text-sm text-muted-foreground">
              Selected file:{' '}
              {fieldValue.name}
            </p>
          )}
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DATE
  |--------------------------------------------------------------------------
  */

  if (
    fieldType === 'date_picker' ||
    fieldType === 'date'
  ) {
    return (
      <div className="space-y-2 w-full">
        <FieldLabel />

        <Input
          id={fieldId}
          type="date"
          value={
            fieldValue
              ? String(
                  fieldValue
                ).substring(0, 10)
              : ''
          }
          disabled={isDisabled}
          required={isRequired}
          onChange={(event) =>
            onChange(
              field.slug,
              event.target.value
            )
          }
        />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DATE + TIME
  |--------------------------------------------------------------------------
  */

  if (
    fieldType ===
      'date_picker_time' ||
    fieldType === 'datetime' ||
    fieldType === 'datetime-local'
  ) {
    return (
      <div className="space-y-2 w-full">
        <FieldLabel />

        <Input
          id={fieldId}
          type="datetime-local"
          value={
            fieldValue
              ? String(
                  fieldValue
                ).slice(0, 16)
              : ''
          }
          disabled={isDisabled}
          required={isRequired}
          onChange={(event) =>
            onChange(
              field.slug,
              event.target.value
            )
          }
        />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | COLOR
  |--------------------------------------------------------------------------
  */

  if (
    fieldType === 'colorpicker' ||
    fieldType === 'color_picker' ||
    fieldType === 'color'
  ) {
    const rawColor =
      typeof fieldValue === 'string'
        ? fieldValue
        : '';

    const colorValue =
      /^#[0-9A-Fa-f]{6}$/.test(
        rawColor
      )
        ? rawColor
        : '#000000';

    return (
      <div className="space-y-2 w-full">
        <FieldLabel />

        <div className="flex items-center gap-3">
          <Input
            id={fieldId}
            type="color"
            value={colorValue}
            disabled={isDisabled}
            onChange={(event) =>
              onChange(
                field.slug,
                event.target.value
              )
            }
            className="h-10 w-16 cursor-pointer p-1"
          />

          <Input
            type="text"
            value={
              rawColor || '#000000'
            }
            disabled={isDisabled}
            placeholder="#000000"
            onChange={(event) =>
              onChange(
                field.slug,
                event.target.value
              )
            }
          />
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | URL / HYPERLINK
  |--------------------------------------------------------------------------
  */

  if (
    fieldType === 'hyperlink' ||
    fieldType === 'url' ||
    fieldType === 'link'
  ) {
    return (
      <div className="space-y-2 w-full">
        <FieldLabel />

        <Input
          id={fieldId}
          type="url"
          value={String(fieldValue)}
          disabled={isDisabled}
          required={isRequired}
          placeholder={
            field?.placeholder ||
            'https://example.com'
          }
          onChange={(event) =>
            onChange(
              field.slug,
              event.target.value
            )
          }
        />

        {fieldValue &&
          typeof fieldValue ===
            'string' && (
            <div className="pt-1">
              <a
                href={toAbsoluteUrl(
                  fieldValue
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary underline underline-offset-4 hover:opacity-80"
              >
                Open Link
              </a>
            </div>
          )}
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DEFAULT INPUT
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-2 w-full">
      <FieldLabel />

      <Input
        id={fieldId}
        value={String(fieldValue)}
        disabled={isDisabled}
        required={isRequired}
        placeholder={
          field?.placeholder || ''
        }
        onChange={(event) =>
          onChange(
            field.slug,
            event.target.value
          )
        }
      />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function CustomerSettingsPage() {
  /*
  |--------------------------------------------------------------------------
  | SETTINGS
  |--------------------------------------------------------------------------
  */

  const [settings, setSettings] =
    useState(() => ({
      ...INITIAL_SETTINGS,
    }));

  /*
  |--------------------------------------------------------------------------
  | CUSTOM FIELDS
  |--------------------------------------------------------------------------
  */

  const [customFields, setCustomFields] =
    useState([]);

  /*
  |--------------------------------------------------------------------------
  | CUSTOM FIELD VALUES
  |--------------------------------------------------------------------------
  */

  const [
    customFieldValues,
    setCustomFieldValues,
  ] = useState({});

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  const [loading, setLoading] =
    useState(true);

  /*
  |--------------------------------------------------------------------------
  | SAVING
  |--------------------------------------------------------------------------
  */

  const [saving, setSaving] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | COUNTRIES
  |--------------------------------------------------------------------------
  */

  const [countries, setCountries] =
    useState([]);

  const [
    loadingCountries,
    setLoadingCountries,
  ] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadSettings();
    loadCountries();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD COUNTRIES
  |--------------------------------------------------------------------------
  */

  async function loadCountries() {
    try {
      setLoadingCountries(true);

      const response = await fetch(
        '/api/countries',
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Failed to load countries'
        );
      }

      setCountries(
        Array.isArray(result.data)
          ? result.data
          : []
      );
    } catch (error) {
      console.error(
        'Country loading error:',
        error
      );

      setCountries([]);
      showErrorToast(
        error?.message ||
          'Failed to load countries'
      );
    } finally {
      setLoadingCountries(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | LOAD CUSTOMER SETTINGS
  |--------------------------------------------------------------------------
  */

  async function loadSettings() {
    try {
      setLoading(true);

      const response = await fetch(
        '/api/settings/configure-features/customer',
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Failed to load customer settings'
        );
      }

      const data =
        result.data || {};

      /*
      |--------------------------------------------------------------------------
      | NORMAL SETTINGS
      |--------------------------------------------------------------------------
      */

      const normalizedSettings = {
        ...INITIAL_SETTINGS,
        ...data,

        visible_customer_profile_tabs:
          normalizeArray(
            data.visible_customer_profile_tabs,
            INITIAL_SETTINGS.visible_customer_profile_tabs
          ),

        required_register_fields:
          normalizeArray(
            data.required_register_fields,
            INITIAL_SETTINGS.required_register_fields
          ),

        default_contact_permissions:
          normalizeArray(
            data.default_contact_permissions,
            INITIAL_SETTINGS.default_contact_permissions
          ),

        customer_default_country:
          data.customer_default_country !==
          null &&
          data.customer_default_country !==
          undefined
            ? String(
                data.customer_default_country
              )
            : '',

        company_is_required:
          normalizeYesNo(
            data.company_is_required,
            INITIAL_SETTINGS.company_is_required
          ),

        company_requires_vat_number_field:
          normalizeYesNo(
            data.company_requires_vat_number_field,
            INITIAL_SETTINGS.company_requires_vat_number_field
          ),

        allow_registration:
          normalizeYesNo(
            data.allow_registration,
            INITIAL_SETTINGS.allow_registration
          ),

        customers_register_require_confirmation:
          normalizeYesNo(
            data.customers_register_require_confirmation,
            INITIAL_SETTINGS.customers_register_require_confirmation
          ),

        allow_primary_contact_to_manage_other_contacts:
          normalizeYesNo(
            data.allow_primary_contact_to_manage_other_contacts,
            INITIAL_SETTINGS.allow_primary_contact_to_manage_other_contacts
          ),

        enable_honeypot_spam_validation:
          normalizeYesNo(
            data.enable_honeypot_spam_validation,
            INITIAL_SETTINGS.enable_honeypot_spam_validation
          ),

        allow_primary_contact_to_view_edit_billing_and_shipping:
          normalizeYesNo(
            data.allow_primary_contact_to_view_edit_billing_and_shipping,
            INITIAL_SETTINGS.allow_primary_contact_to_view_edit_billing_and_shipping
          ),

        only_own_files_contacts:
          normalizeYesNo(
            data.only_own_files_contacts,
            INITIAL_SETTINGS.only_own_files_contacts
          ),

        allow_contact_to_delete_files:
          normalizeYesNo(
            data.allow_contact_to_delete_files,
            INITIAL_SETTINGS.allow_contact_to_delete_files
          ),

        use_knowledge_base:
          normalizeYesNo(
            data.use_knowledge_base,
            INITIAL_SETTINGS.use_knowledge_base
          ),

        knowledge_base_without_registration:
          normalizeYesNo(
            data.knowledge_base_without_registration,
            INITIAL_SETTINGS.knowledge_base_without_registration
          ),

        show_estimate_request_in_customers_area:
          normalizeYesNo(
            data.show_estimate_request_in_customers_area,
            INITIAL_SETTINGS.show_estimate_request_in_customers_area
          ),

        customer_info_format:
          data.customer_info_format ??
          INITIAL_SETTINGS.customer_info_format,
      };

      setSettings(
        normalizedSettings
      );

      /*
      |--------------------------------------------------------------------------
      | CUSTOM FIELDS
      |--------------------------------------------------------------------------
      */

      const fields =
        Array.isArray(
          result.custom_fields
        )
          ? result.custom_fields
          : [];

      setCustomFields(fields);

      /*
      |--------------------------------------------------------------------------
      | CUSTOM FIELD VALUES
      |--------------------------------------------------------------------------
      */

      const values =
        result.custom_field_values &&
        typeof result.custom_field_values ===
          'object'
          ? result.custom_field_values
          : {};

      setCustomFieldValues(values);

      console.log(
        'Customer settings loaded:',
        normalizedSettings
      );

      console.log(
        'Customer custom fields:',
        fields
      );

      console.log(
        'Customer custom field values:',
        values
      );
    } catch (error) {
      console.error(
        'Customer settings loading error:',
        error
      );
      showErrorToast(
        error?.message ||
          'Failed to load customer settings'
      );      
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | UPDATE SETTING
  |--------------------------------------------------------------------------
  */

  function updateSetting(key, value) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  /*
  |--------------------------------------------------------------------------
  | UPDATE CUSTOM FIELD
  |--------------------------------------------------------------------------
  */

  function handleCustomFieldChange(
    slug,
    value
  ) {
    setCustomFieldValues(
      (previous) => ({
        ...previous,
        [slug]: value,
      })
    );
  }

  /*
  |--------------------------------------------------------------------------
  | TOGGLE ARRAY VALUE
  |--------------------------------------------------------------------------
  */

  function toggleArrayValue(
    key,
    value
  ) {
    setSettings((previous) => {
      const current = Array.isArray(
        previous[key]
      )
        ? previous[key].map(String)
        : [];

      const stringValue = String(value);

      const exists =
        current.includes(
          stringValue
        );

      return {
        ...previous,

        [key]: exists
          ? current.filter(
              (item) =>
                item !== stringValue
            )
          : [
              ...current,
              stringValue,
            ],
      };
    });
  }

  /*
  |--------------------------------------------------------------------------
  | SELECT ALL
  |--------------------------------------------------------------------------
  */

  function selectAll(key, items) {
    updateSetting(
      key,
      items.map((item) =>
        String(item.value)
      )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DESELECT ALL
  |--------------------------------------------------------------------------
  */

  function deselectAll(key) {
    updateSetting(key, []);
  }
    /*
  |--------------------------------------------------------------------------
  | CREATE NOTIFICATION
  |--------------------------------------------------------------------------
  */

  async function createCustomerSettingsNotification() {
    try {
      const notificationResponse = await fetch(
        '/api/notifications',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            module: 'customer_settings',
            action: 'updated',
            title: 'Customer Settings Updated',
            message:
              'Customer settings have been updated successfully.',
            entityType: 'settings',
            entityName: 'Customer Settings',
          }),
        }
      );

      const notificationResult =
        await notificationResponse.json();

      if (
        !notificationResponse.ok ||
        !notificationResult.success
      ) {
        throw new Error(
          notificationResult?.message ||
            notificationResult?.error ||
            'Failed to create notification.'
        );
      }

      // Update notification list and unread count
      window.dispatchEvent(
        new CustomEvent('notifications-refresh')
      );
    } catch (error) {
      // Do not fail customer settings save
      // if notification creation fails.
      console.error(
        '[CUSTOMER SETTINGS NOTIFICATION ERROR]',
        error
      );
    }
  }
  /*
  |--------------------------------------------------------------------------
  | SAVE SETTINGS
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    try {
      setSaving(true);

      /*
      |--------------------------------------------------------------------------
      | Prepare custom fields
      |--------------------------------------------------------------------------
      */

      const preparedCustomFieldValues =
        prepareCustomFieldValues(
          customFieldValues
        );

      /*
      |--------------------------------------------------------------------------
      | FormData
      |--------------------------------------------------------------------------
      */

      const formData =
        new FormData();

      /*
      |--------------------------------------------------------------------------
      | Customer Settings
      |--------------------------------------------------------------------------
      */

      formData.append(
        'customerSettings',
        JSON.stringify(settings)
      );

      /*
      |--------------------------------------------------------------------------
      | Custom Field Values
      |--------------------------------------------------------------------------
      */

      formData.append(
        'customFields',
        JSON.stringify(
          preparedCustomFieldValues
        )
      );

      /*
      |--------------------------------------------------------------------------
      | Custom Files
      |--------------------------------------------------------------------------
      */

      Object.entries(
        customFieldValues || {}
      ).forEach(
        ([slug, value]) => {
          if (
            typeof File !==
              'undefined' &&
            value instanceof File
          ) {
            formData.append(
              `customFile_${slug}`,
              value,
              value.name
            );
          }
        }
      );

      /*
      |--------------------------------------------------------------------------
      | DEBUG
      |--------------------------------------------------------------------------
      */

      console.log(
        'Customer Settings:',
        settings
      );

      console.log(
        'Custom Field Values:',
        customFieldValues
      );

      /*
      |--------------------------------------------------------------------------
      | API REQUEST
      |--------------------------------------------------------------------------
      */

      const response =
        await fetch(
          '/api/settings/configure-features/customer',
          {
            method: 'POST',

            /*
            IMPORTANT:
            Do not manually set Content-Type.
            Browser will automatically add multipart boundary.
            */
            body: formData,
          }
        );

      const result =
        await response.json();

      console.log(
        'Customer Settings API:',
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Failed to save customer settings'
        );
      }
      await loadSettings();
      await createCustomerSettingsNotification();
      showSuccessToast(
        result.message ||
          'Customer settings saved successfully'
      );
    } catch (error) {
      console.error(
        'Customer settings save error:',
        error
      );
      showErrorToast(
        error?.message ||
          'Failed to save customer settings'
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING SCREEN
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          Loading customer settings...
        </p>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
    <div className="space-y-6 lg:max-w-[1024px] mx-auto">
      {/* ================================================================
          CUSTOMER SETTINGS
      ================================================================= */}

      <Card>
        <CardHeader>
          <CardTitle>
            Customer Settings
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* DEFAULT THEME */}

          <div className="py-5 border-b">
            <Label className="block mb-3">
              Default customers theme
            </Label>

            <Select
              value={
                settings.clients_default_theme ||
                ''
              }
              onValueChange={(value) =>
                updateSetting(
                  'clients_default_theme',
                  value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="perfex">
                  Perfex
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DEFAULT COUNTRY */}

          <div className="py-5 border-b">
            <Label className="block mb-3">
              Default Country
            </Label>

            <Select
              value={
                settings.customer_default_country ||
                undefined
              }
              onValueChange={(value) =>
                updateSetting(
                  'customer_default_country',
                  value
                )
              }
              disabled={
                loadingCountries
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    loadingCountries
                      ? 'Loading countries...'
                      : 'Nothing selected'
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {countries.length ===
                0 ? (
                  <SelectItem
                    value="__no_country__"
                    disabled
                  >
                    No countries found
                  </SelectItem>
                ) : (
                  countries.map(
                    (country) => (
                      <SelectItem
                        key={
                          country.id
                        }
                        value={String(
                          country.id
                        )}
                      >
                        {country.name}
                      </SelectItem>
                    )
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          PROFILE TABS
      ================================================================= */}

      <Card>
        <CardHeader>
          <CardTitle>
            Visible Tabs (Profile)
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                selectAll(
                  'visible_customer_profile_tabs',
                  PROFILE_TABS
                )
              }
            >
              Select All
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                deselectAll(
                  'visible_customer_profile_tabs'
                )
              }
            >
              Deselect All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROFILE_TABS.map(
              (item) => {
                const checked =
                  settings.visible_customer_profile_tabs?.includes(
                    item.value
                  ) || false;

                return (
                  <div
                    key={item.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      id={`profile-${item.value}`}
                      checked={checked}
                      onCheckedChange={() =>
                        toggleArrayValue(
                          'visible_customer_profile_tabs',
                          item.value
                        )
                      }
                    />

                    <Label
                      htmlFor={`profile-${item.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {item.label}
                    </Label>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          REQUIRED REGISTRATION FIELDS
      ================================================================= */}

      <Card>
        <CardHeader>
          <CardTitle>
            Required fields for registration
            (customers area)
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                selectAll(
                  'required_register_fields',
                  REQUIRED_FIELDS
                )
              }
            >
              Select All
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                deselectAll(
                  'required_register_fields'
                )
              }
            >
              Deselect All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {REQUIRED_FIELDS.map(
              (item) => {
                const checked =
                  settings.required_register_fields?.includes(
                    item.value
                  ) || false;

                return (
                  <div
                    key={item.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      id={`required-${item.value}`}
                      checked={checked}
                      disabled={Boolean(
                        item.disabled
                      )}
                      onCheckedChange={() =>
                        toggleArrayValue(
                          'required_register_fields',
                          item.value
                        )
                      }
                    />

                    <Label
                      htmlFor={`required-${item.value}`}
                      className="font-normal"
                    >
                      {item.label}
                    </Label>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          COMPANY
      ================================================================= */}

      <Card>
        <CardHeader>
          <CardTitle>
            Company
          </CardTitle>
        </CardHeader>

        <CardContent>
          <YesNoField
            label="Company field is required?"
            value={
              settings.company_is_required
            }
            onChange={(value) =>
              updateSetting(
                'company_is_required',
                value
              )
            }
          />

          <YesNoField
            label="Company requires the usage of the VAT Number field"
            value={
              settings.company_requires_vat_number_field
            }
            onChange={(value) =>
              updateSetting(
                'company_requires_vat_number_field',
                value
              )
            }
          />
        </CardContent>
      </Card>

      {/* ================================================================
          REGISTRATION
      ================================================================= */}

      <Card>
        <CardHeader>
          <CardTitle>
            Registration
          </CardTitle>
        </CardHeader>

        <CardContent>
          <YesNoField
            label="Allow customers to register"
            value={
              settings.allow_registration
            }
            onChange={(value) =>
              updateSetting(
                'allow_registration',
                value
              )
            }
          />

          <YesNoField
            label="Require registration confirmation from administrator after customer register"
            value={
              settings.customers_register_require_confirmation
            }
            onChange={(value) =>
              updateSetting(
                'customers_register_require_confirmation',
                value
              )
            }
          />

          <YesNoField
            label="Allow primary contact to manage other customer contacts"
            value={
              settings.allow_primary_contact_to_manage_other_contacts
            }
            onChange={(value) =>
              updateSetting(
                'allow_primary_contact_to_manage_other_contacts',
                value
              )
            }
          />

          <YesNoField
            label="Enable Honeypot spam validation"
            value={
              settings.enable_honeypot_spam_validation
            }
            onChange={(value) =>
              updateSetting(
                'enable_honeypot_spam_validation',
                value
              )
            }
          />
        </CardContent>
      </Card>

      {/* ================================================================
          CUSTOMER AREA
      ================================================================= */}

      <Card>
        <CardHeader>
          <CardTitle>
            Customer Area
          </CardTitle>
        </CardHeader>

        <CardContent>
          <YesNoField
            label="Allow primary contact to view/edit billing & shipping details"
            value={
              settings.allow_primary_contact_to_view_edit_billing_and_shipping
            }
            onChange={(value) =>
              updateSetting(
                'allow_primary_contact_to_view_edit_billing_and_shipping',
                value
              )
            }
          />

          <YesNoField
            label="Contacts see only own files uploaded in customer area"
            value={
              settings.only_own_files_contacts
            }
            onChange={(value) =>
              updateSetting(
                'only_own_files_contacts',
                value
              )
            }
          />

          <YesNoField
            label="Allow contacts to delete own files uploaded from customers area"
            value={
              settings.allow_contact_to_delete_files
            }
            onChange={(value) =>
              updateSetting(
                'allow_contact_to_delete_files',
                value
              )
            }
          />

          <YesNoField
            label="Use Knowledge Base"
            value={
              settings.use_knowledge_base
            }
            onChange={(value) =>
              updateSetting(
                'use_knowledge_base',
                value
              )
            }
          />

          <YesNoField
            label="Allow knowledge base to be viewed without registration"
            value={
              settings.knowledge_base_without_registration
            }
            onChange={(value) =>
              updateSetting(
                'knowledge_base_without_registration',
                value
              )
            }
          />
        </CardContent>
      </Card>

      {/* ================================================================
          ESTIMATE REQUEST
      ================================================================= */}

      <Card>
        <CardHeader>
          <CardTitle>
            Estimate Request
          </CardTitle>
        </CardHeader>

        <CardContent>
          <YesNoField
            label="Show Estimate request link in customers area?"
            value={
              settings.show_estimate_request_in_customers_area
            }
            onChange={(value) =>
              updateSetting(
                'show_estimate_request_in_customers_area',
                value
              )
            }
          />
        </CardContent>
      </Card>

      {/* ================================================================
          DEFAULT CONTACT PERMISSIONS
      ================================================================= */}

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>
            Default contact permissions
          </CardTitle>
        </CardHeader>

        <CardContent className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CONTACT_PERMISSIONS.map(
              (item) => {
                const checked =
                  settings.default_contact_permissions?.includes(
                    item.value
                  ) || false;

                return (
                  <div
                    key={item.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      id={`permission-${item.value}`}
                      checked={checked}
                      onCheckedChange={() =>
                        toggleArrayValue(
                          'default_contact_permissions',
                          item.value
                        )
                      }
                    />

                    <Label
                      htmlFor={`permission-${item.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {item.label}
                    </Label>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          CUSTOMER CUSTOM FIELDS
      ================================================================= */}

      <Card>
        <CardHeader>
          <CardTitle>
            Custom Fields
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Additional customer information
            fields.
          </p>
        </CardHeader>

        <CardContent>
          {customFields.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {customFields.map(
                (field) => (
                  <div
                    key={
                      field.id ??
                      field.slug
                    }
                  >
                    <CustomField
                      field={field}
                      value={
                        customFieldValues[
                          field.slug
                        ]
                      }
                      onChange={
                        handleCustomFieldChange
                      }
                    />
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No custom fields found for
              customers.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          CUSTOMER INFORMATION FORMAT
      ================================================================= */}

      <Card>
        <CardHeader>
          <CardTitle>
            Customer Information Format
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Textarea
            rows={10}
            value={
              settings.customer_info_format ||
              ''
            }
            onChange={(event) =>
              updateSetting(
                'customer_info_format',
                event.target.value
              )
            }
          />

          <div className="mt-3 text-sm text-muted-foreground leading-7">
            <span>
              {'{company_name}'}
            </span>{' '}

            <span>
              {'{customer_id}'}
            </span>{' '}

            <span>
              {'{street}'}
            </span>{' '}

            <span>
              {'{city}'}
            </span>{' '}

            <span>
              {'{state}'}
            </span>{' '}

            <span>
              {'{zip_code}'}
            </span>{' '}

            <span>
              {'{country_code}'}
            </span>{' '}

            <span>
              {'{country_name}'}
            </span>{' '}

            <span>
              {'{phone}'}
            </span>{' '}

            <span>
              {'{vat_number}'}
            </span>{' '}

            <span>
              {'{vat_number_with_label}'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          SAVE
      ================================================================= */}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : 'Save Settings'}
        </Button>
      </div>
    </div>
    </form>
  );
}