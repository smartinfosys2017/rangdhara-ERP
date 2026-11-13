'use client';

import { useEffect, useState } from 'react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { toast } from 'sonner';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

/*
|--------------------------------------------------------------------------
| DEFAULT SETTINGS
|--------------------------------------------------------------------------
*/

const defaultSettings = {
  services: '1',
  disable_ticket_public_url: '0',
  staff_access_only_assigned_departments: '1',
  staff_related_ticket_notification_to_assignee_only: '0',
  receive_notification_on_new_ticket: '1',
  receive_notification_on_new_ticket_replies: '1',
  staff_members_open_tickets_to_all_contacts: '1',
  automatically_assign_ticket_to_first_staff_responding: '0',
  access_tickets_to_none_staff_members: '0',
  allow_non_admin_staff_to_delete_ticket_attachments: '0',
  allow_non_admin_members_to_delete_tickets_and_replies: '1',
  allow_non_admin_members_to_edit_ticket_messages: '0',
  allow_customer_to_change_ticket_status: '0',
  only_show_contact_tickets: '1',
  ticket_replies_order: 'desc',
  enable_support_menu_badges: '0',
  default_ticket_reply_status: '3',
  maximum_allowed_ticket_attachments: '4',
  ticket_attachments_file_extensions:
    '.jpg,.jpeg,.png,.pdf,.doc,.zip,.rar',

  email_piping_only_registered: '0',
  email_piping_only_replies: '0',
  ticket_import_reply_only: '0',
  email_piping_default_priority: '2',
};

/*
|--------------------------------------------------------------------------
| TOAST HELPERS
|--------------------------------------------------------------------------
*/

/*
 * SUCCESS TOAST
 */

const showSuccessToast = (
  message = 'Support settings saved successfully.'
) => {
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
 * ERROR TOAST
 */

const showErrorToast = (
  message = 'Something went wrong.'
) => {
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
| RADIO SETTING
|--------------------------------------------------------------------------
*/

function RadioSetting({
  name,
  label,
  value,
  tooltip,
  onChange,
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border py-5 last:border-b-0 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <label
          htmlFor={`${name}-yes`}
          className="form-label mb-1 block font-semibold text-gray-800"
        >
          {label}

          {tooltip && (
            <span
              className="ms-2 cursor-help text-gray-500"
              title={tooltip}
            >
              <i className="ki-outline ki-information-5 fs-6" />
            </span>
          )}
        </label>
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <label
          htmlFor={`${name}-yes`}
          className="form-check form-check-custom form-check-solid flex cursor-pointer items-center gap-2"
        >
          <input
            id={`${name}-yes`}
            className="form-check-input"
            type="radio"
            name={name}
            checked={String(value) === '1'}
            onChange={() => onChange(name, '1')}
          />

          <span className="form-check-label cursor-pointer font-semibold text-gray-700">
            Yes
          </span>
        </label>

        <label
          htmlFor={`${name}-no`}
          className="form-check form-check-custom form-check-solid flex cursor-pointer items-center gap-2"
        >
          <input
            id={`${name}-no`}
            className="form-check-input"
            type="radio"
            name={name}
            checked={String(value) === '0'}
            onChange={() => onChange(name, '0')}
          />

          <span className="form-check-label cursor-pointer font-semibold text-gray-700">
            No
          </span>
        </label>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SELECT SETTING
|--------------------------------------------------------------------------
*/

function SelectSetting({
  name,
  label,
  value,
  options,
  description,
  onChange,
}) {
  return (
    <div className="grid grid-cols-1 gap-5 py-5 md:grid-cols-12">
      <div className="md:col-span-5">
        <label
          htmlFor={name}
          className="form-label mb-1 block font-semibold text-gray-800"
        >
          {label}
        </label>

        {description && (
          <div className="text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </div>

      <div className="md:col-span-7">
        <select
          id={name}
          className="form-select form-select-solid w-full"
          value={value}
          onChange={(event) =>
            onChange(name, event.target.value)
          }
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function SupportSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const [settings, setSettings] = useState(
    defaultSettings
  );

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | LOAD SETTINGS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        '/api/settings/configure-features/support',
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to load support settings.'
        );
      }

      if (data?.settings) {
        setSettings((previous) => ({
          ...previous,
          ...data.settings,
        }));
      }
    } catch (error) {
      console.error(
        'Load support settings error:',
        error
      );

      showErrorToast(
        error?.message ||
          'Unable to load support settings.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UPDATE SETTING
  |--------------------------------------------------------------------------
  */

  const updateSetting = (name, value) => {
    setSettings((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE SETTINGS
  |--------------------------------------------------------------------------
  */

  const handleSave = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        '/api/settings/configure-features/support',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            settings,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message ||
            'Failed to save support settings.'
        );
      }

      /*
      |--------------------------------------------------------------------------
      | SUCCESS TOAST
      |--------------------------------------------------------------------------
      */

      showSuccessToast(
        data?.message ||
          'Support settings saved successfully.'
      );

      /*
      |--------------------------------------------------------------------------
      | RELOAD SETTINGS
      |--------------------------------------------------------------------------
      */

      await loadSettings();
    } catch (error) {
      console.error(
        'Save support settings error:',
        error
      );

      /*
      |--------------------------------------------------------------------------
      | ERROR TOAST
      |--------------------------------------------------------------------------
      */

      showErrorToast(
        error?.message ||
          'Something went wrong while saving support settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="spinner-border spinner-border-sm" />
          <span>Loading support settings...</span>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | FORM URLS
  |--------------------------------------------------------------------------
  */

  const ticketFormUrl = toAbsoluteUrl(
    'forms/ticket'
  );

  const styledTicketFormUrl = toAbsoluteUrl(
    'forms/ticket?styled=1'
  );

  const styledLogoTicketFormUrl = toAbsoluteUrl(
    'forms/ticket?styled=1&with_logo=1'
  );

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    
      <form onSubmit={handleSave}>
        <div className="space-y-6 lg:max-w-[1024px] mx-auto">
        <Card>
          <CardHeader className="border-b border-border">           
              <CardTitle>
                Support Configuration
              </CardTitle>              
            </CardHeader>
          <p className="mt-1 text-sm text-muted-foreground">Configure support tickets, email piping,notifications and ticket forms.</p>
          {/*
          |--------------------------------------------------------------------------
          | HEADER
          |--------------------------------------------------------------------------
          */}         
          
            {/*
            |--------------------------------------------------------------------------
            | TABS
            |--------------------------------------------------------------------------
            */}

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList
                variant="line"
                className="w-full justify-start"
              >
                <TabsTrigger
                  value="general"
                  className="justify-start"
                >
                  <i className="ki-outline ki-setting-2 fs-4 me-2" />
                  General
                </TabsTrigger>

                <TabsTrigger
                  value="piping"
                  className="justify-start"
                >
                  <i className="ki-outline ki-sms fs-4 me-2" />
                  Email Piping
                </TabsTrigger>

                <TabsTrigger
                  value="ticket-form"
                  className="justify-start"
                >
                  <i className="ki-outline ki-document fs-4 me-2" />
                  Ticket Form
                </TabsTrigger>
              </TabsList>
            </Tabs>
          

          {/*
          |--------------------------------------------------------------------------
          | CONTENT
          |--------------------------------------------------------------------------
          */}

          <CardContent className="p-6 md:p-8">
            {/*
            |--------------------------------------------------------------------------
            | GENERAL
            |--------------------------------------------------------------------------
            */}

            {activeTab === 'general' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    General Settings
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure general support and ticket
                    behaviour.
                  </p>
                </div>

                <Card className="border border-border shadow-none">
                  <CardContent className="p-0">
                    <RadioSetting
                      name="services"
                      label="Use services"
                      value={settings.services}
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="disable_ticket_public_url"
                      label="Disable Ticket Public URL"
                      value={
                        settings.disable_ticket_public_url
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="staff_access_only_assigned_departments"
                      label="Allow staff to access only tickets that belong to staff departments"
                      value={
                        settings.staff_access_only_assigned_departments
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="staff_related_ticket_notification_to_assignee_only"
                      label="Send staff-related ticket notifications to the ticket assignee only"
                      value={
                        settings.staff_related_ticket_notification_to_assignee_only
                      }
                      tooltip="If enabled and the ticket has no assignee, notification will be sent to staff belonging to the ticket department."
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="receive_notification_on_new_ticket"
                      label="Receive notification when a new ticket is opened"
                      value={
                        settings.receive_notification_on_new_ticket
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="receive_notification_on_new_ticket_replies"
                      label="Receive notification when customer replies to a ticket"
                      value={
                        settings.receive_notification_on_new_ticket_replies
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="staff_members_open_tickets_to_all_contacts"
                      label="Allow staff members to open tickets to all contacts"
                      value={
                        settings.staff_members_open_tickets_to_all_contacts
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="automatically_assign_ticket_to_first_staff_responding"
                      label="Automatically assign the ticket to the first staff member that posts a reply"
                      value={
                        settings.automatically_assign_ticket_to_first_staff_responding
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="access_tickets_to_none_staff_members"
                      label="Allow access to tickets for non-staff members"
                      value={
                        settings.access_tickets_to_none_staff_members
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="allow_non_admin_staff_to_delete_ticket_attachments"
                      label="Allow non-admin staff members to delete ticket attachments"
                      value={
                        settings.allow_non_admin_staff_to_delete_ticket_attachments
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="allow_non_admin_members_to_delete_tickets_and_replies"
                      label="Allow non-admin staff members to delete tickets and replies"
                      value={
                        settings.allow_non_admin_members_to_delete_tickets_and_replies
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="allow_non_admin_members_to_edit_ticket_messages"
                      label="Allow non-admin staff members to edit ticket messages"
                      value={
                        settings.allow_non_admin_members_to_edit_ticket_messages
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="allow_customer_to_change_ticket_status"
                      label="Allow customer to change ticket status from customers area"
                      value={
                        settings.allow_customer_to_change_ticket_status
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="only_show_contact_tickets"
                      label="In customers area only show tickets related to the logged-in contact"
                      value={
                        settings.only_show_contact_tickets
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="enable_support_menu_badges"
                      label="Enable support menu item badge"
                      value={
                        settings.enable_support_menu_badges
                      }
                      onChange={updateSetting}
                    />
                  </CardContent>
                </Card>

                <div className="border-t border-dashed" />

                <Card className="border border-border shadow-none">
                  <CardContent className="p-6">
                    <SelectSetting
                      name="ticket_replies_order"
                      label="Ticket Replies Order"
                      value={
                        settings.ticket_replies_order
                      }
                      onChange={updateSetting}
                      options={[
                        {
                          value: 'asc',
                          label: 'Ascending',
                        },
                        {
                          value: 'desc',
                          label: 'Descending',
                        },
                      ]}
                      description="The initial ticket message will always be shown first."
                    />

                    <SelectSetting
                      name="default_ticket_reply_status"
                      label="Default status selected when replying to ticket"
                      value={
                        settings.default_ticket_reply_status
                      }
                      onChange={updateSetting}
                      options={[
                        {
                          value: '1',
                          label: 'Open',
                        },
                        {
                          value: '2',
                          label: 'In Progress',
                        },
                        {
                          value: '3',
                          label: 'Answered',
                        },
                        {
                          value: '4',
                          label: 'On Hold',
                        },
                        {
                          value: '5',
                          label: 'Closed',
                        },
                      ]}
                    />

                    <div className="grid grid-cols-1 gap-5 py-5 md:grid-cols-12">
                      <div className="md:col-span-5">
                        <label className="form-label font-semibold text-gray-800">
                          Maximum ticket attachments
                        </label>
                      </div>

                      <div className="md:col-span-7">
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-solid w-full"
                          value={
                            settings.maximum_allowed_ticket_attachments
                          }
                          onChange={(event) =>
                            updateSetting(
                              'maximum_allowed_ticket_attachments',
                              event.target.value
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 py-5 md:grid-cols-12">
                      <div className="md:col-span-5">
                        <label className="form-label font-semibold text-gray-800">
                          Allowed attachment file extensions
                        </label>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Enter extensions separated by
                          commas.
                        </p>
                      </div>

                      <div className="md:col-span-7">
                        <input
                          type="text"
                          className="form-control form-control-solid w-full"
                          value={
                            settings.ticket_attachments_file_extensions
                          }
                          onChange={(event) =>
                            updateSetting(
                              'ticket_attachments_file_extensions',
                              event.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | EMAIL PIPING
            |--------------------------------------------------------------------------
            */}

            {activeTab === 'piping' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Email Piping
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure how incoming emails are converted
                    into support tickets and replies.
                  </p>
                </div>

                <div className="notice d-flex rounded border border-dashed border-primary bg-light-primary p-6">
                  <i className="ki-outline ki-information-5 fs-2tx me-4 text-primary" />

                  <div>
                    <div className="mb-1 font-bold text-gray-900">
                      cPanel forwarder path
                    </div>

                    <code className="break-all text-gray-700">
                      /var/www/html/admin/perfex/pipe.php
                    </code>
                  </div>
                </div>

                <Card className="border border-border shadow-none">
                  <CardContent className="p-0">
                    <RadioSetting
                      name="email_piping_only_registered"
                      label="Pipe Only on Registered Users"
                      value={
                        settings.email_piping_only_registered
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="email_piping_only_replies"
                      label="Only Replies Allowed by Email"
                      value={
                        settings.email_piping_only_replies
                      }
                      onChange={updateSetting}
                    />

                    <RadioSetting
                      name="ticket_import_reply_only"
                      label="Try to import only the actual ticket reply"
                      value={
                        settings.ticket_import_reply_only
                      }
                      tooltip="Quoted and forwarded messages will not be imported."
                      onChange={updateSetting}
                    />
                  </CardContent>
                </Card>

                <div className="border-t border-dashed" />

                <Card className="border border-border shadow-none">
                  <CardContent className="p-6">
                    <SelectSetting
                      name="email_piping_default_priority"
                      label="Default priority on piped ticket"
                      value={
                        settings.email_piping_default_priority
                      }
                      onChange={updateSetting}
                      options={[
                        {
                          value: '',
                          label: 'Nothing selected',
                        },
                        {
                          value: '1',
                          label: 'Low',
                        },
                        {
                          value: '2',
                          label: 'Medium',
                        },
                        {
                          value: '3',
                          label: 'High',
                        },
                      ]}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | TICKET FORM
            |--------------------------------------------------------------------------
            */}

            {activeTab === 'ticket-form' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Ticket Form
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Use these links and embed options to display
                    the support ticket form on your website.
                  </p>
                </div>

                <Card className="border border-primary/30 bg-light-primary shadow-none">
                  <CardContent className="p-6">
                    <h4 className="mb-6 font-bold text-gray-900">
                      Form Information
                    </h4>

                    <div className="mb-6">
                      <div className="mb-2 font-semibold text-gray-700">
                        Form URL
                      </div>

                      <a
                        href={ticketFormUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all font-semibold text-primary hover:text-primary"
                      >
                        {ticketFormUrl}

                        <i className="ki-outline ki-arrow-up-right fs-5 ms-1" />
                      </a>
                    </div>

                    <div>
                      <div className="mb-2 font-semibold text-gray-700">
                        Form file location
                      </div>

                      <code className="break-all text-gray-700">
                        /var/www/html/admin/perfex/application/views/forms/ticket.php
                      </code>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Embed Form
                    </CardTitle>

                    <p className="text-sm text-muted-foreground">
                      Copy and paste the following code anywhere
                      on your website to display the ticket form.
                    </p>
                  </CardHeader>

                  <CardContent>
                    <textarea
                      className="form-control form-control-solid min-h-[130px] w-full font-monospace"
                      rows="4"
                      readOnly
                      value={`<iframe width="600" height="850" src="${ticketFormUrl}" frameborder="0" allowfullscreen></iframe>`}
                      onFocus={(event) =>
                        event.target.select()
                      }
                    />
                  </CardContent>
                </Card>

                <Card className="border border-border shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Share Direct Link
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    <a
                      href={styledTicketFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:text-primary"
                    >
                      {styledTicketFormUrl}

                      <i className="ki-outline ki-arrow-up-right fs-5 ms-1" />
                    </a>

                    <a
                      href={styledLogoTicketFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:text-primary"
                    >
                      {styledLogoTicketFormUrl}

                      <i className="ki-outline ki-arrow-up-right fs-5 ms-1" />
                    </a>
                  </CardContent>
                </Card>

                <div className="notice d-flex rounded border border-dashed border-warning bg-light-warning p-6">
                  <i className="ki-outline ki-information-5 fs-2tx me-4 text-warning" />

                  <div>
                    <div className="mb-2 font-bold text-gray-900">
                      Important
                    </div>

                    <div className="text-sm text-gray-700">
                      If your installation uses HTTPS, make sure
                      the iframe also uses HTTPS. For HTTP
                      installations, use an HTTP URL inside the
                      iframe.
                    </div>
                  </div>
                </div>

                <Card className="border border-border shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Change Form Container Column
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    <a
                      href={toAbsoluteUrl(
                        'forms/ticket?col=col-md-8'
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary"
                    >
                      col-md-8

                      <i className="ki-outline ki-arrow-up-right fs-5 ms-1" />
                    </a>

                    <a
                      href={toAbsoluteUrl(
                        'forms/ticket?col=col-md-8+col-md-offset-2'
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary"
                    >
                      col-md-8 + col-md-offset-2

                      <i className="ki-outline ki-arrow-up-right fs-5 ms-1" />
                    </a>

                    <a
                      href={toAbsoluteUrl(
                        'forms/ticket?col=col-md-5'
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary"
                    >
                      col-md-5

                      <i className="ki-outline ki-arrow-up-right fs-5 ms-1" />
                    </a>
                  </CardContent>
                </Card>

                <Card className="border border-border shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Specify Language
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <a
                      href={toAbsoluteUrl(
                        'forms/ticket?language=english'
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary"
                    >
                      English

                      <i className="ki-outline ki-arrow-up-right fs-5 ms-1" />
                    </a>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>

          {/*
          |--------------------------------------------------------------------------
          | FOOTER
          |--------------------------------------------------------------------------
          */}
          <div className="flex justify-end p-10">
                  <Button
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? 'Saving...'
                      : 'Save Settings'}
                  </Button>
          </div>
        
        </Card>
        </div> 
      </form>
  );
}