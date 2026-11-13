
'use client';

import { useEffect, useState } from 'react';

import { formatDateTime } from '@/lib/helpers';
import { apiFetch } from '@/lib/api';

import { Button } from '@/components/ui/button';

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
  if (Array.isArray(value)) return value;

  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) return parsed;

      if (parsed && typeof parsed === 'object') {
        return [parsed];
      }
    } catch {
      // Use comma-separated fallback.
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [value];
}

function getFileUrl(item) {
  if (!item) return '';

  if (typeof item === 'string') return item;

  return item?.url || item?.path || item?.file || '';
}

function getFileName(item) {
  const url = getFileUrl(item);

  if (!url) return '';

  try {
    return decodeURIComponent(
      String(url).split('/').pop()?.split('?')[0] || ''
    );
  } catch {
    return String(url).split('/').pop()?.split('?')[0] || '';
  }
}

function isImageType(type) {
  const normalized = normalizeFieldType(type);

  return normalized === 'image' || normalized === 'multi_image';
}

function isFileType(type) {
  const normalized = normalizeFieldType(type);

  return normalized === 'file' || normalized === 'multi_file';
}

function isMultipleType(type) {
  const normalized = normalizeFieldType(type);

  return normalized === 'multi_file' || normalized === 'multi_image';
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

// =======================================================
// INFO ITEM
// =======================================================

const InfoItem = ({ label, value }) => (
  <div className="space-y-1">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </div>

    <div className="break-words text-sm font-medium text-foreground">
      {formatValue(value)}
    </div>
  </div>
);

// =======================================================
// IMAGE PREVIEW
// =======================================================

const ImagePreview = ({
  item,
  fieldName,
  multiple = false,
}) => {
  const imageUrl = getFileUrl(item);

  if (!imageUrl) return null;

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <img
        src={imageUrl}
        alt={fieldName || 'Image'}
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

const FileLink = ({ item }) => {
  const fileUrl = getFileUrl(item);

  if (!fileUrl) return null;

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
          {getFileName(item) || 'View file'}
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

const MultipleImages = ({ value, fieldName }) => {
  const images = normalizeArray(value);

  if (!images.length) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((item, index) => {
          const imageUrl = getFileUrl(item);

          if (!imageUrl) return null;

          return (
            <div
              key={`${imageUrl}-${index}`}
              className="overflow-hidden rounded-md border"
            >
              <ImagePreview
                item={item}
                fieldName={fieldName}
                multiple
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        {images.map((item, index) => {
          const imageUrl = getFileUrl(item);

          if (!imageUrl) return null;

          return (
            <div
              key={`path-${imageUrl}-${index}`}
              className="break-all text-xs text-muted-foreground"
            >
              {imageUrl}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =======================================================
// MULTIPLE FILE VIEW
// =======================================================

const MultipleFiles = ({ value }) => {
  const files = normalizeArray(value);

  if (!files.length) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="space-y-2">
      {files.map((item, index) => {
        const fileUrl = getFileUrl(item);

        if (!fileUrl) return null;

        return (
          <div
            key={`${fileUrl}-${index}`}
            className="space-y-1"
          >
            <FileLink item={item} />

            <div className="break-all pl-1 text-xs text-muted-foreground">
              {fileUrl}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// =======================================================
// CUSTOM FIELD VALUE
// =======================================================

const CustomFieldValue = ({ field, value }) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">-</span>;
  }

  const type = normalizeFieldType(field?.type);

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (type === 'checkbox') {
    if (value === true || value === 'true' || value === '1') {
      return 'Yes';
    }

    if (value === false || value === 'false' || value === '0') {
      return 'No';
    }
  }

  if (type === 'image') {
    const imageUrl = getFileUrl(value);

    if (!imageUrl) return '-';

    return (
      <div className="space-y-2">
        <ImagePreview item={value} fieldName={field?.name} />

        <div className="break-all text-xs text-muted-foreground">
          {imageUrl}
        </div>
      </div>
    );
  }

  if (type === 'file') {
    const fileUrl = getFileUrl(value);

    if (!fileUrl) return '-';

    return (
      <div className="space-y-2">
        <FileLink item={value} />

        <div className="break-all text-xs text-muted-foreground">
          {fileUrl}
        </div>
      </div>
    );
  }

  if (type === 'multi_image') {
    return (
      <MultipleImages
        value={value}
        fieldName={field?.name}
      />
    );
  }

  if (type === 'multi_file') {
    return <MultipleFiles value={value} />;
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={index} className="break-words">
            {typeof item === 'object' && item !== null
              ? getFileUrl(item) || JSON.stringify(item)
              : String(item)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const objectUrl = getFileUrl(value);

    if (objectUrl) {
      return <div className="break-all">{objectUrl}</div>;
    }

    return (
      <pre className="whitespace-pre-wrap break-words text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return String(value);
};

// =======================================================
// SECTION
// =======================================================

const Section = ({ title, description, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-base font-semibold">{title}</h3>

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

// =======================================================
// ADDRESS HELPER
// =======================================================

const AddressInfo = ({
  address,
  city,
  state,
  country,
  pincode,
}) => {
  const fullAddress = [
    address,
    city,
    state,
    country,
    pincode,
  ]
    .filter(Boolean)
    .join(', ');

  return fullAddress || '-';
};
// =======================================================
// CUSTOM FIELDS VIEW
// =======================================================

const CustomFieldsView = ({ customFields }) => {
  let fields = {};

  try {
    fields =
      typeof customFields === "string"
        ? JSON.parse(customFields || "{}")
        : customFields || {};
  } catch {
    fields = {};
  }

  if (
    !fields ||
    typeof fields !== "object" ||
    Array.isArray(fields) ||
    Object.keys(fields).length === 0
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        No custom fields available.
      </p>
    );
  }

  const formatLabel = (key) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(fields).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {formatLabel(key)}
          </div>

          <div className="break-words text-sm font-medium text-foreground">
            <CustomFieldValue
              field={{ name: key, type: "" }}
              value={value}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
const EducationDetails = ({ value }) => {
  let educationList = [];

  try {
    educationList =
      typeof value === "string"
        ? JSON.parse(value || "[]")
        : Array.isArray(value)
          ? value
          : [];
  } catch {
    educationList = [];
  }

  if (!educationList.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No education details available.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {educationList.map((education, index) => (
        <div
          key={index}
          className="rounded-lg border border-border bg-background p-4"
        >
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              Education {index + 1}
            </h4>

            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {education.passingYear || "-"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              label="Qualification"
              value={education.qualification}
            />

            <InfoItem
              label="Specialization"
              value={education.specialization}
            />

            <InfoItem
              label="School / College"
              value={education.schoolCollege}
            />

            <InfoItem
              label="Board / University"
              value={education.boardUniversity}
            />

            <InfoItem
              label="Passing Year"
              value={education.passingYear}
            />

            <InfoItem
              label="Percentage"
              value={
                education.percentage
                  ? `${education.percentage}%`
                  : "-"
              }
            />

            <InfoItem
              label="Grade / Division"
              value={education.gradeDivision}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// =======================================================
// EMPLOYEE VIEW DIALOG
// =======================================================

const EmployeeViewDialog = ({
  open,
  closeDialog,
  employee,
}) => {
  const [loading, setLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState(employee);

  // =====================================================
  // LOAD COMPLETE EMPLOYEE
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadEmployee = async () => {
      if (!open || !employee?.id) return;

      try {
        setLoading(true);

        const response = await apiFetch(
          `/api/employee?id=${encodeURIComponent(employee.id)}`
        );

        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.message || 'Failed to load employee.'
          );
        }

        if (mounted) {
          setEmployeeData(result.data);
        }
      } catch (error) {
        console.error('Employee VIEW LOAD ERROR:', error);

        if (mounted) {
          setEmployeeData(employee);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (open) {
      setEmployeeData(employee);
      loadEmployee();
    }

    return () => {
      mounted = false;
    };
  }, [open, employee?.id]);

  if (!employeeData) return null;

  // =====================================================
  // CUSTOM FIELDS
  // =====================================================

  const customFields = Array.isArray(employeeData.custom_fields)
    ? employeeData.custom_fields
    : [];

  const customValues =
    employeeData.custom_field_values || {};

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) closeDialog?.();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>

          <DialogDescription>
            View complete employee information.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading employee details...
          </div>
        ) : (
          <div className="space-y-8 py-4">

            {/* ==================================================
                PERSONAL INFORMATION
            ================================================== */}

            <Section
              title="Personal Information"
              description="Basic employee and personal details."
            >
              <InfoItem
                label="Employee Code"
                value={employeeData.empcode}
              />

              <InfoItem
                label="Employee ID"
                value={employeeData.id}
              />

              <InfoItem
                label="First Name"
                value={employeeData.firstName}
              />

              <InfoItem
                label="Middle Name"
                value={employeeData.middleName}
              />

              <InfoItem
                label="Last Name"
                value={employeeData.lastName}
              />

              <InfoItem
                label="Date of Birth"
                value={formatDate(employeeData.dateOfBirth)}
              />

              <InfoItem
                label="Gender"
                value={employeeData.gender}
              />

              <InfoItem
                label="Blood Group"
                value={employeeData.bloodGroup}
              />

              <InfoItem
                label="Marital Status"
                value={employeeData.maritalStatus}
              />

              <InfoItem
                label="Email"
                value={employeeData.emailId}
              />

              <InfoItem
                label="Mobile"
                value={employeeData.mobile}
              />

              <InfoItem
                label="Qualified For Interview"
                value={
                  typeof employeeData.qualifiedForInterview === 'boolean'
                    ? employeeData.qualifiedForInterview
                      ? 'Yes'
                      : 'No'
                    : '-'
                }
              />

              <InfoItem
                label="Status"
                value={employeeData.status}
              />

              <InfoItem
                label="User ID"
                value={employeeData.userId}
              />
            </Section>

            {/* ==================================================
                PROFILE PICTURE AND SIGNATURE
            ================================================== */}

            <Section
              title="Documents & Images"
              description="Employee profile picture and signature."
            >
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Profile Picture
                </div>

                {employeeData.profilePic ? (
                  <div className="space-y-2">
                    <ImagePreview
                      item={employeeData.profilePic}
                      fieldName="Profile Picture"
                    />

                    <div className="break-all text-xs text-muted-foreground">
                      {getFileUrl(employeeData.profilePic)}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Signature
                </div>

                {employeeData.signature ? (
                  <div className="space-y-2">
                    <ImagePreview
                      item={employeeData.signature}
                      fieldName="Signature"
                    />

                    <div className="break-all text-xs text-muted-foreground">
                      {getFileUrl(employeeData.signature)}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
            </Section>

            {/* ==================================================
                CORRESPONDENCE ADDRESS
            ================================================== */}

            <Section
              title="Correspondence Address"
              description="Employee current communication address."
            >
              <div className="md:col-span-2">
                <InfoItem
                  label="Full Address"
                  value={
                    [
                      employeeData.correspondenceAddress,
                      employeeData.correspondenceCity,
                      employeeData.correspondenceState,
                      employeeData.correspondenceCountry,
                      employeeData.correspondencePincode,
                    ]
                      .filter((item) => item?.toString().trim())
                      .join(", ") || "-"
                  }
                />
              </div>

              <InfoItem
                label="Address"
                value={employeeData.correspondenceAddress}
              />

              <InfoItem
                label="City"
                value={employeeData.correspondenceCity}
              />

              <InfoItem
                label="State"
                value={employeeData.correspondenceState}
              />

              <InfoItem
                label="Country"
                value={employeeData.correspondenceCountry}
              />

              <InfoItem
                label="Pincode"
                value={employeeData.correspondencePincode}
              />
            </Section>

            {/* ==================================================
                PERMANENT ADDRESS
            ================================================== */}

            <Section
              title="Permanent Address"
              description="Employee permanent residential address."
            >
              <InfoItem
                label="Same As Correspondence Address"
                value={
                  employeeData.permanentSameAsCorrespondence
                }
              />

              <div className="md:col-span-2">
                <InfoItem
                  label="Full Address"
                  value={
                    [
                      employeeData.permanentAddress,
                      employeeData.permanentCity,
                      employeeData.permanentState,
                      employeeData.permanentCountry,
                      employeeData.permanentPincode,
                    ]
                      .filter((item) => item?.toString().trim())
                      .join(", ") || "-"
                  }
                />
              </div>

              <InfoItem
                label="Address"
                value={employeeData.permanentAddress}
              />

              <InfoItem
                label="City"
                value={employeeData.permanentCity}
              />

              <InfoItem
                label="State"
                value={employeeData.permanentState}
              />

              <InfoItem
                label="Country"
                value={employeeData.permanentCountry}
              />

              <InfoItem
                label="Pincode"
                value={employeeData.permanentPincode}
              />
            </Section>

            {/* ==================================================
                EMPLOYMENT INFORMATION
            ================================================== */}

            <Section
              title="Employment Information"
              description="Employee status and leaving information."
            >
              <InfoItem
                label="Resignation Date"
                value={formatDate(employeeData.resignationDate)}
              />

              <InfoItem
                label="Leaving Date"
                value={formatDate(employeeData.leavingDate)}
              />

              <div className="md:col-span-2">
                <InfoItem
                  label="Reason To Leave"
                  value={employeeData.reasonToLeave}
                />
              </div>
            </Section>

            {/* ==================================================
                EDUCATION DETAILS
            ================================================== */}


            {/* EDUCATION DETAILS */}

            <section className="space-y-4">
              <div>
                <h3 className="text-base font-semibold">
                  Education Details
                </h3>

                <p className="text-sm text-muted-foreground">
                  Employee educational qualifications and academic records.
                </p>
              </div>

              <EducationDetails
                value={employeeData.educationDetails}
              />
            </section>


            {/* ==================================================
                CUSTOM FIELDS
            ================================================== */}

            <section className="space-y-4">
              <div>
                <h3 className="text-base font-semibold">
                  Custom Fields
                </h3>

                <p className="text-sm text-muted-foreground">
                  Additional employee information.
                </p>
              </div>

              <CustomFieldsView
                customFields={employeeData.customFields}
              />
            </section>

            {/* ==================================================
                RECORD INFORMATION
            ================================================== */}

            <Section
              title="Record Information"
              description="Employee record timestamps."
            >
              <InfoItem
                label="Created At"
                value={
                  employeeData.createdAt
                    ? formatDateTime(new Date(employeeData.createdAt))
                    : '-'
                }
              />

              <InfoItem
                label="Updated At"
                value={
                  employeeData.updatedAt
                    ? formatDateTime(new Date(employeeData.updatedAt))
                    : '-'
                }
              />

              <InfoItem
                label="Record Status"
                value={employeeData.isTrashed ? 'Trashed' : 'Active Record'}
              />
            </Section>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeViewDialog;