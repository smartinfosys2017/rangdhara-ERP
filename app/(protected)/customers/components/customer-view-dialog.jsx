'use client';

import {
  useEffect,
  useState,
} from 'react';

import { formatDateTime } from '@/lib/helpers';

import {
  apiFetch,
} from '@/lib/api';

import {
  Button,
} from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// =======================================================
// HELPERS
// =======================================================

function normalizeFieldType(type) {
  return String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, '_');
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Try JSON first
    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (
        parsed &&
        typeof parsed === 'object'
      ) {
        return [parsed];
      }
    } catch {
      // Not JSON
    }

    // Comma separated fallback
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [value];
}

function getFileUrl(item) {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  return (
    item?.url ||
    item?.path ||
    item?.file ||
    ''
  );
}

function getFileName(item) {
  const url = getFileUrl(item);

  if (!url) {
    return '';
  }

  try {
    return decodeURIComponent(
      String(url)
        .split('/')
        .pop()
        ?.split('?')[0] || ''
    );
  } catch {
    return (
      String(url)
        .split('/')
        .pop()
        ?.split('?')[0] || ''
    );
  }
}

function isImageUrl(url) {
  if (!url) {
    return false;
  }

  const cleanUrl = String(url)
    .split('?')[0]
    .toLowerCase();

  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(
    cleanUrl
  );
}

function isImageType(type) {
  const normalized = normalizeFieldType(type);

  return (
    normalized === 'image' ||
    normalized === 'multi_image'
  );
}

function isFileType(type) {
  const normalized = normalizeFieldType(type);

  return (
    normalized === 'file' ||
    normalized === 'multi_file'
  );
}

function isMultipleType(type) {
  const normalized = normalizeFieldType(type);

  return (
    normalized === 'multi_file' ||
    normalized === 'multi_image'
  );
}

// =======================================================
// INFO ITEM
// =======================================================

const InfoItem = ({
  label,
  value,
}) => {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="break-words text-sm font-medium text-foreground">
        {value || '-'}
      </div>
    </div>
  );
};

// =======================================================
// IMAGE PREVIEW
// =======================================================

const ImagePreview = ({
  item,
  fieldName,
  multiple = false,
}) => {
  const imageUrl = getFileUrl(item);

  if (!imageUrl) {
    return null;
  }

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <img
        src={imageUrl}
        alt={
          fieldName ||
          'Image'
        }
        className={
          multiple
            ? 'h-24 w-24 rounded-md border object-cover'
            : 'h-32 w-32 rounded-md border object-cover'
        }
      />
    </a>
  );
};

// =======================================================
// FILE LINK
// =======================================================

const FileLink = ({
  item,
}) => {
  const fileUrl = getFileUrl(item);

  if (!fileUrl) {
    return null;
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 items-center gap-3 rounded-md border p-3 transition hover:bg-muted/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h8" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-primary">
          {getFileName(item) ||
            'View file'}
        </div>

        <div className="truncate text-xs text-muted-foreground">
          {fileUrl}
        </div>
      </div>
    </a>
  );
};

// =======================================================
// MULTIPLE IMAGE VIEW
// =======================================================

const MultipleImages = ({
  value,
  fieldName,
}) => {
  const images = normalizeArray(value);

  if (!images.length) {
    return (
      <span className="text-muted-foreground">
        -
      </span>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map(
          (item, index) => {
            const imageUrl =
              getFileUrl(item);

            if (!imageUrl) {
              return null;
            }

            return (
              <div
                key={`${imageUrl}-${index}`}
                className="overflow-hidden rounded-md border"
              >
                <ImagePreview
                  item={item}
                  fieldName={
                    fieldName
                  }
                  multiple
                />
              </div>
            );
          }
        )}
      </div>

      {/* Show paths */}
      <div className="space-y-1">
        {images.map(
          (item, index) => {
            const imageUrl =
              getFileUrl(item);

            if (!imageUrl) {
              return null;
            }

            return (
              <div
                key={`path-${imageUrl}-${index}`}
                className="break-all text-xs text-muted-foreground"
              >
                {imageUrl}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

// =======================================================
// MULTIPLE FILE VIEW
// =======================================================

const MultipleFiles = ({
  value,
}) => {
  const files = normalizeArray(value);

  if (!files.length) {
    return (
      <span className="text-muted-foreground">
        -
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {files.map(
        (item, index) => {
          const fileUrl =
            getFileUrl(item);

          if (!fileUrl) {
            return null;
          }

          return (
            <div
              key={`${fileUrl}-${index}`}
              className="space-y-1"
            >
              <FileLink
                item={item}
              />

              {/* Show actual stored path */}
              <div className="break-all pl-1 text-xs text-muted-foreground">
                {fileUrl}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
};

// =======================================================
// FORMAT CUSTOM FIELD VALUE
// =======================================================

const CustomFieldValue = ({
  field,
  value,
}) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return (
      <span className="text-muted-foreground">
        -
      </span>
    );
  }

  const type =
    normalizeFieldType(
      field?.type
    );

  // =====================================================
  // BOOLEAN
  // =====================================================

  if (
    typeof value === 'boolean'
  ) {
    return value
      ? 'Yes'
      : 'No';
  }

  // =====================================================
  // CHECKBOX STRING VALUES
  // =====================================================

  if (
    type === 'checkbox'
  ) {
    if (
      value === true ||
      value === 'true' ||
      value === '1'
    ) {
      return 'Yes';
    }

    if (
      value === false ||
      value === 'false' ||
      value === '0'
    ) {
      return 'No';
    }
  }

  // =====================================================
  // IMAGE
  // =====================================================

  if (
    type === 'image'
  ) {
    const imageUrl =
      getFileUrl(value);

    if (!imageUrl) {
      return '-';
    }

    return (
      <div className="space-y-2">
        <ImagePreview
          item={value}
          fieldName={
            field?.name
          }
        />

        {/* Show stored path */}
        <div className="break-all text-xs text-muted-foreground">
          {imageUrl}
        </div>
      </div>
    );
  }

  // =====================================================
  // FILE
  // =====================================================

  if (
    type === 'file'
  ) {
    const fileUrl =
      getFileUrl(value);

    if (!fileUrl) {
      return '-';
    }

    return (
      <div className="space-y-2">
        <FileLink
          item={value}
        />

        {/* Show stored path */}
        <div className="break-all text-xs text-muted-foreground">
          {fileUrl}
        </div>
      </div>
    );
  }

  // =====================================================
  // MULTI IMAGE
  //
  // Supports:
  // multi_image
  // multiimage
  // =====================================================

  if (
    type === 'multi_image'
  ) {
    return (
      <MultipleImages
        value={value}
        fieldName={
          field?.name
        }
      />
    );
  }

  // =====================================================
  // MULTI FILE
  //
  // Supports:
  // multi_file
  // multifile
  // =====================================================

  if (
    type === 'multi_file'
  ) {
    return (
      <MultipleFiles
        value={value}
      />
    );
  }

  // =====================================================
  // ARRAY
  // =====================================================

  if (
    Array.isArray(value)
  ) {
    return (
      <div className="space-y-1">
        {value.map(
          (item, index) => {
            if (
              typeof item ===
              'object'
            ) {
              const url =
                getFileUrl(
                  item
                );

              if (url) {
                return (
                  <div
                    key={index}
                    className="break-all"
                  >
                    {url}
                  </div>
                );
              }
            }

            return (
              <div
                key={index}
                className="break-words"
              >
                {String(
                  item
                )}
              </div>
            );
          }
        )}
      </div>
    );
  }

  // =====================================================
  // OBJECT
  // =====================================================

  if (
    typeof value ===
    'object'
  ) {
    const objectUrl =
      getFileUrl(value);

    if (objectUrl) {
      return (
        <div className="break-all">
          {objectUrl}
        </div>
      );
    }

    try {
      return (
        <pre className="whitespace-pre-wrap break-words text-xs">
          {JSON.stringify(
            value,
            null,
            2
          )}
        </pre>
      );
    } catch {
      return '-';
    }
  }

  // =====================================================
  // STRING
  // =====================================================

  return String(value);
};

// =======================================================
// SECTION
// =======================================================

const Section = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {children}
      </div>
    </div>
  );
};

// =======================================================
// CUSTOMER VIEW DIALOG
// =======================================================

const CustomerViewDialog = ({
  open,
  closeDialog,
  customer,
}) => {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    customerData,
    setCustomerData,
  ] = useState(customer);

  // =====================================================
  // LOAD COMPLETE CUSTOMER
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadCustomer =
      async () => {
        if (
          !open ||
          !customer?.id
        ) {
          return;
        }

        try {
          setLoading(true);

          const response =
            await apiFetch(
              `/api/customers?id=${customer.id}`
            );

          const result =
            await response.json();

          if (
            !response.ok ||
            !result?.success
          ) {
            throw new Error(
              result?.message ||
                'Failed to load customer.'
            );
          }

          if (!mounted) {
            return;
          }

          setCustomerData(
            result.data
          );
        } catch (error) {
          console.error(
            'CUSTOMER VIEW LOAD ERROR:',
            error
          );

          if (mounted) {
            setCustomerData(
              customer
            );
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadCustomer();

    return () => {
      mounted = false;
    };
  }, [
    open,
    customer?.id,
  ]);

  if (!customerData) {
    return null;
  }

  const customFields =
    Array.isArray(
      customerData.custom_fields
    )
      ? customerData.custom_fields
      : [];

  const customValues =
    customerData.custom_field_values ||
    {};

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">

        <DialogHeader>
          <DialogTitle>
            Customer Details
          </DialogTitle>

          <DialogDescription>
            View customer information.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading customer details...
          </div>
        ) : (
          <div className="space-y-8 py-4">

            {/* ======================================================
                CUSTOMER INFORMATION
            ====================================================== */}

            <Section
              title="Customer Information"
              description="Basic customer information."
            >
              <InfoItem
                label="Customer ID"
                value={`#${customerData.id}`}
              />

              <InfoItem
                label="Company"
                value={
                  customerData.company
                }
              />

              <InfoItem
                label="VAT Number"
                value={
                  customerData.vatNumber
                }
              />
              <InfoItem
                label="Email"
                value={
                  customerData.email
                }
              />
              <InfoItem
                label="Phone"
                value={
                  customerData.phone
                }
              />

              <InfoItem
                label="Website"
                value={
                  customerData.website
                }
              />

              <InfoItem
                label="Currency"
                value={
                  customerData.defaultCurrency
                }
              />

              <InfoItem
                label="Default Language"
                value={
                  customerData.defaultLanguage
                }
              />

              <InfoItem
                label="Active"
                value={
                  typeof customerData.active ===
                  'boolean'
                    ? customerData.active
                      ? 'Yes'
                      : 'No'
                    : '-'
                }
              />

              <InfoItem
                label="Groups"
                value={
                  Array.isArray(
                    customerData.groups
                  )
                    ? customerData.groups.join(
                        ', '
                      )
                    : customerData.groups
                }
              />
            </Section>

            {/* ======================================================
                CUSTOMER ADDRESS
            ====================================================== */}

            <Section
              title="Customer Address"
              description="Primary customer address."
            >
              <InfoItem
                label="Address"
                value={
                  customerData.address
                }
              />

              <InfoItem
                label="City"
                value={
                  customerData.city
                }
              />

              <InfoItem
                label="State"
                value={
                  customerData.state
                }
              />

              <InfoItem
                label="ZIP"
                value={
                  customerData.zip
                }
              />

              <InfoItem
                label="Country"
                value={
                  customerData.country
                }
              />
            </Section>

            {/* ======================================================
                BILLING ADDRESS
            ====================================================== */}

            <Section
              title="Billing Address"
              description="Customer billing address."
            >
              <InfoItem
                label="Billing Street"
                value={
                  customerData.billingStreet
                }
              />

              <InfoItem
                label="Billing City"
                value={
                  customerData.billingCity
                }
              />

              <InfoItem
                label="Billing State"
                value={
                  customerData.billingState
                }
              />

              <InfoItem
                label="Billing ZIP"
                value={
                  customerData.billingZip
                }
              />

              <InfoItem
                label="Billing Country"
                value={
                  customerData.billingCountry
                }
              />
            </Section>

            {/* ======================================================
                SHIPPING ADDRESS
            ====================================================== */}

            <Section
              title="Shipping Address"
              description="Customer shipping address."
            >
              <InfoItem
                label="Shipping Street"
                value={
                  customerData.shippingStreet
                }
              />

              <InfoItem
                label="Shipping City"
                value={
                  customerData.shippingCity
                }
              />

              <InfoItem
                label="Shipping State"
                value={
                  customerData.shippingState
                }
              />

              <InfoItem
                label="Shipping ZIP"
                value={
                  customerData.shippingZip
                }
              />

              <InfoItem
                label="Shipping Country"
                value={
                  customerData.shippingCountry
                }
              />
            </Section>

            {/* ======================================================
                CUSTOM FIELDS
            ====================================================== */}

            {customFields.length > 0 && (
              <Section
                title="Custom Fields"
                description="Additional customer information."
              >
                {customFields.map(
                  (field) => {
                    const value =
                      customValues?.[
                        field.slug
                      ];

                    const fieldType =
                      normalizeFieldType(
                        field?.type
                      );

                    const fullWidth =
                      fieldType ===
                        'textarea' ||
                      isFileType(
                        fieldType
                      ) ||
                      isImageType(
                        fieldType
                      ) ||
                      isMultipleType(
                        fieldType
                      );

                    return (
                      <div
                        key={
                          field.id
                        }
                        className={
                          fullWidth
                            ? 'md:col-span-2'
                            : ''
                        }
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {field.name}
                          </div>

                          <div className="text-sm font-medium text-foreground">
                            <CustomFieldValue
                              field={
                                field
                              }
                              value={
                                value
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </Section>
            )}

            {/* ======================================================
                RECORD INFORMATION
            ====================================================== */}

            <Section
              title="Record Information"
              description="Customer record timestamps."
            >
              <InfoItem
                label="Created At"
                value={
                  customerData.createdAt
                    ? formatDateTime(
                        new Date(
                          customerData.createdAt
                        )
                      )
                    : '-'
                }
              />

              <InfoItem
                label="Updated At"
                value={
                  customerData.updatedAt
                    ? formatDateTime(
                        new Date(
                          customerData.updatedAt
                        )
                      )
                    : '-'
                }
              />
            </Section>

          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={
              closeDialog
            }
          >
            Close
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};

export default CustomerViewDialog;