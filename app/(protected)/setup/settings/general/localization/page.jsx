'use client';

import { useEffect, useState } from 'react';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import { LoaderCircleIcon } from 'lucide-react';

import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

/*
|--------------------------------------------------------------------------
| Localization Settings Page
|--------------------------------------------------------------------------
*/

export default function LocalizationSettingsPage() {
  /*
  |--------------------------------------------------------------------------
  | Form Field States
  |--------------------------------------------------------------------------
  */

  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState('24');
  const [defaultTimezone, setDefaultTimezone] = useState('UTC');
  const [defaultLanguage, setDefaultLanguage] = useState('en');

  const [enabledLanguages, setEnabledLanguages] = useState(['en']);

  const [disableLanguages, setDisableLanguages] =
    useState(false);

  const [
    outputClientPdfInClientLanguage,
    setOutputClientPdfInClientLanguage,
  ] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | Loading / Saving
  |--------------------------------------------------------------------------
  */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Load Settings
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadLocalizationSettings();
  }, []);

  const loadLocalizationSettings = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        '/api/settings/general/localization',
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      const result = await response.json();

      if (result.success) {
        const data = result.data || {};

        setDateFormat(
          data.date_format || 'YYYY-MM-DD'
        );

        setTimeFormat(
          data.time_format || '24'
        );

        setDefaultTimezone(
          data.default_timezone || 'UTC'
        );

        setDefaultLanguage(
          data.default_language || 'en'
        );

        /*
        |--------------------------------------------------------------------------
        | Enabled Languages
        |--------------------------------------------------------------------------
        */

        if (data.enabled_languages) {
          const langsArray = String(
            data.enabled_languages
          )
            .split(',')
            .map((lang) => lang.trim())
            .filter(Boolean);

          setEnabledLanguages(
            langsArray.length > 0
              ? langsArray
              : ['en']
          );
        } else {
          setEnabledLanguages(['en']);
        }

        /*
        |--------------------------------------------------------------------------
        | Switch Settings
        |--------------------------------------------------------------------------
        */

        setDisableLanguages(
          data.disable_languages === '1' ||
            data.disable_languages === true
        );

        setOutputClientPdfInClientLanguage(
          data.output_client_pdf_in_client_language !==
            '0' &&
            data.output_client_pdf_in_client_language !==
              false
        );
      } else {
        showErrorToast(result.message ||
            'Failed to load localization settings.');        
      }
    } catch (error) {
      console.error(
        'Failed to load localization settings:',
        error
      );
      showErrorToast( 'Unable to load localization settings.');      
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Save Settings
  |--------------------------------------------------------------------------
  */

  const handleSave = async () => {
    try {
      setSaving(true);

      const formData = new FormData();

      /*
      |--------------------------------------------------------------------------
      | Standard Settings
      |--------------------------------------------------------------------------
      */

      formData.append(
        'dateFormat',
        dateFormat
      );

      formData.append(
        'timeFormat',
        timeFormat
      );

      formData.append(
        'defaultTimezone',
        defaultTimezone
      );

      formData.append(
        'defaultLanguage',
        defaultLanguage
      );

      /*
      |--------------------------------------------------------------------------
      | Enabled Languages
      |--------------------------------------------------------------------------
      */

      formData.append(
        'enabledLanguages',
        enabledLanguages.join(', ')
      );

      /*
      |--------------------------------------------------------------------------
      | Switch Settings
      |--------------------------------------------------------------------------
      */

      formData.append(
        'disableLanguages',
        disableLanguages ? '1' : '0'
      );

      formData.append(
        'outputClientPdfInClientLanguage',
        outputClientPdfInClientLanguage
          ? '1'
          : '0'
      );

      /*
      |--------------------------------------------------------------------------
      | API Request
      |--------------------------------------------------------------------------
      */

      const response = await fetch(
        '/api/settings/general/localization',
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            'Failed to save localization settings.'
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Success Toast
      |--------------------------------------------------------------------------
      */
      showSuccessToast(
        'Localization settings saved successfully.'
      );      
      /*
      |--------------------------------------------------------------------------
      | Reload Saved Settings
      |--------------------------------------------------------------------------
      */

      await loadLocalizationSettings();
    } catch (error) {
      console.error(
        'Localization save error:',
        error
      );
      showErrorToast(`Something went wrong while saving settings`);      
    } finally {
      setSaving(false);
    }
  };
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
  | Multi Language Change
  |--------------------------------------------------------------------------
  */

  const toggleLanguage = (language) => {
    setEnabledLanguages((previous) => {
      if (previous.includes(language)) {
        /*
        |--------------------------------------------------------------------------
        | Prevent removing the last language
        |--------------------------------------------------------------------------
        */

        if (previous.length === 1) {
          showErrorToast('At least one language must remain enabled.');          
          return previous;
        }

        return previous.filter(
          (item) => item !== language
        );
      }

      return [...previous, language];
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Loading State
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <Card className="pb-2.5">
        <CardHeader>
          <CardTitle>
            Localization Settings
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex min-h-[180px] items-center justify-center">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-5 animate-spin" />

              <span>
                Loading localization settings...
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Card>
      {/*
      |--------------------------------------------------------------------------
      | Header
      |--------------------------------------------------------------------------
      */}

      <CardHeader id="localization_settings" className="border-b border-border">
        <CardTitle>
          Localization Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="py-12">
      <div className="space-y-6 lg:max-w-[1024px] mx-auto">
        {/*
        |--------------------------------------------------------------------------
        | DATE FORMAT
        |--------------------------------------------------------------------------
        */}

        <SettingsField
          label="Date Format"
          description="Choose how dates should be displayed throughout the application."
        >
          <Select
            value={dateFormat}
            onValueChange={setDateFormat}
            disabled={saving}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select date format" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="YYYY-MM-DD">
                YYYY-MM-DD (e.g. 2026-12-31)
              </SelectItem>

              <SelectItem value="DD-MM-YYYY">
                DD-MM-YYYY (e.g. 31-12-2026)
              </SelectItem>

              <SelectItem value="MM/DD/YYYY">
                MM/DD/YYYY (e.g. 12/31/2026)
              </SelectItem>

              <SelectItem value="DD/MM/YYYY">
                DD/MM/YYYY (e.g. 31/12/2026)
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>

        {/*
        |--------------------------------------------------------------------------
        | TIME FORMAT
        |--------------------------------------------------------------------------
        */}

        <SettingsField
          label="Time Format"
          description="Choose between 12-hour and 24-hour time formats."
        >
          <Select
            value={timeFormat}
            onValueChange={setTimeFormat}
            disabled={saving}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select time format" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="24">
                24-Hour Format (e.g. 14:30)
              </SelectItem>

              <SelectItem value="12">
                12-Hour Format (e.g. 02:30 PM)
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>

        {/*
        |--------------------------------------------------------------------------
        | DEFAULT TIMEZONE
        |--------------------------------------------------------------------------
        */}

        <SettingsField
          label="Default Timezone"
          description="Set the timezone used by default across the application."
        >
          <Select
            value={defaultTimezone}
            onValueChange={setDefaultTimezone}
            disabled={saving}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="UTC">
                UTC (Coordinated Universal Time)
              </SelectItem>

              <SelectItem value="Asia/Kolkata">
                Asia/Kolkata (IST)
              </SelectItem>

              <SelectItem value="America/New_York">
                America/New_York (EST/EDT)
              </SelectItem>

              <SelectItem value="Europe/London">
                Europe/London (GMT/BST)
              </SelectItem>

              <SelectItem value="Asia/Dubai">
                Asia/Dubai (GST)
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>

        {/*
        |--------------------------------------------------------------------------
        | DEFAULT LANGUAGE
        |--------------------------------------------------------------------------
        */}

        <SettingsField
          label="Default Language"
          description="Select the default language for the application."
        >
          <Select
            value={defaultLanguage}
            onValueChange={setDefaultLanguage}
            disabled={saving}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="en">
                English
              </SelectItem>

              <SelectItem value="es">
                Spanish (Español)
              </SelectItem>

              <SelectItem value="fr">
                French (Français)
              </SelectItem>

              <SelectItem value="de">
                German (Deutsch)
              </SelectItem>

              <SelectItem value="hi">
                Hindi (हिन्दी)
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>

        {/*
        |--------------------------------------------------------------------------
        | ENABLED LANGUAGES
        |--------------------------------------------------------------------------
        */}

        <SettingsField
          label="Enabled Languages"
          description="Select the languages that should be available to users."
        >
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <LanguageCheckbox
                label="English"
                value="en"
                checked={enabledLanguages.includes('en')}
                disabled={saving}
                onChange={toggleLanguage}
              />

              <LanguageCheckbox
                label="Spanish (Español)"
                value="es"
                checked={enabledLanguages.includes('es')}
                disabled={saving}
                onChange={toggleLanguage}
              />

              <LanguageCheckbox
                label="French (Français)"
                value="fr"
                checked={enabledLanguages.includes('fr')}
                disabled={saving}
                onChange={toggleLanguage}
              />

              <LanguageCheckbox
                label="German (Deutsch)"
                value="de"
                checked={enabledLanguages.includes('de')}
                disabled={saving}
                onChange={toggleLanguage}
              />

              <LanguageCheckbox
                label="Hindi (हिन्दी)"
                value="hi"
                checked={enabledLanguages.includes('hi')}
                disabled={saving}
                onChange={toggleLanguage}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {enabledLanguages.length}{' '}
              language
              {enabledLanguages.length !== 1
                ? 's'
                : ''}{' '}
              selected.
            </p>
          </div>
        </SettingsField>

        {/*
        |--------------------------------------------------------------------------
        | SETTINGS DIVIDER
        |--------------------------------------------------------------------------
        */}

        <div className="border-t pt-5">
          <h3 className="text-base font-semibold">
            Language Options
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Configure how language settings behave
            across the application.
          </p>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | DISABLE LANGUAGES
        |--------------------------------------------------------------------------
        */}

        <SwitchField
          label="Disable Languages"
          description="Disable language selection and use the default application language."
          checked={disableLanguages}
          disabled={saving}
          onCheckedChange={setDisableLanguages}
        />

        {/*
        |--------------------------------------------------------------------------
        | CLIENT PDF LANGUAGE
        |--------------------------------------------------------------------------
        */}

        <SwitchField
          label="Client PDF Documents Language"
          description="Generate client PDF documents from the admin area using the client's selected language."
          checked={
            outputClientPdfInClientLanguage
          }
          disabled={saving}
          onCheckedChange={
            setOutputClientPdfInClientLanguage
          }
        />

        {/*
        |--------------------------------------------------------------------------
        | SAVE BUTTON
        |--------------------------------------------------------------------------
        */}

        <div className="flex justify-end border-t pt-5">
          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="min-w-[140px]"
          >
            {saving ? (
              <>
                <LoaderCircleIcon className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>
      </CardContent>
    </Card>
  );
}

/*
|--------------------------------------------------------------------------
| Settings Field
|--------------------------------------------------------------------------
*/

function SettingsField({
  label,
  description,
  children,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <div className="space-y-1">
        <Label className="text-sm font-medium">
          {label}
        </Label>

        {description && (
          <p className="text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Switch Field
|--------------------------------------------------------------------------
*/

function SwitchField({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-lg border bg-muted/20 p-4">
      <div className="min-w-0 space-y-1">
        <Label className="text-sm font-medium">
          {label}
        </Label>

        {description && (
          <p className="text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Language Checkbox
|--------------------------------------------------------------------------
*/

function LanguageCheckbox({
  label,
  value,
  checked,
  disabled,
  onChange,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(value)}
      className={`
        flex items-center justify-between
        rounded-lg border px-4 py-3
        text-left transition-colors
        hover:bg-muted/50
        disabled:cursor-not-allowed
        disabled:opacity-60
        ${
          checked
            ? 'border-primary bg-primary/5'
            : 'bg-background'
        }
      `}
    >
      <span className="text-sm font-medium">
        {label}
      </span>

      <span
        className={`
          flex size-5 items-center justify-center
          rounded-full border
          ${
            checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input'
          }
        `}
      >
        {checked && (
          <RiCheckboxCircleFill className="size-4" />
        )}
      </span>
    </button>
  );
}