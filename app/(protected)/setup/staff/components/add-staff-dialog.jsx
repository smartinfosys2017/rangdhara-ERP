"use client";

import { useEffect, useMemo, useState } from "react";

import {
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Users,
  Upload,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* =========================================================
   DEFAULT FORM
========================================================= */

const DEFAULT_FORM = {
  isAdministrator: false,
  isNotStaff: false,
  isActive: true,

  profileImage: "",

  firstName: "",
  lastName: "",
  email: "",
  phone: "",

  hourlyRate: "0",

  facebook: "",
  linkedin: "",
  skype: "",

  defaultLanguage: "",
  direction: "",
  timezone: "",

  emailSignature: "",

  sendWelcomeEmail: true,

  password: "",
};

/* =========================================================
   LANGUAGES
========================================================= */

const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "dutch", label: "Dutch" },
  { value: "polish", label: "Polish" },
  { value: "russian", label: "Russian" },
  { value: "francais_canada", label: "Francais Canada" },
  { value: "chinese", label: "Chinese" },
  { value: "czech", label: "Czech" },
  { value: "japanese", label: "Japanese" },
  { value: "french", label: "French" },
  { value: "romanian", label: "Romanian" },
  { value: "persian", label: "Persian" },
  { value: "portuguese", label: "Portuguese" },
  { value: "italian", label: "Italian" },
  { value: "turkish", label: "Turkish" },
  { value: "ukrainian", label: "Ukrainian" },
  { value: "norwegian", label: "Norwegian" },
  { value: "greek", label: "Greek" },
  { value: "swedish", label: "Swedish" },
  { value: "portuguese_br", label: "Portuguese Brazil" },
  { value: "catalan", label: "Catalan" },
  { value: "spanish", label: "Spanish" },
  { value: "bulgarian", label: "Bulgarian" },
  { value: "slovak", label: "Slovak" },
  { value: "vietnamese", label: "Vietnamese" },
  { value: "finnish", label: "Finnish" },
  { value: "indonesia", label: "Indonesia" },
  { value: "german", label: "German" },
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeId = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
};

/**
 * Get role ID.
 *
 * Supports:
 * id
 * roleId
 * role_id
 */
const getRoleId = (role) => {
  if (!role) {
    return null;
  }

  return normalizeId(role.id ?? role.roleId ?? role.role_id);
};

/**
 * Get existing role IDs from staff.
 */
const getStaffRoleIds = (staff) => {
  if (!staff) {
    return [];
  }

  const ids = [];

  const addId = (value) => {
    const id = normalizeId(value);

    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  };

  /* Direct role ID */

  addId(staff.roleId);
  addId(staff.role_id);

  /* roleIds */

  if (Array.isArray(staff.roleIds)) {
    staff.roleIds.forEach(addId);
  }

  if (Array.isArray(staff.role_ids)) {
    staff.role_ids.forEach(addId);
  }

  /* roles */

  if (Array.isArray(staff.roles)) {
    staff.roles.forEach((role) => {
      if (typeof role === "string" || typeof role === "number") {
        addId(role);
      } else if (role) {
        addId(role.id);
        addId(role.roleId);
        addId(role.role_id);
      }
    });
  }

  /* staffRoles */

  if (Array.isArray(staff.staffRoles)) {
    staff.staffRoles.forEach((role) => {
      if (typeof role === "string" || typeof role === "number") {
        addId(role);
      } else if (role) {
        addId(role.id);
        addId(role.roleId);
        addId(role.role_id);
      }
    });
  }

  /* staffUserRoles */

  if (Array.isArray(staff.staffUserRoles)) {
    staff.staffUserRoles.forEach((role) => {
      if (typeof role === "string" || typeof role === "number") {
        addId(role);
      } else if (role) {
        addId(role.id);
        addId(role.roleId);
        addId(role.role_id);
      }
    });
  }

  return ids;
};

/**
 * Convert:
 *
 * customers.view_own
 *
 * to:
 *
 * customers
 */
const getPermissionModule = (slug) => {
  if (!slug) {
    return "general";
  }

  const parts = String(slug).split(".");

  if (parts.length > 1) {
    return parts[0];
  }

  return "general";
};

/**
 * Get permission display name.
 */
const getPermissionName = (permission) => {
  if (permission?.name) {
    return permission.name;
  }

  if (!permission?.slug) {
    return "";
  }

  const parts = String(permission.slug).split(".");

  return parts[parts.length - 1]
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Normalize permission slug.
 */
const normalizePermissionSlug = (slug) => {
  return String(slug || "")
    .toLowerCase()
    .trim();
};

/**
 * Format module name.
 */
const formatModuleName = (module) => {
  return String(module || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Convert API permissions into:
 *
 * {
 *   customers: {
 *     "customers.view": true,
 *     "customers.create": true
 *   }
 * }
 */
const buildPermissionsFromRole = (role) => {
  const result = {};

  const rolePermissions = Array.isArray(role?.permissions)
    ? role.permissions
    : [];

  rolePermissions.forEach((permission) => {
    const slug = normalizePermissionSlug(
      permission?.slug ?? permission?.permissionSlug ?? permission?.name,
    );

    if (!slug) {
      return;
    }

    const module = getPermissionModule(slug);

    if (!result[module]) {
      result[module] = {};
    }

    result[module][slug] = true;
  });

  return result;
};

/**
 * Convert staff permissions into our UI format.
 */
const buildPermissionsFromStaff = (staff) => {
  const result = {};

  const existingPermissions =
    staff?.permissions ?? staff?.staffPermissions ?? [];

  /* Object format */

  if (
    existingPermissions &&
    !Array.isArray(existingPermissions) &&
    typeof existingPermissions === "object"
  ) {
    Object.entries(existingPermissions).forEach(([module, values]) => {
      if (!values || typeof values !== "object") {
        return;
      }

      result[module] = {};

      Object.entries(values).forEach(([key, value]) => {
        if (value === true) {
          result[module][key] = true;
        }
      });
    });

    return result;
  }

  /* Array format */

  if (Array.isArray(existingPermissions)) {
    existingPermissions.forEach((permission) => {
      const slug = normalizePermissionSlug(
        permission?.slug ?? permission?.permissionSlug ?? permission?.name,
      );

      if (!slug) {
        return;
      }

      const module = getPermissionModule(slug);

      if (!result[module]) {
        result[module] = {};
      }

      result[module][slug] = true;
    });
  }

  return result;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function AddStaffDialog({
  open,
  onOpenChange,
  staff,
  roles = [],
  onSuccess,
}) {
  const isEdit = Boolean(staff);

  /* =========================================================
     STATE
  ========================================================= */

  const [activeTab, setActiveTab] = useState("profile");

  const [showPassword, setShowPassword] = useState(false);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);

  const [imagePreview, setImagePreview] = useState("");

  const [profileImageFile, setProfileImageFile] = useState(null);

  /* =========================================================
     ROLE STATE
  ========================================================= */

  const [roleList, setRoleList] = useState([]);

  const [rolesLoading, setRolesLoading] = useState(false);

  const [rolesLoaded, setRolesLoaded] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState("");

  const [permissions, setPermissions] = useState({});

  /* =========================================================
     INITIAL ROLE DATA FROM PROP
  ========================================================= */

  const propRoles = useMemo(() => {
    if (!Array.isArray(roles)) {
      return [];
    }

    return roles.filter((role) => role && role.isTrashed !== true);
  }, [roles]);

  /* =========================================================
     MERGED ROLES
  ========================================================= */

  const availableRoles = useMemo(() => {
    if (roleList.length > 0) {
      return roleList;
    }

    return propRoles;
  }, [roleList, propRoles]);

  /* =========================================================
     FETCH ROLES
     IMPORTANT:
     This is declared BEFORE the effect that calls it.
  ========================================================= */

  const fetchRoles = async (roleIdToSelect = "") => {
    if (rolesLoading) {
      return;
    }

    try {
      setRolesLoading(true);

      const response = await fetch(
        "/api/user-management/roles?page=1&limit=1000&sort=createdAt&dir=asc",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Unable to load roles");
      }

      const fetchedRoles = Array.isArray(data?.data)
        ? data.data.filter((role) => role && role.isTrashed !== true)
        : [];

      setRoleList(fetchedRoles);

      setRolesLoaded(true);

      /* =====================================================
         EDIT STAFF
         FIND ROLE AND LOAD ITS PERMISSIONS
      ===================================================== */

      if (roleIdToSelect) {
        const normalizedRoleId = normalizeId(roleIdToSelect);

        const existingRole = fetchedRoles.find(
          (role) => getRoleId(role) === normalizedRoleId,
        );

        if (existingRole) {
          /*
           * Set selected role.
           */
          setSelectedRoleId(normalizedRoleId);

          /*
           * Load permissions from selected role.
           */
          const rolePermissions = buildPermissionsFromRole(existingRole);

          setPermissions(rolePermissions);
        } else {
          console.warn("Existing staff role was not found:", normalizedRoleId);

          /*
           * If role is not found in role API,
           * keep staff permissions as fallback.
           */
          if (staff) {
            setPermissions(buildPermissionsFromStaff(staff));
          }
        }
      }
    } catch (error) {
      console.error("GET ROLES ERROR:", error);

      setRolesLoaded(false);

      alert(error?.message || "Unable to load roles.");
    } finally {
      setRolesLoading(false);
    }
  };

  /* =========================================================
     LOAD FORM
========================================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab("profile");
    setShowPassword(false);
    setProfileImageFile(null);

    if (staff) {
      /* =====================================================
         EDIT STAFF
      ===================================================== */

      setForm({
        isAdministrator: Boolean(staff.isAdministrator),

        isNotStaff: Boolean(staff.isNotStaff),

        isActive: staff.isActive ?? true,

        profileImage: staff.profileImage ?? "",

        firstName: staff.firstName ?? "",

        lastName: staff.lastName ?? "",

        email: staff.email ?? "",

        phone: staff.phone ?? "",

        hourlyRate:
          staff.hourlyRate !== null && staff.hourlyRate !== undefined
            ? String(staff.hourlyRate)
            : "0",

        facebook: staff.facebook ?? "",

        linkedin: staff.linkedin ?? "",

        skype: staff.skype ?? "",

        defaultLanguage: staff.defaultLanguage ?? "",

        direction: staff.direction ?? "",

        timezone: staff.timezone ?? "",

        emailSignature: staff.emailSignature ?? "",

        sendWelcomeEmail: staff.sendWelcomeEmail ?? true,

        password: "",
      });

      setImagePreview(staff.profileImage ?? "");

      /* =====================================================
         GET EXISTING STAFF ROLE ID
      ===================================================== */

      const existingRoleIds = getStaffRoleIds(staff);

      const firstRoleId = existingRoleIds.length > 0 ? existingRoleIds[0] : "";

      setSelectedRoleId(firstRoleId);

      /*
       * Initially use staff permissions.
       *
       * fetchRoles() will replace these with
       * role permissions when the role is found.
       */
      setPermissions(buildPermissionsFromStaff(staff));

      /*
       * Load roles immediately.
       *
       * IMPORTANT:
       * firstRoleId is passed directly.
       * We don't depend on selectedRoleId state
       * because React state updates are asynchronous.
       */
      if (firstRoleId) {
        fetchRoles(firstRoleId);
      } else {
        setRoleList([]);
        setRolesLoaded(false);
      }
    } else {
      /* =====================================================
         ADD STAFF
      ===================================================== */

      setForm({
        ...DEFAULT_FORM,
      });

      setImagePreview("");

      setProfileImageFile(null);

      setSelectedRoleId("");

      setPermissions({});

      setRoleList([]);

      setRolesLoaded(false);
    }
  }, [open, staff]);

  /* =========================================================
     CLEANUP IMAGE
  ========================================================= */

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  /* =========================================================
     TAB CHANGE
  ========================================================= */

  const handleTabChange = (value) => {
    setActiveTab(value);

    if (value === "permissions" && !rolesLoaded) {
      fetchRoles(selectedRoleId);
    }
  };

  /* =========================================================
     SELECTED ROLE
  ========================================================= */

  const selectedRole = useMemo(() => {
    if (!selectedRoleId) {
      return null;
    }

    const normalizedRoleId = normalizeId(selectedRoleId);

    return (
      availableRoles.find((role) => getRoleId(role) === normalizedRoleId) ||
      null
    );
  }, [availableRoles, selectedRoleId]);

  /* =========================================================
     ROLE PERMISSIONS
  ========================================================= */

  const selectedRolePermissions = useMemo(() => {
    if (!selectedRole) {
      return [];
    }

    return Array.isArray(selectedRole.permissions)
      ? selectedRole.permissions
      : [];
  }, [selectedRole]);

  /* =========================================================
     GROUP PERMISSIONS BY MODULE
  ========================================================= */

  const groupedPermissions = useMemo(() => {
    const grouped = {};

    selectedRolePermissions.forEach((permission) => {
      const slug = normalizePermissionSlug(
        permission?.slug ?? permission?.permissionSlug,
      );

      if (!slug) {
        return;
      }

      const module = getPermissionModule(slug);

      if (!grouped[module]) {
        grouped[module] = [];
      }

      grouped[module].push(permission);
    });

    Object.keys(grouped).forEach((module) => {
      grouped[module].sort((a, b) =>
        getPermissionName(a).localeCompare(getPermissionName(b)),
      );
    });

    return grouped;
  }, [selectedRolePermissions]);

  /* =========================================================
     ALL SELECTED PERMISSION COUNT
  ========================================================= */

  const selectedPermissionCount = useMemo(() => {
    return Object.values(permissions).reduce(
      (total, modulePermissions) =>
        total + Object.values(modulePermissions || {}).filter(Boolean).length,
      0,
    );
  }, [permissions]);

  /* =========================================================
     SELECT ROLE
  ========================================================= */

  const handleRoleChange = (roleId) => {
    const normalizedRoleId = normalizeId(roleId);

    setSelectedRoleId(normalizedRoleId || "");

    if (!normalizedRoleId) {
      setPermissions({});
      return;
    }

    const role = availableRoles.find(
      (item) => getRoleId(item) === normalizedRoleId,
    );

    if (!role) {
      console.warn("Selected role not found:", normalizedRoleId);

      setPermissions({});

      return;
    }

    const rolePermissions = buildPermissionsFromRole(role);

    setPermissions(rolePermissions);
  };

  /* =========================================================
     UPDATE PERMISSION
  ========================================================= */

  const updatePermission = (module, slug, checked) => {
    setPermissions((previous) => ({
      ...previous,

      [module]: {
        ...(previous[module] || {}),

        [slug]: Boolean(checked),
      },
    }));
  };

  /* =========================================================
     CHECK / UNCHECK MODULE
  ========================================================= */

  const isModuleFullySelected = (module, modulePermissions) => {
    if (!modulePermissions?.length) {
      return false;
    }

    return modulePermissions.every((permission) => {
      const slug = normalizePermissionSlug(
        permission?.slug ?? permission?.permissionSlug,
      );

      return Boolean(permissions?.[module]?.[slug]);
    });
  };

  const toggleModulePermissions = (module, modulePermissions) => {
    const currentlySelected = isModuleFullySelected(module, modulePermissions);

    const newValue = !currentlySelected;

    setPermissions((previous) => {
      const moduleData = {
        ...(previous[module] || {}),
      };

      modulePermissions.forEach((permission) => {
        const slug = normalizePermissionSlug(
          permission?.slug ?? permission?.permissionSlug,
        );

        if (slug) {
          moduleData[slug] = newValue;
        }
      });

      return {
        ...previous,
        [module]: moduleData,
      };
    });
  };

  /* =========================================================
     UPDATE FORM
  ========================================================= */

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /* =========================================================
     ADMINISTRATOR
  ========================================================= */

  const handleAdministratorChange = (value) => {
    const isAdministrator = Boolean(value);

    updateField("isAdministrator", isAdministrator);

    if (isAdministrator) {
      setSelectedRoleId("");
      setPermissions({});
    }
  };

  /* =========================================================
     IMAGE UPLOAD
  ========================================================= */

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please select a valid JPG, PNG, WEBP or GIF image.");

      event.target.value = "";

      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("Profile image must be less than 5 MB.");

      event.target.value = "";

      return;
    }

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setProfileImageFile(file);

    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  /* =========================================================
     REMOVE IMAGE
  ========================================================= */

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setProfileImageFile(null);

    setImagePreview(staff?.profileImage || "");

    const input = document.getElementById("profileImage");

    if (input) {
      input.value = "";
    }
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async () => {
    /* =====================================================
         VALIDATION
      ===================================================== */

    if (!form.firstName.trim()) {
      setActiveTab("profile");

      alert("First Name is required.");

      return;
    }

    if (!form.lastName.trim()) {
      setActiveTab("profile");

      alert("Last Name is required.");

      return;
    }

    if (!form.email.trim()) {
      setActiveTab("profile");

      alert("Email is required.");

      return;
    }

    if (!isEdit && !form.password.trim()) {
      setActiveTab("profile");

      alert("Password is required.");

      return;
    }

    /* =====================================================
         ROLE VALIDATION
      ===================================================== */

    if (!form.isAdministrator && !selectedRoleId) {
      setActiveTab("permissions");

      if (!rolesLoaded) {
        await fetchRoles();
      }

      alert("Please select a staff role.");

      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      /* ===================================================
           STATUS
        =================================================== */

      formData.append("isActive", String(Boolean(form.isActive)));

      /* ===================================================
           ADMIN
        =================================================== */

      formData.append("isAdministrator", String(Boolean(form.isAdministrator)));

      formData.append("isNotStaff", String(Boolean(form.isNotStaff)));

      /* ===================================================
           BASIC INFORMATION
        =================================================== */

      formData.append("firstName", form.firstName.trim());

      formData.append("lastName", form.lastName.trim());

      formData.append("email", form.email.trim().toLowerCase());

      formData.append("phone", form.phone || "");

      /* ===================================================
           HOURLY RATE
        =================================================== */

      formData.append("hourlyRate", form.hourlyRate || "0");

      /* ===================================================
           SOCIAL
        =================================================== */

      formData.append("facebook", form.facebook || "");

      formData.append("linkedin", form.linkedin || "");

      formData.append("skype", form.skype || "");

      /* ===================================================
           LANGUAGE
        =================================================== */

      formData.append("defaultLanguage", form.defaultLanguage || "");

      formData.append("direction", form.direction || "");

      formData.append("timezone", form.timezone || "");

      /* ===================================================
           EMAIL SIGNATURE
        =================================================== */

      formData.append("emailSignature", form.emailSignature || "");

      /* ===================================================
           WELCOME EMAIL
        =================================================== */

      formData.append(
        "sendWelcomeEmail",
        String(Boolean(form.sendWelcomeEmail)),
      );

      /* ===================================================
           PASSWORD
        =================================================== */

      if (form.password.trim()) {
        formData.append("password", form.password);
      }

      /* ===================================================
           ROLE IDS
        =================================================== */

      const uniqueRoleIds = form.isAdministrator
        ? []
        : selectedRoleId
          ? [normalizeId(selectedRoleId)]
          : [];

      uniqueRoleIds.forEach((roleId) => {
        formData.append("roleIds", roleId);
      });

      formData.append("roleIdsJson", JSON.stringify(uniqueRoleIds));

      /* ===================================================
           PERMISSIONS
        =================================================== */

      formData.append("permissions", JSON.stringify(permissions));

      /* ===================================================
           PROFILE IMAGE
        =================================================== */

      if (profileImageFile) {
        formData.append("profileImage", profileImageFile);
      }

      /* ===================================================
           API
        =================================================== */

      const response = await fetch(
        isEdit ? `/api/staff?id=${staff.id}` : "/api/staff",
        {
          method: isEdit ? "PATCH" : "POST",

          /*
           * Do NOT manually set Content-Type.
           */
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Unable to save staff");
      }

      /* ===================================================
           SUCCESS
        =================================================== */

      onOpenChange(false);

      onSuccess?.(data);
    } catch (error) {
      console.error("STAFF SAVE ERROR:", error);

      alert(error?.message || "Something went wrong while saving staff.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent
        className="
        flex h-[95dvh] max-h-[95dvh] w-[calc(100%-16px)] max-w-[1400px]
        flex-col gap-0 overflow-hidden p-0
        sm:h-[90dvh] sm:max-h-[90dvh] sm:w-[90vw]
        xl:w-[85vw] 2xl:w-[80vw]
      "
      >
        {/* HEADER */}
        <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-5 text-primary" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg">
                {isEdit ? "Edit Staff Member" : "Add Staff Member"}
              </DialogTitle>

              <DialogDescription className="text-xs sm:text-sm">
                {isEdit
                  ? "Update staff profile, status, role and permissions."
                  : "Create a staff member and assign a role."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* TABS */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* METRONIC STYLE TAB NAVIGATION */}
          <div className="shrink-0 overflow-x-auto border-b bg-background px-3 sm:px-6">
            <TabsList
              className="
              flex h-auto w-full min-w-max justify-start
              gap-2 rounded-none bg-transparent p-0
            "
            >
              <TabsTrigger
                value="profile"
                className="
                flex min-w-0 flex-1 items-center justify-center gap-2
                rounded-none border-0 border-b-2 border-transparent
                bg-transparent px-4 py-3
                text-xs font-medium text-muted-foreground
                shadow-none transition-colors
                hover:text-primary
                data-[state=active]:border-primary
                data-[state=active]:bg-transparent
                data-[state=active]:text-primary
                data-[state=active]:shadow-none
                sm:flex-none sm:justify-start sm:px-5 sm:text-sm
              "
              >
                <User className="size-4 shrink-0" />
                <span>Profile</span>
              </TabsTrigger>

              <TabsTrigger
                value="permissions"
                className="
                flex min-w-0 flex-1 items-center justify-center gap-2
                rounded-none border-0 border-b-2 border-transparent
                bg-transparent px-4 py-3
                text-xs font-medium text-muted-foreground
                shadow-none transition-colors
                hover:text-primary
                data-[state=active]:border-primary
                data-[state=active]:bg-transparent
                data-[state=active]:text-primary
                data-[state=active]:shadow-none
                sm:flex-none sm:justify-start sm:px-5 sm:text-sm
              "
              >
                <ShieldCheck className="size-4 shrink-0" />
                <span>Roles & Permissions</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==========================================
            PROFILE TAB
        ========================================== */}
          <TabsContent
            value="profile"
            className="
            mt-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto
            overscroll-contain p-0
            focus-visible:outline-none
          "
          >
            <DialogBody className="min-h-full space-y-6 p-3 sm:p-5 md:p-6">
              {/* ADMIN / STATUS */}
              <div className="rounded-xl border bg-muted/20 p-3 sm:p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={Boolean(form.isAdministrator)}
                      onCheckedChange={handleAdministratorChange}
                    />
                    <span className="text-sm font-medium">Administrator</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={Boolean(form.isNotStaff)}
                      onCheckedChange={(value) =>
                        updateField("isNotStaff", Boolean(value))
                      }
                    />
                    <span className="text-sm">Not Staff Member</span>
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <Label>Status</Label>

                    <Select
                      value={form.isActive ? "active" : "inactive"}
                      onValueChange={(value) =>
                        updateField("isActive", value === "active")
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.isAdministrator && (
                    <Badge variant="secondary" className="w-fit gap-1">
                      <ShieldCheck className="size-3.5" />
                      Full Access
                    </Badge>
                  )}

                  <Badge
                    variant={form.isActive ? "default" : "secondary"}
                    className="w-fit"
                  >
                    {form.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {/* PROFILE IMAGE */}
              <section>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold">Profile Image</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload a profile image for this staff member.
                  </p>
                </div>

                <div className="flex flex-col gap-5 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-muted sm:size-28">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Staff profile"
                        className="size-full object-cover"
                      />
                    ) : (
                      <User className="size-12 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Label htmlFor="profileImage">Choose Image</Label>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label
                        htmlFor="profileImage"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                      >
                        <Upload className="size-4" />
                        Upload Image
                      </label>

                      <Input
                        id="profileImage"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleProfileImageChange}
                      />

                      {profileImageFile && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveImage}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      JPG, PNG, WEBP or GIF. Maximum 5 MB.
                    </p>

                    {profileImageFile && (
                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        Selected: {profileImageFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <Separator />

              {/* BASIC INFORMATION */}
              <section>
                <h3 className="text-sm font-semibold">Basic Information</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Staff member's personal and contact information.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="min-w-0">
                    <Label>
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      placeholder="John"
                      className="mt-2"
                    />
                  </div>

                  <div className="min-w-0">
                    <Label>
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      placeholder="Smith"
                      className="mt-2"
                    />
                  </div>

                  <div className="min-w-0">
                    <Label>
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="john@example.com"
                      className="mt-2"
                      disabled={isEdit}
                    />
                    {isEdit && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Email cannot be changed.
                      </p>
                    )}
                  </div>

                  <div className="min-w-0">
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+1 555 123 4567"
                      className="mt-2"
                    />
                  </div>

                  <div className="min-w-0">
                    <Label>Hourly Rate</Label>
                    <div className="relative mt-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.hourlyRate}
                        onChange={(e) =>
                          updateField("hourlyRate", e.target.value)
                        }
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <Label>Default Language</Label>
                    <Select
                      value={form.defaultLanguage || "system"}
                      onValueChange={(value) =>
                        updateField(
                          "defaultLanguage",
                          value === "system" ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System Default</SelectItem>
                        {LANGUAGES.map((language) => (
                          <SelectItem
                            key={language.value}
                            value={language.value}
                          >
                            {language.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-0">
                    <Label>Direction</Label>
                    <Select
                      value={form.direction || "system"}
                      onValueChange={(value) =>
                        updateField(
                          "direction",
                          value === "system" ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System Default</SelectItem>
                        <SelectItem value="ltr">LTR</SelectItem>
                        <SelectItem value="rtl">RTL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-0">
                    <Label>Timezone</Label>
                    <Input
                      value={form.timezone}
                      onChange={(e) => updateField("timezone", e.target.value)}
                      placeholder="Asia/Kolkata"
                      className="mt-2"
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* SOCIAL PROFILES */}
              <section>
                <h3 className="text-sm font-semibold">Social Profiles</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add social profile links or communication IDs.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["facebook", "Facebook", "Facebook URL"],
                    ["linkedin", "LinkedIn", "LinkedIn URL"],
                    ["skype", "Skype", "Skype ID"],
                  ].map(([field, label, placeholder]) => (
                    <div key={field} className="min-w-0">
                      <Label>{label}</Label>
                      <Input
                        value={form[field]}
                        onChange={(e) => updateField(field, e.target.value)}
                        placeholder={placeholder}
                        className="mt-2"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <Separator />

              {/* EMAIL SIGNATURE */}
              <section>
                <Label>Email Signature</Label>
                <Textarea
                  value={form.emailSignature}
                  onChange={(e) =>
                    updateField("emailSignature", e.target.value)
                  }
                  placeholder="Regards, John Smith"
                  rows={5}
                  className="mt-2"
                />
              </section>

              {/* WELCOME EMAIL */}
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={form.sendWelcomeEmail}
                  onCheckedChange={(value) =>
                    updateField("sendWelcomeEmail", Boolean(value))
                  }
                />
                <span className="text-sm">Send welcome email</span>
              </label>

              <Separator />

              {/* PASSWORD */}
              <section>
                <h3 className="text-sm font-semibold">Password</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isEdit
                    ? "Leave blank to keep the current password."
                    : "Set the login password for this staff member."}
                </p>

                <div className="relative mt-3">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder={
                      isEdit
                        ? "Leave blank to keep current password"
                        : "Enter password"
                    }
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </section>
            </DialogBody>
          </TabsContent>

          {/* ==========================================
            ROLES & PERMISSIONS TAB
        ========================================== */}
          <TabsContent
            value="permissions"
            className="
            mt-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto
            overscroll-contain p-0
            focus-visible:outline-none
          "
          >
            <DialogBody className="min-h-full space-y-6 p-3 sm:p-5 md:p-6">
              {/* KEEP YOUR EXISTING ROLES & PERMISSIONS CONTENT HERE */}
              {/* ROLE DROPDOWN */}

              <div>
                <div className="mb-4">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Users className="size-4" />
                    Staff Role
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Select a role to view and manage its permissions.
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  {rolesLoading ? (
                    <div className="py-8 text-center">
                      <div className="mx-auto size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Loading roles...
                      </p>
                    </div>
                  ) : availableRoles.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <Label>
                          Select Role{" "}
                          <span className="text-destructive">*</span>
                        </Label>

                        <Select
                          value={selectedRoleId || undefined}
                          onValueChange={handleRoleChange}
                          disabled={form.isAdministrator}
                        >
                          <SelectTrigger className="mt-2 w-full">
                            <SelectValue placeholder="Select a staff role" />
                          </SelectTrigger>

                          <SelectContent>
                            {availableRoles.map((role) => {
                              const roleId = getRoleId(role);

                              if (!roleId) {
                                return null;
                              }

                              return (
                                <SelectItem key={roleId} value={roleId}>
                                  <div className="flex items-center gap-2">
                                    <span>{role.name}</span>

                                    {role.isDefault && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px]"
                                      >
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* SELECTED ROLE */}

                      {selectedRole && (
                        <div className="rounded-lg bg-muted/40 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">
                              {selectedRole.name}
                            </span>

                            {selectedRole.isDefault && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Default
                              </Badge>
                            )}

                            {selectedRole.isProtected && (
                              <Badge variant="outline" className="text-[10px]">
                                Protected
                              </Badge>
                            )}
                          </div>

                          {selectedRole.description && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {selectedRole.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="secondary">
                              {selectedRolePermissions.length} available
                              permission
                              {selectedRolePermissions.length === 1 ? "" : "s"}
                            </Badge>

                            <Badge variant="outline">
                              {selectedPermissionCount} selected
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Users className="mx-auto size-8 text-muted-foreground" />

                      <p className="mt-2 text-sm font-medium">
                        No roles available
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Create a role before assigning access to staff.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* PERMISSIONS */}

              <div>
                <div className="mb-4">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <ShieldCheck className="size-4" />
                    Role Permissions
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Permissions are loaded from the selected role. You can
                    enable or disable individual permissions before saving.
                  </p>
                </div>

                {/* ADMIN */}

                {form.isAdministrator ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                    <div className="flex gap-3">
                      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />

                      <div>
                        <h4 className="text-sm font-semibold">
                          Administrator Access
                        </h4>

                        <p className="mt-1 text-xs text-muted-foreground">
                          This staff member is an Administrator. Administrators
                          have full system access regardless of assigned role
                          permissions.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : !selectedRoleId ? (
                  <div className="rounded-xl border bg-muted/20 p-8 text-center">
                    <ShieldCheck className="mx-auto size-8 text-muted-foreground" />

                    <p className="mt-3 text-sm font-medium">Select a role</p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Select a staff role above to view its permissions.
                    </p>
                  </div>
                ) : selectedRolePermissions.length === 0 ? (
                  <div className="rounded-xl border bg-muted/20 p-8 text-center">
                    <ShieldCheck className="mx-auto size-8 text-muted-foreground" />

                    <p className="mt-3 text-sm font-medium">
                      No permissions assigned
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      This role does not have any permissions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(groupedPermissions).map(
                      ([module, modulePermissions]) => {
                        const allSelected = isModuleFullySelected(
                          module,
                          modulePermissions,
                        );

                        return (
                          <div
                            key={module}
                            className="overflow-hidden rounded-xl border bg-card"
                          >
                            {/* MODULE HEADER */}

                            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                              <div>
                                <h4 className="text-sm font-semibold">
                                  {formatModuleName(module)}
                                </h4>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  {modulePermissions.length} permission
                                  {modulePermissions.length === 1 ? "" : "s"}
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  toggleModulePermissions(
                                    module,
                                    modulePermissions,
                                  )
                                }
                              >
                                {allSelected ? "Uncheck All" : "Check All"}
                              </Button>
                            </div>

                            {/* DESKTOP TABLE */}

                            <div className="hidden md:block">
                              <div className="grid grid-cols-[1fr_100px] border-b bg-muted/20">
                                <div className="px-4 py-3">
                                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                                    Permission
                                  </span>
                                </div>

                                <div className="px-4 py-3 text-center">
                                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                                    Access
                                  </span>
                                </div>
                              </div>

                              <div className="divide-y">
                                {modulePermissions.map((permission) => {
                                  const slug = normalizePermissionSlug(
                                    permission?.slug ??
                                      permission?.permissionSlug,
                                  );

                                  const checked = Boolean(
                                    permissions?.[module]?.[slug],
                                  );

                                  return (
                                    <div
                                      key={permission.id || slug}
                                      className="grid grid-cols-[1fr_100px] items-center"
                                    >
                                      <div className="min-w-0 px-4 py-4">
                                        <p className="text-sm font-medium">
                                          {getPermissionName(permission)}
                                        </p>

                                        <p className="mt-1 break-all text-xs text-muted-foreground">
                                          {permission.slug ??
                                            permission.permissionSlug}
                                        </p>
                                      </div>

                                      <div className="flex justify-center px-4 py-4">
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={(value) =>
                                            updatePermission(
                                              module,
                                              slug,
                                              value === true,
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* MOBILE */}

                            <div className="space-y-3 p-3 md:hidden">
                              {modulePermissions.map((permission) => {
                                const slug = normalizePermissionSlug(
                                  permission?.slug ??
                                    permission?.permissionSlug,
                                );

                                const checked = Boolean(
                                  permissions?.[module]?.[slug],
                                );

                                return (
                                  <div
                                    key={permission.id || slug}
                                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium">
                                        {getPermissionName(permission)}
                                      </p>

                                      <p className="mt-1 break-all text-xs text-muted-foreground">
                                        {permission.slug ??
                                          permission.permissionSlug}
                                      </p>
                                    </div>

                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) =>
                                        updatePermission(
                                          module,
                                          slug,
                                          value === true,
                                        )
                                      }
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>

              {/* SUMMARY */}

              {!form.isAdministrator &&
                selectedRoleId &&
                selectedRolePermissions.length > 0 && (
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />

                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold">
                          Permission Summary
                        </h4>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedPermissionCount} permission
                          {selectedPermissionCount === 1 ? "" : "s"} selected
                          from {Object.keys(groupedPermissions).length} module
                          {Object.keys(groupedPermissions).length === 1
                            ? ""
                            : "s"}
                          .
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(permissions).map(
                            ([module, modulePermissions]) => {
                              const count = Object.values(
                                modulePermissions || {},
                              ).filter(Boolean).length;

                              if (count === 0) {
                                return null;
                              }

                              return (
                                <Badge
                                  key={module}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  <CheckCircle2 className="size-3" />
                                  {formatModuleName(module)} ({count})
                                </Badge>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              {/* Start from ROLE SELECTION and keep through PERMISSION SUMMARY */}
            </DialogBody>
          </TabsContent>
        </Tabs>

        {/* FIXED FOOTER */}
        <DialogFooter
          className="
          shrink-0 flex-col-reverse gap-2 border-t bg-background
          px-3 py-3
          sm:flex-row sm:justify-end sm:px-6 sm:py-4
        "
        >
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : isEdit ? "Update Staff" : "Create Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}