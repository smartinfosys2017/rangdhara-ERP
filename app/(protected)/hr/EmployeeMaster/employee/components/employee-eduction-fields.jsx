
"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const EMPTY_EDUCATION = {
  qualification: "",
  specialization: "",
  schoolCollege: "",
  boardUniversity: "",
  passingYear: "",
  percentage: "",
  gradeDivision: "",
};

const parseEducation = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed =
      typeof value === "string" ? JSON.parse(value) : value;

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function EducationInformation({
  value,
  onChange,
  disabled = false,
}) {
  const [educationList, setEducationList] = useState(() =>
    parseEducation(value),
  );

  const [expandedRows, setExpandedRows] = useState([0]);

  useEffect(() => {
    setEducationList(parseEducation(value));
  }, [value]);

  const updateEducation = (index, field, fieldValue) => {
    const updatedList = educationList.map((item, i) =>
      i === index
        ? { ...item, [field]: fieldValue }
        : item,
    );

    setEducationList(updatedList);
    onChange?.(JSON.stringify(updatedList));
  };

  const addEducation = () => {
    const updatedList = [
      ...educationList,
      { ...EMPTY_EDUCATION },
    ];

    setEducationList(updatedList);
    setExpandedRows((prev) => [...prev, updatedList.length - 1]);
    onChange?.(JSON.stringify(updatedList));
  };

  const removeEducation = (index) => {
    const updatedList = educationList.filter(
      (_, i) => i !== index,
    );

    setEducationList(updatedList);
    setExpandedRows((prev) =>
      prev
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i)),
    );

    onChange?.(JSON.stringify(updatedList));
  };

  const toggleRow = (index) => {
    setExpandedRows((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index],
    );
  };

  const inputClass =
    "form-control form-control-sm w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

  const renderInput = (
    index,
    field,
    label,
    placeholder,
    type = "text",
  ) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">
        {label}
      </label>

      <input
        type={type}
        value={educationList[index]?.[field] ?? ""}
        onChange={(e) =>
          updateEducation(index, field, e.target.value)
        }
        disabled={disabled}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );

  return (
    <section className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <GraduationCap className="h-5 w-5 text-primary" />
            Education Information
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Add your educational qualifications and academic details.
          </p>
        </div>

        <button
          type="button"
          onClick={addEducation}
          disabled={disabled}
          className="btn btn-sm btn-primary inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add Education
        </button>
      </div>

      {/* EDUCATION ROWS */}
      {educationList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center">
          <GraduationCap className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />

          <p className="text-sm font-medium text-foreground">
            No education details added
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Click Add Education to add your qualification.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {educationList.map((education, index) => {
            const isExpanded = expandedRows.includes(index);

            return (
              <div
                key={index}
                className="overflow-hidden rounded-lg border border-gray-200 bg-background"
              >
                {/* ROW HEADER */}
                <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-3 dark:bg-gray-900">
                  <button
                    type="button"
                    onClick={() => toggleRow(index)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {education.qualification ||
                          `Education ${index + 1}`}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {education.schoolCollege ||
                          "Add school / college name"}
                      </p>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeEducation(index)}
                    disabled={disabled}
                    title="Remove education"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* ROW FIELDS */}
                {isExpanded && (
                  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {renderInput(
                      index,
                      "qualification",
                      "Qualification",
                      "e.g. Bachelor of Commerce",
                    )}

                    {renderInput(
                      index,
                      "specialization",
                      "Specialization",
                      "e.g. Accounting",
                    )}

                    {renderInput(
                      index,
                      "schoolCollege",
                      "School / College",
                      "Enter school or college name",
                    )}

                    {renderInput(
                      index,
                      "boardUniversity",
                      "Board / University",
                      "Enter board or university name",
                    )}

                    {renderInput(
                      index,
                      "passingYear",
                      "Passing Year",
                      "e.g. 2024",
                      "number",
                    )}

                    {renderInput(
                      index,
                      "percentage",
                      "Percentage",
                      "e.g. 75.50",
                      "number",
                    )}

                    {renderInput(
                      index,
                      "gradeDivision",
                      "Grade / Division",
                      "e.g. First Class / A Grade",
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER */}
      <p className="text-xs text-muted-foreground">
        Total qualifications: {educationList.length}
      </p>
    </section>
  );
}
