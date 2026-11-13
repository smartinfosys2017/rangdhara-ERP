'use client';

import { useEffect, useState } from 'react';
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';
import { LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

import { toAbsoluteUrl } from '@/lib/helpers';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Checkbox } from '@/components/ui/checkbox';

const DEFAULT_COMPANY_INFORMATION_FORMAT =
  '[{company_name}] [{address}], [{city}], [{state}], [{zip_code}], [{country_code}], [{phone}], [{vat_number}], [{vat_number_with_label}]';

const FILE_TYPES = [
  'file',
  'image',
  'multi_file',
  'multi_image',
  'multi_attachment',
];

const MULTIPLE_FILE_TYPES = [
  'multi_file',
  'multi_image',
  'multi_attachment',
];

export default function CompanyInfoPage() {
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  const [
    companyInformationFormat,
    setCompanyInformationFormat,
  ] = useState(DEFAULT_COMPANY_INFORMATION_FORMAT);

  const [customFields, setCustomFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const showSuccessToast = (message) => {
    toast.custom(
      () => (
        <Alert variant="mono" icon="success">
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>
          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ),
      {
        position: 'top-center',
      }
    );
  };

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
          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ),
      {
        position: 'top-center',
      }
    );
  };

  const getDefaultFieldValue = (field) => {
    const type = field.type || 'input';

    if (type === 'checkbox') {
      if (field.options) {
        if (
          field.defaultValue &&
          typeof field.defaultValue === 'string'
        ) {
          try {
            if (field.defaultValue.startsWith('[')) {
              const parsed = JSON.parse(field.defaultValue);

              if (Array.isArray(parsed)) {
                return parsed;
              }
            }
          } catch {
            return field.defaultValue
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
          }

          return field.defaultValue
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        }

        return [];
      }

      return (
        field.defaultValue === true ||
        field.defaultValue === 'true' ||
        field.defaultValue === '1'
      );
    }

    if (type === 'multiselect') {
      if (Array.isArray(field.defaultValue)) {
        return field.defaultValue;
      }

      if (field.defaultValue) {
        return String(field.defaultValue)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }

      return [];
    }

    if (FILE_TYPES.includes(type)) {
      if (
        MULTIPLE_FILE_TYPES.includes(type)
      ) {
        if (Array.isArray(field.defaultValue)) {
          return field.defaultValue;
        }

        if (field.defaultValue) {
          if (typeof field.defaultValue === 'string') {
            try {
              const parsed = JSON.parse(field.defaultValue);

              if (Array.isArray(parsed)) {
                return parsed;
              }

              if (parsed && typeof parsed === 'object') {
                return [parsed];
              }
            } catch {
              return [
                {
                  path: field.defaultValue,
                  url: field.defaultValue,
                },
              ];
            }
          }

          if (
            typeof field.defaultValue === 'object'
          ) {
            return [field.defaultValue];
          }
        }

        return [];
      }

      return field.defaultValue || '';
    }

    return field.defaultValue ?? '';
  };

  const loadCompanyInfo = async () => {
    try {
      setLoading(true);

      const companyResponse = await fetch(
        '/api/settings/general/company',
        {
          cache: 'no-store',
        }
      );

      const companyResult =
        await companyResponse.json();

      if (companyResult.success) {
        const data = companyResult.data || {};

        setCompanyName(data.company_name || '');
        setAddress(data.address || '');
        setCity(data.city || '');
        setState(data.state || '');
        setCountryCode(data.country_code || '');
        setZipCode(data.zip_code || '');
        setPhone(data.phone || '');
        setVatNumber(data.vat_number || '');

        setCompanyInformationFormat(
          data.company_information_format ||
            DEFAULT_COMPANY_INFORMATION_FORMAT
        );

        if (
          data.custom_field_values &&
          Object.keys(data.custom_field_values).length > 0
        ) {
          setCustomFieldValues(
            data.custom_field_values
          );
        } else if (
          data.custom_fields &&
          Array.isArray(data.custom_fields)
        ) {
          const defaultValues = {};

          data.custom_fields.forEach((field) => {
            if (!field.slug) {
              return;
            }

            defaultValues[field.slug] =
              getDefaultFieldValue(field);
          });

          setCustomFieldValues(defaultValues);
        }
      }

      const fieldsResponse = await fetch(
        '/api/custom_fields?fieldto=company',
        {
          cache: 'no-store',
        }
      );

      const fieldsResult =
        await fieldsResponse.json();

      if (
        fieldsResponse.ok &&
        fieldsResult.success
      ) {
        const fields = fieldsResult.data || [];

        const companyFields = fields
          .filter(
            (field) =>
              field.fieldto === 'company'
          )
          .sort(
            (a, b) =>
              Number(a.fieldOrder || 0) -
              Number(b.fieldOrder || 0)
          );

        setCustomFields(companyFields);

        setCustomFieldValues((previous) => {
          const values = {
            ...previous,
          };

          companyFields.forEach((field) => {
            if (
              values[field.slug] !== undefined
            ) {
              return;
            }

            values[field.slug] =
              getDefaultFieldValue(field);
          });

          return values;
        });
      }
    } catch (error) {
      console.error(
        'Failed to load company information:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to load company information.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCustomFieldChange = (
    slug,
    value
  ) => {
    setCustomFieldValues((previous) => ({
      ...previous,
      [slug]: value,
    }));
  };

  const validateRequiredCustomFields = () => {
    for (const field of customFields) {
      if (!field.required) {
        continue;
      }

      const value =
        customFieldValues[field.slug];

      const type = field.type || 'input';

      if (FILE_TYPES.includes(type)) {
        if (
          MULTIPLE_FILE_TYPES.includes(type)
        ) {
          const hasExistingFiles =
            Array.isArray(value) &&
            value.some(
              (item) =>
                !(item instanceof File) &&
                item
            );

          const hasNewFiles =
            Array.isArray(value) &&
            value.some(
              (item) => item instanceof File
            );

          if (
            !hasExistingFiles &&
            !hasNewFiles
          ) {
            showErrorToast(
              `${field.name} is required.`
            );
            return false;
          }
        } else {
          if (
            !(value instanceof File) &&
            !value
          ) {
            showErrorToast(
              `${field.name} is required.`
            );
            return false;
          }
        }

        continue;
      }

      if (type === 'checkbox') {
        if (field.options) {
          const selectedValues =
            Array.isArray(value)
              ? value
              : [];

          if (
            selectedValues.length === 0
          ) {
            showErrorToast(
              `${field.name} is required.`
            );
            return false;
          }
        } else {
          if (
            value !== true &&
            value !== 'true' &&
            value !== '1'
          ) {
            showErrorToast(
              `${field.name} is required.`
            );
            return false;
          }
        }

        continue;
      }

      if (type === 'multiselect') {
        if (
          !Array.isArray(value) ||
          value.length === 0
        ) {
          showErrorToast(
            `${field.name} is required.`
          );
          return false;
        }

        continue;
      }

      if (
        value === null ||
        value === undefined ||
        String(value).trim() === ''
      ) {
        showErrorToast(
          `${field.name} is required.`
        );
        return false;
      }
    }

    return true;
  };
  const createCompanyInfoNotification = async () => {
  try {
    const notificationResponse = await fetch(
      '/api/notifications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module: 'company_information',
          action: 'updated',
          title: 'Company Information Updated',
          message:
            'Company information has been updated successfully.',
          entityType: 'company',
          entityName: companyName || 'Company Information',
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

    // Refresh notification list and unread count
    window.dispatchEvent(
      new CustomEvent('notifications-refresh')
    );
  } catch (error) {
    // Notification failure should NOT make the company save fail
    console.error(
      '[COMPANY INFORMATION NOTIFICATION ERROR]',
      error
    );
  }
};
  const handleSave = async () => {
    if (!validateRequiredCustomFields()) {
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append(
        'companyName',
        companyName || ''
      );

      formData.append(
        'address',
        address || ''
      );

      formData.append(
        'city',
        city || ''
      );

      formData.append(
        'state',
        state || ''
      );

      formData.append(
        'countryCode',
        countryCode || ''
      );

      formData.append(
        'zipCode',
        zipCode || ''
      );

      formData.append(
        'phone',
        phone || ''
      );

      formData.append(
        'vatNumber',
        vatNumber || ''
      );

      formData.append(
        'companyInformationFormat',
        companyInformationFormat || ''
      );

      const customFieldData = {};

      Object.entries(
        customFieldValues || {}
      ).forEach(([slug, value]) => {
        if (value instanceof File) {
          formData.append(
            `customFile_${slug}`,
            value,
            value.name
          );

          customFieldData[slug] = {
            type: 'file',
            isFile: true,
            count: 1,
          };

          return;
        }

        if (Array.isArray(value)) {
          const fileItems = value.filter(
            (item) => item instanceof File
          );

          const existingItems = value.filter(
            (item) => !(item instanceof File)
          );

          if (fileItems.length > 0) {
            fileItems.forEach((file) => {
              formData.append(
                `customFile_${slug}`,
                file,
                file.name
              );
            });

            customFieldData[slug] = {
              type:
                fileItems.length > 1 ||
                existingItems.length > 0
                  ? 'multi_file'
                  : 'file',
              isFile: true,
              count: fileItems.length,
              existingCount:
                existingItems.length,
            };

            return;
          }

          customFieldData[slug] = value;
          return;
        }

        customFieldData[slug] =
          value ?? '';
      });

      formData.append(
        'customFields',
        JSON.stringify(customFieldData)
      );

      console.log(
        '========== CUSTOM FIELD JSON =========='
      );

      console.log(customFieldData);

      console.log(
        '========== FORMDATA =========='
      );

      for (
        const [key, value] of formData.entries()
      ) {
        if (value instanceof File) {
          console.log(key, {
            name: value.name,
            type: value.type,
            size: value.size,
          });
        } else {
          console.log(key, value);
        }
      }

      const response = await fetch(
        '/api/settings/general/company',
        {
          method: 'POST',
          body: formData,
        }
      );

      const result =
        await response.json();

      console.log(
        'SAVE RESPONSE:',
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Failed to save company information.'
        );
      }     
      await loadCompanyInfo();
      await createCompanyInfoNotification();
      showSuccessToast(
        'Company information saved successfully'
      );
    } catch (error) {
      console.error(
        'Company save error:',
        error
      );

      showErrorToast(
        error?.message ||
          'Something went wrong while saving settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>
            Company Information
          </CardTitle>
        </CardHeader>

        <CardContent className="py-12">
          <div className="flex min-h-40 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-5 animate-spin" />
              Loading company information...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>
          Company Information
        </CardTitle>
      </CardHeader>

      <CardContent className="py-12">
        <div className="mx-auto space-y-6 lg:max-w-[1024px]">
          <Alert>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>

            <AlertTitle>
              Keep your company information up to date
            </AlertTitle>
          </Alert>

          <div className="grid gap-5">
            <CompanyField label="Company Name">
              <Input
                type="text"
                value={companyName}
                onChange={(e) =>
                  setCompanyName(
                    e.target.value
                  )
                }
                placeholder="Company Name"
              />
            </CompanyField>

            <CompanyField label="Address">
              <Input
                type="text"
                value={address}
                onChange={(e) =>
                  setAddress(
                    e.target.value
                  )
                }
                placeholder="Address"
              />
            </CompanyField>

            <CompanyField label="City">
              <Input
                type="text"
                value={city}
                onChange={(e) =>
                  setCity(e.target.value)
                }
                placeholder="City"
              />
            </CompanyField>

            <CompanyField label="State">
              <Input
                type="text"
                value={state}
                onChange={(e) =>
                  setState(
                    e.target.value
                  )
                }
                placeholder="State"
              />
            </CompanyField>

            <CompanyField label="Country Code">
              <Input
                type="text"
                value={countryCode}
                onChange={(e) =>
                  setCountryCode(
                    e.target.value
                  )
                }
                placeholder="Country Code"
              />
            </CompanyField>

            <CompanyField label="Zip Code">
              <Input
                type="text"
                value={zipCode}
                onChange={(e) =>
                  setZipCode(
                    e.target.value
                  )
                }
                placeholder="Zip Code"
              />
            </CompanyField>

            <CompanyField label="Phone">
              <Input
                type="text"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                placeholder="Phone"
              />
            </CompanyField>

            <CompanyField label="VAT Number">
              <Input
                type="text"
                value={vatNumber}
                onChange={(e) =>
                  setVatNumber(
                    e.target.value
                  )
                }
                placeholder="VAT Number"
              />
            </CompanyField>
          </div>

          {customFields.length > 0 && (
            <div className="space-y-5 border-t pt-6">
              <div>
                <h3 className="text-lg font-semibold">
                  Custom Fields
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Additional company information fields.
                </p>
              </div>

              <div className="grid gap-5">
                {customFields.map(
                  (field) => (
                    <CustomField
                      key={field.id}
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
                  )
                )}
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <div className="flex flex-wrap items-start gap-2.5 lg:flex-nowrap">
              <Label className="flex w-full max-w-56 pt-2.5">
                Company Information Format
              </Label>

              <div className="grow">
                <Textarea
                  rows={7}
                  value={
                    companyInformationFormat
                  }
                  onChange={(e) =>
                    setCompanyInformationFormat(
                      e.target.value
                    )
                  }
                  placeholder="Company information format"
                />

                <div className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium">
                    Available variables:
                  </span>{' '}
                  <span>
                    {'{company_name}'}
                  </span>
                  ,{' '}
                  <span>
                    {'{address}'}
                  </span>
                  ,{' '}
                  <span>
                    {'{city}'}
                  </span>
                  ,{' '}
                  <span>
                    {'{state}'}
                  </span>
                  ,{' '}
                  <span>
                    {'{zip_code}'}
                  </span>
                  ,{' '}
                  <span>
                    {'{country_code}'}
                  </span>
                  ,{' '}
                  <span>
                    {'{phone}'}
                  </span>
                  ,{' '}
                  <span>
                    {'{vat_number}'}
                  </span>
                  ,{' '}
                  <span>
                    {'{vat_number_with_label}'}
                  </span>

                  {customFields.length > 0 &&
                    customFields.map(
                      (field) => (
                        <span
                          key={field.id}
                        >
                          ,{' '}
                          {'{'}
                          {field.slug}
                          {'}'}
                        </span>
                      )
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t pt-5">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="min-w-32"
            >
              {saving ? (
                <>
                  <LoaderCircleIcon className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompanyField({
  label,
  children,
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2.5 lg:flex-nowrap">
      <Label className="flex w-full max-w-56">
        {label}
      </Label>

      <div className="grow">
        {children}
      </div>
    </div>
  );
}

function CustomField({
  field,
  value,
  onChange,
}) {
  const type = field.type || 'input';

  const fieldValue =
    value ??
    (type === 'checkbox'
      ? false
      : type === 'multiselect' ||
        MULTIPLE_FILE_TYPES.includes(type)
        ? []
        : '');

  const options = String(
    field.options || ''
  )
    .split(/[\n,]+/)
    .map((option) => option.trim())
    .filter(Boolean);

  if (FILE_TYPES.includes(type)) {
    return (
      <FileCustomField
        field={field}
        value={fieldValue}
        onChange={onChange}
        options={options}
      />
    );
  }

  if (type === 'checkbox') {
    const selectedValues =
      Array.isArray(fieldValue)
        ? fieldValue
        : fieldValue
          ? String(fieldValue)
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          : [];

    if (options.length > 0) {
      return (
        <CompanyField
          label={
            <FieldLabel field={field} />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {options.map(
              (option, index) => {
                const checked =
                  selectedValues.includes(
                    option
                  );

                const id =
                  `${field.slug}-${index}`;

                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-md border p-3"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      disabled={Boolean(
                        field.disabled
                      )}
                      onCheckedChange={(
                        isChecked
                      ) => {
                        let newValues = [
                          ...selectedValues,
                        ];

                        if (isChecked) {
                          if (
                            !newValues.includes(
                              option
                            )
                          ) {
                            newValues.push(
                              option
                            );
                          }
                        } else {
                          newValues =
                            newValues.filter(
                              (item) =>
                                item !==
                                option
                            );
                        }

                        onChange(
                          field.slug,
                          newValues
                        );
                      }}
                    />

                    <Label
                      htmlFor={id}
                      className="cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                );
              }
            )}
          </div>
        </CompanyField>
      );
    }

    return (
      <CompanyField
        label={
          <FieldLabel field={field} />
        }
      >
        <div className="flex items-center gap-2">
          <Checkbox
            checked={Boolean(
              fieldValue
            )}
            disabled={Boolean(
              field.disabled
            )}
            onCheckedChange={(
              checked
            ) =>
              onChange(
                field.slug,
                Boolean(checked)
              )
            }
          />

          <Label className="cursor-pointer">
            {field.name}
          </Label>
        </div>
      </CompanyField>
    );
  }

  if (type === 'textarea') {
    return (
      <CompanyField
        label={
          <FieldLabel field={field} />
        }
      >
        <Textarea
          rows={5}
          value={String(
            fieldValue
          )}
          disabled={Boolean(
            field.disabled
          )}
          required={Boolean(
            field.required
          )}
          onChange={(e) =>
            onChange(
              field.slug,
              e.target.value
            )
          }
          placeholder={field.name}
        />
      </CompanyField>
    );
  }

  if (type === 'select') {
    return (
      <CompanyField
        label={
          <FieldLabel field={field} />
        }
      >
        <Select
          value={String(
            fieldValue
          )}
          disabled={Boolean(
            field.disabled
          )}
          onValueChange={(selectedValue) =>
            onChange(
              field.slug,
              selectedValue
            )
          }
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                `Select ${field.name}`
              }
            />
          </SelectTrigger>

          <SelectContent>
            {options.map(
              (option, index) => (
                <SelectItem
                  key={`${field.id}-${index}`}
                  value={option}
                >
                  {option}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </CompanyField>
    );
  }

  if (type === 'multiselect') {
    const selectedValues =
      Array.isArray(fieldValue)
        ? fieldValue
        : String(
            fieldValue || ''
          )
            .split(',')
            .map((item) =>
              item.trim()
            )
            .filter(Boolean);

    return (
      <CompanyField
        label={
          <FieldLabel field={field} />
        }
      >
        <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map(
            (option, index) => {
              const checked =
                selectedValues.includes(
                  option
                );

              const id =
                `${field.slug}-${index}`;

              return (
                <div
                  key={id}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    disabled={Boolean(
                      field.disabled
                    )}
                    onCheckedChange={(
                      isChecked
                    ) => {
                      let newValues = [
                        ...selectedValues,
                      ];

                      if (isChecked) {
                        if (
                          !newValues.includes(
                            option
                          )
                        ) {
                          newValues.push(
                            option
                          );
                        }
                      } else {
                        newValues =
                          newValues.filter(
                            (item) =>
                              item !==
                              option
                          );
                      }

                      onChange(
                        field.slug,
                        newValues
                      );
                    }}
                  />

                  <Label
                    htmlFor={id}
                    className="cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              );
            }
          )}
        </div>
      </CompanyField>
    );
  }

  if (type === 'date_picker') {
    return (
      <CompanyField
        label={
          <FieldLabel field={field} />
        }
      >
        <Input
          type="date"
          value={String(
            fieldValue
          )}
          disabled={Boolean(
            field.disabled
          )}
          required={Boolean(
            field.required
          )}
          onChange={(e) =>
            onChange(
              field.slug,
              e.target.value
            )
          }
        />
      </CompanyField>
    );
  }

  if (
    type === 'date_picker_time'
  ) {
    return (
      <CompanyField
        label={
          <FieldLabel field={field} />
        }
      >
        <Input
          type="datetime-local"
          value={String(
            fieldValue
          )}
          disabled={Boolean(
            field.disabled
          )}
          required={Boolean(
            field.required
          )}
          onChange={(e) =>
            onChange(
              field.slug,
              e.target.value
            )
          }
        />
      </CompanyField>
    );
  }

  if (type === 'colorpicker') {
    return (
      <CompanyField
        label={
          <FieldLabel field={field} />
        }
      >
        <div className="flex items-center gap-3">
          <Input
            type="color"
            value={
              fieldValue ||
              '#000000'
            }
            disabled={Boolean(
              field.disabled
            )}
            onChange={(e) =>
              onChange(
                field.slug,
                e.target.value
              )
            }
            className="h-10 w-16 cursor-pointer p-1"
          />

          <Input
            type="text"
            value={String(
              fieldValue
            )}
            disabled={Boolean(
              field.disabled
            )}
            onChange={(e) =>
              onChange(
                field.slug,
                e.target.value
              )
            }
            placeholder="#000000"
          />
        </div>
      </CompanyField>
    );
  }

  if (type === 'link') {
    return (
      <CompanyField
        label={
          <FieldLabel field={field} />
        }
      >
        <div className="space-y-2">
          {fieldValue && (
            <div>
              <a
                href={String(
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

          <Input
            type="url"
            value={String(
              fieldValue
            )}
            disabled={Boolean(
              field.disabled
            )}
            required={Boolean(
              field.required
            )}
            onChange={(e) =>
              onChange(
                field.slug,
                e.target.value
              )
            }
            placeholder="https://example.com"
          />
        </div>
      </CompanyField>
    );
  }

  if (type === 'number') {
    return (
      <CompanyField
        label={
          <FieldLabel field={field} />
        }
      >
        <Input
          type="number"
          value={String(
            fieldValue
          )}
          disabled={Boolean(
            field.disabled
          )}
          required={Boolean(
            field.required
          )}
          onChange={(e) =>
            onChange(
              field.slug,
              e.target.value
            )
          }
          placeholder={field.name}
        />
      </CompanyField>
    );
  }

  return (
    <CompanyField
      label={
        <FieldLabel field={field} />
      }
    >
      <Input
        type="text"
        value={String(
          fieldValue
        )}
        disabled={Boolean(
          field.disabled
        )}
        required={Boolean(
          field.required
        )}
        onChange={(e) =>
          onChange(
            field.slug,
            e.target.value
          )
        }
        placeholder={field.name}
      />
    </CompanyField>
  );
}

function FileCustomField({
  field,
  value,
  onChange,
  options,
}) {
  const type = field.type || 'file';

  const isMultiple =
    MULTIPLE_FILE_TYPES.includes(type);

  const isImage =
    type === 'image' ||
    type === 'multi_image';

  const [previewUrls, setPreviewUrls] =
    useState({});

  const allowedExtensions =
    options
      .map((item) =>
        item
          .trim()
          .toLowerCase()
          .replace(/^\*+\./, '')
          .replace(/^\./, '')
      )
      .filter(Boolean);

  let accept = '';

  if (isImage) {
    accept =
      allowedExtensions.length > 0
        ? allowedExtensions
            .map(
              (extension) =>
                `.${extension}`
            )
            .join(',')
        : 'image/*';
  } else {
    accept =
      allowedExtensions.length > 0
        ? allowedExtensions
            .map(
              (extension) =>
                `.${extension}`
            )
            .join(',')
        : '';
  }

  const valueArray = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

  const existingFiles =
    valueArray.filter(
      (item) =>
        item &&
        !(item instanceof File)
    );

  const newFiles =
    valueArray.filter(
      (item) =>
        typeof File !== 'undefined' &&
        item instanceof File
    );

  useEffect(() => {
    const urls = {};

    newFiles.forEach(
      (file, index) => {
        if (
          isImage &&
          typeof URL !== 'undefined'
        ) {
          urls[index] =
            URL.createObjectURL(file);
        }
      }
    );

    setPreviewUrls(urls);

    return () => {
      Object.values(urls).forEach(
        (url) => {
          if (
            typeof URL !== 'undefined'
          ) {
            URL.revokeObjectURL(url);
          }
        }
      );
    };
  }, [value, isImage]);

  const getFileUrl = (file) => {
    if (!file) {
      return '';
    }

    if (typeof file === 'string') {
      return file;
    }

    return (
      file.url ||
      file.absoluteUrl ||
      file.path ||
      file.fileUrl ||
      file.file_url ||
      file.src ||
      ''
    );
  };

  const getFileName = (file) => {
    if (!file) {
      return '';
    }

    if (typeof file === 'string') {
      return (
        file
          .split('/')
          .pop()
          ?.split('?')[0] ||
        ''
      );
    }

    const url = getFileUrl(file);

    return (
      file.originalName ||
      file.originalname ||
      file.filename ||
      file.fileName ||
      file.name ||
      (url
        ? url
            .split('/')
            .pop()
            ?.split('?')[0]
        : '') ||
      'Attached file'
    );
  };

  const isImageFile = (file) => {
    if (isImage) {
      return true;
    }

    const url = getFileUrl(file);

    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif|ico)(\?.*)?$/i.test(
      url
    );
  };

  const handleFileChange = (event) => {
    const files = Array.from(
      event.target.files || []
    );

    if (isMultiple) {
      const existingItems =
        valueArray.filter(
          (item) =>
            !(
              typeof File !==
                'undefined' &&
              item instanceof File
            )
        );

      onChange(
        field.slug,
        [
          ...existingItems,
          ...files,
        ]
      );
    } else {
      onChange(
        field.slug,
        files[0] || null
      );
    }

    event.target.value = '';
  };

  const removeNewFile = (index) => {
    if (isMultiple) {
      const updatedFiles =
        valueArray.filter(
          (_, fileIndex) =>
            fileIndex !==
            index +
              existingFiles.length
        );

      onChange(
        field.slug,
        updatedFiles
      );

      return;
    }

    onChange(
      field.slug,
      null
    );
  };

  const removeExistingFile = (
    existingIndex
  ) => {
    const updatedFiles =
      valueArray.filter(
        (_, index) =>
          index !== existingIndex
      );

    onChange(
      field.slug,
      isMultiple
        ? updatedFiles
        : null
    );
  };

  const fileLabel =
    isImage
      ? 'Allowed images'
      : type === 'multi_attachment'
        ? 'Allowed attachments'
        : 'Allowed files';

  return (
    <CompanyField
      label={
        <FieldLabel field={field} />
      }
    >
      <div className="space-y-3">
        {existingFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Existing Files
            </p>

            {existingFiles.map(
              (file, index) => {
                const fileUrl =
                  getFileUrl(file);

                const fileName =
                  getFileName(file);

                const imageFile =
                  isImageFile(file);

                return (
                  <div
                    key={`existing-${index}-${fileName}`}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {imageFile ? (
                        <img
                          src={toAbsoluteUrl(
                            fileUrl
                          )}
                          alt={fileName}
                          className="size-14 shrink-0 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <RiCheckboxCircleFill className="size-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Existing Attachment
                        </p>

                        <p className="truncate text-xs text-muted-foreground">
                          {fileName}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {fileUrl && (
                        <a
                          href={toAbsoluteUrl(
                            fileUrl
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary underline underline-offset-4 hover:opacity-80"
                        >
                          View
                        </a>
                      )}

                      {isMultiple && (
                        <button
                          type="button"
                          onClick={() =>
                            removeExistingFile(
                              index
                            )
                          }
                          className="text-sm text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        <Input
          type="file"
          multiple={isMultiple}
          disabled={Boolean(
            field.disabled
          )}
          required={
            Boolean(field.required) &&
            existingFiles.length === 0 &&
            newFiles.length === 0
          }
          accept={accept}
          onChange={
            handleFileChange
          }
        />

        {newFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Selected Files
            </p>

            {newFiles.map(
              (file, index) => {
                const previewUrl =
                  previewUrls[index] ||
                  '';

                return (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {isImage ? (
                        previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={file.name}
                            className="size-14 shrink-0 rounded-md border object-cover"
                          />
                        ) : (
                          <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
                            <RiCheckboxCircleFill className="size-5" />
                          </div>
                        )
                      ) : (
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted">
                          <RiCheckboxCircleFill className="size-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {file.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {(
                            file.size /
                            1024
                          ).toFixed(1)}{' '}
                          KB
                        </p>

                        {file.type && (
                          <p className="truncate text-xs text-muted-foreground">
                            {file.type}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeNewFile(
                          index
                        )
                      }
                      className="shrink-0 text-sm text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}

        {allowedExtensions.length >
          0 && (
          <p className="text-xs text-muted-foreground">
            {fileLabel}:{' '}
            {allowedExtensions
              .map(
                (extension) =>
                  extension.toUpperCase()
              )
              .join(', ')}
          </p>
        )}
      </div>
    </CompanyField>
  );
}

function FieldLabel({ field }) {
  return (
    <span>
      {field.name}

      {field.required && (
        <span className="ml-1 text-destructive">
          *
        </span>
      )}
    </span>
  );
}