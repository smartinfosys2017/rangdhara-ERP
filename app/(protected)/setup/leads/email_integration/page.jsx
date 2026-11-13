'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { RiMailSettingsLine } from '@remixicon/react';

import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { Container } from '@/components/common/container';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Checkbox } from '@/components/ui/checkbox';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

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

// =======================================================
// PAGE
// =======================================================

export default function EmailIntegrationPage() {
  // =====================================================
  // GENERAL SETTINGS
  // =====================================================

  const [active, setActive] = useState(false);

  const [imapServer, setImapServer] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [encryption, setEncryption] =
    useState('tls');

  const [folder, setFolder] =
    useState('INBOX');

  const [checkEvery, setCheckEvery] =
    useState('10');

  const [onlyUnseen, setOnlyUnseen] =
    useState(true);

  const [createTask, setCreateTask] =
    useState(true);

  const [deleteAfterImport, setDeleteAfterImport] =
    useState(false);

  const [markPublic, setMarkPublic] =
    useState(false);

  // =====================================================
  // LEAD SETTINGS
  // =====================================================

  const [leadStatus, setLeadStatus] =
    useState('');

  const [leadSource, setLeadSource] =
    useState('');

  const [responsible, setResponsible] =
    useState('');

  // =====================================================
  // NOTIFICATION SETTINGS
  // =====================================================

  const [notifyImported, setNotifyImported] =
    useState(true);

  const [notifyMultiple, setNotifyMultiple] =
    useState(true);

  const [notifyType, setNotifyType] =
    useState('assigned');

  const [notifyRoles, setNotifyRoles] =
    useState([]);

  const [notifyStaff, setNotifyStaff] =
    useState([]);

  // =====================================================
  // OPTIONS
  // =====================================================

  const leadStatuses = [
    {
      id: '1',
      name: 'New',
    },
    {
      id: '2',
      name: 'Contacted',
    },
    {
      id: '3',
      name: 'Qualified',
    },
    {
      id: '4',
      name: 'Converted',
    },
  ];

  const leadSources = [
    {
      id: '2',
      name: 'Facebook',
    },
    {
      id: '1',
      name: 'Google',
    },
  ];

  const staffMembers = [
    {
      id: '1',
      name: 'Rang Dhara',
    },
  ];

  const roles = [
    {
      id: '1',
      name: 'Employee',
    },
    {
      id: '2',
      name: 'EmpShift',
    },
  ];

  // =====================================================
  // SAVE
  // =====================================================

  const handleSave = (event) => {
    event.preventDefault();

    if (!imapServer.trim()) {
      toast.error('IMAP Server is required.');
      return;
    }

    if (!email.trim()) {
      toast.error('Email address is required.');
      return;
    }

    if (!password.trim()) {
      toast.error('Password is required.');
      return;
    }

    if (!folder) {
      toast.error('Folder is required.');
      return;
    }

    if (!checkEvery || Number(checkEvery) < 10) {
      toast.error(
        'Check Every must be at least 10 minutes.'
      );
      return;
    }

    toast.success(
      'Email integration settings saved successfully.'
    );
  };

  // =====================================================
  // TEST CONNECTION
  // =====================================================

  const handleTestConnection = () => {
    if (
      !imapServer.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      toast.error(
        'Please enter IMAP server, email and password first.'
      );

      return;
    }

    toast.success(
      'IMAP connection test initiated.'
    );
  };

  // =====================================================
  // TOGGLE ARRAY VALUE
  // =====================================================

  const toggleArrayValue = (
    value,
    currentValues,
    setValues
  ) => {
    if (currentValues.includes(value)) {
      setValues(
        currentValues.filter(
          (item) => item !== value
        )
      );
    } else {
      setValues([
        ...currentValues,
        value,
      ]);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
    <Container>
            <Toolbar>
              <ToolbarHeading>
                <ToolbarTitle>
                  <div className="mb-6 flex flex-col gap-3 md:flex-row">
                    <RiMailSettingsLine className="size-6" />
                      <h1 className="text-xl font-semibold">
                        Email Integration
                      </h1>
                  </div>
                </ToolbarTitle>
    
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/">
                        Home
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
    
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        Setup
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
    
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        Lead
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
    
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        Email Integration
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </ToolbarHeading>
    
              <ToolbarActions />
            </Toolbar>
          </Container>
    
    <Container  >
    <div className="space-y-6  mx-auto">
      <form onSubmit={handleSave}>
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>

            <p className="mt-1 text-sm text-muted-foreground">
              Configure IMAP integration to automatically
              import leads from your email inbox.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={!imapServer || !email || !password}
            >
              Test IMAP Connection
            </Button>

            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </div>

        {/* =================================================
            STATUS
        ================================================= */}

        <Card className="mb-5">
          <CardContent className="py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">
                  Email Integration
                </h3>

                <p className="text-sm text-muted-foreground">
                  Enable or disable automatic lead
                  email integration.
                </p>
              </div>

              <Checkbox
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
          </CardContent>
        </Card>

        {/* =================================================
            MAIN SETTINGS
        ================================================= */}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* =================================================
              IMAP SETTINGS
          ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle>
                IMAP Settings
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Configure your incoming mail server.
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* IMAP SERVER */}

              <div className="space-y-2">
                <Label htmlFor="imap-server">
                  IMAP Server
                  <span className="ms-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  id="imap-server"
                  value={imapServer}
                  onChange={(event) =>
                    setImapServer(
                      event.target.value
                    )
                  }
                  placeholder="imap.example.com"
                />
              </div>

              {/* EMAIL */}

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address (Login)
                  <span className="ms-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="email@example.com"
                />
              </div>

              {/* PASSWORD */}

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password
                  <span className="ms-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter password"
                  autoComplete="new-password"
                />
              </div>

              {/* ENCRYPTION */}

              <div className="space-y-3">
                <Label>
                  Encryption
                </Label>

                <RadioGroup
                  value={encryption}
                  onValueChange={setEncryption}
                  className="flex flex-wrap gap-5"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="tls"
                      id="tls"
                    />

                    <Label htmlFor="tls">
                      TLS
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="ssl"
                      id="ssl"
                    />

                    <Label htmlFor="ssl">
                      SSL
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value=""
                      id="no-encryption"
                    />

                    <Label htmlFor="no-encryption">
                      No Encryption
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* FOLDER */}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Folder
                    <span className="ms-1 text-destructive">
                      *
                    </span>
                  </Label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toast.success(
                        'Folders retrieved successfully.'
                      )
                    }
                  >
                    ↻ Retrieve Folders
                  </Button>
                </div>

                <Select
                  value={folder}
                  onValueChange={setFolder}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="INBOX">
                      INBOX
                    </SelectItem>

                    <SelectItem value="Leads">
                      Leads
                    </SelectItem>

                    <SelectItem value="Inbox/Leads">
                      Inbox/Leads
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CHECK EVERY */}

              <div className="space-y-2">
                <Label htmlFor="check-every">
                  Check Every (minutes)
                  <span className="ms-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  id="check-every"
                  type="number"
                  min="10"
                  value={checkEvery}
                  onChange={(event) =>
                    setCheckEvery(
                      event.target.value
                    )
                  }
                />

                <p className="text-xs text-muted-foreground">
                  Minimum interval is 10 minutes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* =================================================
              LEAD SETTINGS
          ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle>
                Lead Settings
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Configure how imported emails should
                become leads.
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* STATUS */}

              <div className="space-y-2">
                <Label>
                  Default Status
                  <span className="ms-1 text-destructive">
                    *
                  </span>
                </Label>

                <Select
                  value={leadStatus}
                  onValueChange={setLeadStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nothing selected" />
                  </SelectTrigger>

                  <SelectContent>
                    {leadStatuses.map(
                      (status) => (
                        <SelectItem
                          key={status.id}
                          value={status.id}
                        >
                          {status.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* SOURCE */}

              <div className="space-y-2">
                <Label>
                  Default Source
                  <span className="ms-1 text-destructive">
                    *
                  </span>
                </Label>

                <div className="flex gap-2">
                  <Select
                    value={leadSource}
                    onValueChange={setLeadSource}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Nothing selected" />
                    </SelectTrigger>

                    <SelectContent>
                      {leadSources.map(
                        (source) => (
                          <SelectItem
                            key={source.id}
                            value={source.id}
                          >
                            {source.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      toast.success(
                        'Add source'
                      )
                    }
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* RESPONSIBLE */}

              <div className="space-y-2">
                <Label>
                  Responsible for New Lead
                  <span className="ms-1 text-destructive">
                    *
                  </span>
                </Label>

                <Select
                  value={responsible}
                  onValueChange={setResponsible}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nothing selected" />
                  </SelectTrigger>

                  <SelectContent>
                    {staffMembers.map(
                      (staff) => (
                        <SelectItem
                          key={staff.id}
                          value={staff.id}
                        >
                          {staff.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* IMPORT OPTIONS */}

              <div className="rounded-lg border p-4">
                <h4 className="mb-4 font-medium">
                  Import Options
                </h4>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={onlyUnseen}
                      onCheckedChange={
                        setOnlyUnseen
                      }
                    />

                    <div>
                      <p className="text-sm font-medium">
                        Only check non-opened emails
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Prevents repeatedly checking
                        already processed emails.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={createTask}
                      onCheckedChange={
                        setCreateTask
                      }
                    />

                    <div>
                      <p className="text-sm font-medium">
                        Create task if sender is already a customer
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Assign the task to the responsible
                        staff member.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={deleteAfterImport}
                      onCheckedChange={
                        setDeleteAfterImport
                      }
                    />

                    <Label>
                      Delete mail after import?
                    </Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={markPublic}
                      onCheckedChange={
                        setMarkPublic
                      }
                    />

                    <Label>
                      Auto mark as public
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>
              Notification Settings
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Configure who should receive notifications
              for imported leads.
            </p>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* NOTIFICATION TOGGLES */}

              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={notifyImported}
                    onCheckedChange={
                      setNotifyImported
                    }
                  />

                  <Label>
                    Notify when lead imported
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={notifyMultiple}
                    onCheckedChange={
                      setNotifyMultiple
                    }
                  />

                  <div>
                    <Label>
                      Notify if lead sends email multiple times
                    </Label>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Receive notification when the same
                      lead sends multiple emails.
                    </p>
                  </div>
                </div>
              </div>

              {/* NOTIFICATION TYPE */}

              <div>
                <Label className="mb-3 block">
                  Notify
                </Label>

                <RadioGroup
                  value={notifyType}
                  onValueChange={setNotifyType}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem
                      value="roles"
                      id="notify-roles"
                    />

                    <Label htmlFor="notify-roles">
                      Staff members with roles
                    </Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <RadioGroupItem
                      value="specific_staff"
                      id="notify-staff"
                    />

                    <Label htmlFor="notify-staff">
                      Specific Staff Members
                    </Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <RadioGroupItem
                      value="assigned"
                      id="notify-assigned"
                    />

                    <Label htmlFor="notify-assigned">
                      Responsible person
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* =================================================
                ROLE NOTIFICATIONS
            ================================================= */}

            {notifyType === 'roles' && (
              <div className="mt-6 rounded-lg border p-5">
                <Label className="mb-3 block">
                  Roles to Notify
                </Label>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center gap-3"
                    >
                      <Checkbox
                        checked={notifyRoles.includes(
                          role.id
                        )}
                        onCheckedChange={() =>
                          toggleArrayValue(
                            role.id,
                            notifyRoles,
                            setNotifyRoles
                          )
                        }
                      />

                      <Label>
                        {role.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =================================================
                STAFF NOTIFICATIONS
            ================================================= */}

            {notifyType === 'specific_staff' && (
              <div className="mt-6 rounded-lg border p-5">
                <Label className="mb-3 block">
                  Staff Members to Notify
                </Label>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {staffMembers.map(
                    (staff) => (
                      <div
                        key={staff.id}
                        className="flex items-center gap-3"
                      >
                        <Checkbox
                          checked={notifyStaff.includes(
                            staff.id
                          )}
                          onCheckedChange={() =>
                            toggleArrayValue(
                              staff.id,
                              notifyStaff,
                              setNotifyStaff
                            )
                          }
                        />

                        <Label>
                          {staff.name}
                        </Label>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              toast.info(
                'Changes discarded.'
              )
            }
          >
            Cancel
          </Button>

          <Button type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
    </Container>
    </>
  );
}