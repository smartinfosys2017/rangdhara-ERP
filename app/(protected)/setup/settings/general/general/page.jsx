'use client';

import { useEffect, useRef, useState } from 'react';

import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

import { toAbsoluteUrl } from '@/lib/helpers';

export default function GeneralSettingsPage() {
  /*
   * =========================================================
   * EXISTING FILE URLS
   * =========================================================
   */

  const [companyLogoLightUrl, setCompanyLogoLightUrl] = useState('');
  const [companyLogoDarkUrl, setCompanyLogoDarkUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  /*
   * =========================================================
   * FILE PREVIEWS
   * =========================================================
   */

  const [companyLogoLightPreview, setCompanyLogoLightPreview] =
    useState('');

  const [companyLogoDarkPreview, setCompanyLogoDarkPreview] =
    useState('');

  const [faviconPreview, setFaviconPreview] = useState('');

  /*
   * =========================================================
   * SELECTED FILES
   * =========================================================
   */

  const [companyLogoLight, setCompanyLogoLight] = useState(null);
  const [companyLogoDark, setCompanyLogoDark] = useState(null);
  const [favicon, setFavicon] = useState(null);

  /*
   * =========================================================
   * FILE INPUT REFS
   * =========================================================
   */

  const companyLogoLightRef = useRef(null);
  const companyLogoDarkRef = useRef(null);
  const faviconRef = useRef(null);

  /*
   * =========================================================
   * OTHER SETTINGS
   * =========================================================
   */

  const [rtlAdmin, setRtlAdmin] = useState(false);
  const [rtlCustomer, setRtlCustomer] = useState(false);

  const [allowedFileTypes, setAllowedFileTypes] = useState(
    'jpg, jpeg, png, gif, webp, pdf, doc, docx'
  );

  const [storeDataBackend, setStoreDataBackend] = useState(true);

  /*
   * =========================================================
   * ORIGINAL SETTINGS
   *
   * Used for Reset functionality.
   * =========================================================
   */

  const [originalSettings, setOriginalSettings] = useState({
    rtlAdmin: false,
    rtlCustomer: false,
    allowedFileTypes:
      'jpg, jpeg, png, gif, webp, pdf, doc, docx',
    storeDataBackend: true,
  });

  /*
   * =========================================================
   * STATES
   * =========================================================
   */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /*
   * =========================================================
   * LOAD SETTINGS
   * =========================================================
   */

  useEffect(() => {
    loadGeneralSettings();
  }, []);

  const loadGeneralSettings = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        '/api/settings/general/general',
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load general settings.');
      }

      const result = await response.json();

      if (result.success) {
        const data = result.data || {};

        /*
         * Existing uploaded files
         */
        const lightLogo = data.company_logo_light || '';
        const darkLogo = data.company_logo_dark || '';
        const faviconFile = data.favicon || '';

        setCompanyLogoLightUrl(lightLogo);
        setCompanyLogoDarkUrl(darkLogo);
        setFaviconUrl(faviconFile);

        /*
         * Existing previews
         */
        setCompanyLogoLightPreview(
          lightLogo ? toAbsoluteUrl(lightLogo) : ''
        );

        setCompanyLogoDarkPreview(
          darkLogo ? toAbsoluteUrl(darkLogo) : ''
        );

        setFaviconPreview(
          faviconFile ? toAbsoluteUrl(faviconFile) : ''
        );

        /*
         * Other settings
         */
        const settings = {
          rtlAdmin: data.rtl_admin === '1',
          rtlCustomer: data.rtl_customer === '1',
          allowedFileTypes:
            data.allowed_file_types ||
            'jpg, jpeg, png, gif, webp, pdf, doc, docx',
          storeDataBackend: data.store_data_backend !== '0',
        };

        setRtlAdmin(settings.rtlAdmin);
        setRtlCustomer(settings.rtlCustomer);
        setAllowedFileTypes(settings.allowedFileTypes);
        setStoreDataBackend(settings.storeDataBackend);

        /*
         * Save original values for Reset
         */
        setOriginalSettings(settings);
      }
    } catch (error) {
      console.error(
        'Failed to load general settings:',
        error
      );

      showErrorToast(
        error.message ||
          'Failed to load general settings.'
      );
    } finally {
      setLoading(false);
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
   * =========================================================
   * FILE PREVIEW HELPER
   * =========================================================
   */

  const createFilePreview = (
    file,
    callback
  ) => {
    if (!file) {
      callback('');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      callback(reader.result);
    };

    reader.onerror = () => {
      callback('');
    };

    reader.readAsDataURL(file);
  };

  /*
   * =========================================================
   * COMPANY LOGO LIGHT
   * =========================================================
   */

  const handleCompanyLogoLightChange = (e) => {
    const file = e.target.files?.[0] || null;

    setCompanyLogoLight(file);

    if (file) {
      createFilePreview(
        file,
        setCompanyLogoLightPreview
      );
    }
  };

  const handleCancelCompanyLogoLight = () => {
    setCompanyLogoLight(null);

    setCompanyLogoLightPreview(
      companyLogoLightUrl
        ? toAbsoluteUrl(companyLogoLightUrl)
        : ''
    );

    if (companyLogoLightRef.current) {
      companyLogoLightRef.current.value = '';
    }
  };

  const handleRemoveCompanyLogoLight = () => {
    setCompanyLogoLight(null);
    setCompanyLogoLightUrl('');
    setCompanyLogoLightPreview('');

    if (companyLogoLightRef.current) {
      companyLogoLightRef.current.value = '';
    }
  };

  /*
   * =========================================================
   * COMPANY LOGO DARK
   * =========================================================
   */

  const handleCompanyLogoDarkChange = (e) => {
    const file = e.target.files?.[0] || null;

    setCompanyLogoDark(file);

    if (file) {
      createFilePreview(
        file,
        setCompanyLogoDarkPreview
      );
    }
  };

  const handleCancelCompanyLogoDark = () => {
    setCompanyLogoDark(null);

    setCompanyLogoDarkPreview(
      companyLogoDarkUrl
        ? toAbsoluteUrl(companyLogoDarkUrl)
        : ''
    );

    if (companyLogoDarkRef.current) {
      companyLogoDarkRef.current.value = '';
    }
  };

  const handleRemoveCompanyLogoDark = () => {
    setCompanyLogoDark(null);
    setCompanyLogoDarkUrl('');
    setCompanyLogoDarkPreview('');

    if (companyLogoDarkRef.current) {
      companyLogoDarkRef.current.value = '';
    }
  };

  /*
   * =========================================================
   * FAVICON
   * =========================================================
   */

  const handleFaviconChange = (e) => {
    const file = e.target.files?.[0] || null;

    setFavicon(file);

    if (file) {
      createFilePreview(
        file,
        setFaviconPreview
      );
    }
  };

  const handleCancelFavicon = () => {
    setFavicon(null);

    setFaviconPreview(
      faviconUrl
        ? toAbsoluteUrl(faviconUrl)
        : ''
    );

    if (faviconRef.current) {
      faviconRef.current.value = '';
    }
  };

  const handleRemoveFavicon = () => {
    setFavicon(null);
    setFaviconUrl('');
    setFaviconPreview('');

    if (faviconRef.current) {
      faviconRef.current.value = '';
    }
  };

  /*
   * =========================================================
   * RESET FORM
   * =========================================================
   */

  const handleReset = () => {
    setRtlAdmin(originalSettings.rtlAdmin);
    setRtlCustomer(originalSettings.rtlCustomer);

    setAllowedFileTypes(
      originalSettings.allowedFileTypes
    );

    setStoreDataBackend(
      originalSettings.storeDataBackend
    );

    /*
     * Reset selected files
     */
    setCompanyLogoLight(null);
    setCompanyLogoDark(null);
    setFavicon(null);

    /*
     * Restore existing previews
     */
    setCompanyLogoLightPreview(
      companyLogoLightUrl
        ? toAbsoluteUrl(companyLogoLightUrl)
        : ''
    );

    setCompanyLogoDarkPreview(
      companyLogoDarkUrl
        ? toAbsoluteUrl(companyLogoDarkUrl)
        : ''
    );

    setFaviconPreview(
      faviconUrl
        ? toAbsoluteUrl(faviconUrl)
        : ''
    );

    /*
     * Clear file inputs
     */
    if (companyLogoLightRef.current) {
      companyLogoLightRef.current.value = '';
    }

    if (companyLogoDarkRef.current) {
      companyLogoDarkRef.current.value = '';
    }

    if (faviconRef.current) {
      faviconRef.current.value = '';
    }
  };
  const createSettingsNotification = async () => {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        module: "general_settings",
        action: "updated",
        title: "General Settings Updated",
        message: "General application settings have been updated.",
        entityType: "settings",
        entityName: "General Settings",
        url: "/setup/general",
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result?.message ||
          result?.error ||
          "Failed to create notification."
      );
    }

    // Update notification bell/count immediately
    window.dispatchEvent(
      new CustomEvent("notifications-refresh")
    );

    // Notify online notification listener
    window.dispatchEvent(
      new CustomEvent("notifications-received", {
        detail: result.notification || null,
      })
    );
  } catch (error) {
    console.error(
      "[GENERAL SETTINGS NOTIFICATION ERROR]",
      error
    );
  }
};
  /*
   * =========================================================
   * SAVE SETTINGS
   * =========================================================
   */

  const handleSave = async () => {
    try {
      setSaving(true);

      const formData = new FormData();

      /*
       * Files
       */
      if (companyLogoLight instanceof File) {
        formData.append(
          'companyLogoLight',
          companyLogoLight
        );
      }

      if (companyLogoDark instanceof File) {
        formData.append(
          'companyLogoDark',
          companyLogoDark
        );
      }

      if (favicon instanceof File) {
        formData.append(
          'favicon',
          favicon
        );
      }

      /*
       * File removal flags
       */
      if (
        !companyLogoLight &&
        !companyLogoLightPreview &&
        companyLogoLightUrl
      ) {
        formData.append(
          'removeCompanyLogoLight',
          '1'
        );
      }

      if (
        !companyLogoDark &&
        !companyLogoDarkPreview &&
        companyLogoDarkUrl
      ) {
        formData.append(
          'removeCompanyLogoDark',
          '1'
        );
      }

      if (
        !favicon &&
        !faviconPreview &&
        faviconUrl
      ) {
        formData.append(
          'removeFavicon',
          '1'
        );
      }

      /*
       * Normal settings
       */
      formData.append(
        'rtlAdmin',
        rtlAdmin ? '1' : '0'
      );

      formData.append(
        'rtlCustomer',
        rtlCustomer ? '1' : '0'
      );

      formData.append(
        'allowedFileTypes',
        allowedFileTypes
      );

      formData.append(
        'storeDataBackend',
        storeDataBackend ? '1' : '0'
      );

      /*
       * API request
       */
      const response = await fetch(
        '/api/settings/general/general',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(
          'Failed to save general settings.'
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.message ||
            'Failed to save general settings.'
        );
      }

      /*
       * Reload database values
       */
      await loadGeneralSettings();

      // Create notification only after successful save
      await createSettingsNotification();
      /*
       * Clear selected files
       */
      setCompanyLogoLight(null);
      setCompanyLogoDark(null);
      setFavicon(null);

      if (companyLogoLightRef.current) {
        companyLogoLightRef.current.value = '';
      }

      if (companyLogoDarkRef.current) {
        companyLogoDarkRef.current.value = '';
      }

      if (faviconRef.current) {
        faviconRef.current.value = '';
      }

      showSuccessToast(
        'General settings saved successfully'
      );
    } catch (error) {
      console.error(
        'Save error:',
        error
      );

      showErrorToast(
        error.message ||
          'Something went wrong while saving settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>
            General Settings
          </CardTitle>
        </CardHeader>

        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Loading general settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>
          General Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="py-12">
        <div className="space-y-6 lg:max-w-[600px] mx-auto">

          {/* =================================================
              COMPANY LOGO DARK
          ================================================= */}

          <div className="flex flex-col gap-2.5">
            <Label>
              Company Logo Dark
            </Label>

            <div className="flex items-center gap-5">
              <div className="relative size-32 border rounded-lg overflow-hidden shrink-0">
                <img
                  src={
                    companyLogoDarkPreview ||
                    '/media/ui/empty-image.svg'
                  }
                  alt="Company Logo Dark"
                  className="object-contain size-full p-2"
                />
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      companyLogoDarkRef.current?.click()
                    }
                  >
                    Attach Image
                  </Button>

                  {companyLogoDark && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={
                        handleCancelCompanyLogoDark
                      }
                    >
                      Cancel
                    </Button>
                  )}

                  {!companyLogoDark &&
                    companyLogoDarkUrl &&
                    companyLogoDarkPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={
                          handleRemoveCompanyLogoDark
                        }
                      >
                        Remove
                      </Button>
                    )}
                </div>

                <input
                  ref={companyLogoDarkRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={
                    handleCompanyLogoDarkChange
                  }
                />

                {companyLogoDark && (
                  <p className="text-sm text-muted-foreground">
                    {companyLogoDark.name}
                  </p>
                )}

                <p className="text-sm text-muted-foreground">
                  PNG, JPEG, WEBP or SVG.
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              COMPANY LOGO LIGHT
          ================================================= */}

          <div className="flex flex-col gap-2.5">
            <Label>
              Company Logo Light
            </Label>

            <div className="flex items-center gap-5">
              <div className="relative size-32 border rounded-lg overflow-hidden shrink-0">
                <img
                  src={
                    companyLogoLightPreview ||
                    '/media/ui/empty-image.svg'
                  }
                  alt="Company Logo Light"
                  className="object-contain size-full p-2"
                />
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      companyLogoLightRef.current?.click()
                    }
                  >
                    Attach Image
                  </Button>

                  {companyLogoLight && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={
                        handleCancelCompanyLogoLight
                      }
                    >
                      Cancel
                    </Button>
                  )}

                  {!companyLogoLight &&
                    companyLogoLightUrl &&
                    companyLogoLightPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={
                          handleRemoveCompanyLogoLight
                        }
                      >
                        Remove
                      </Button>
                    )}
                </div>

                <input
                  ref={companyLogoLightRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={
                    handleCompanyLogoLightChange
                  }
                />

                {companyLogoLight && (
                  <p className="text-sm text-muted-foreground">
                    {companyLogoLight.name}
                  </p>
                )}

                <p className="text-sm text-muted-foreground">
                  PNG, JPEG, WEBP or SVG.
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              FAVICON
          ================================================= */}

          <div className="flex flex-col gap-2.5">
            <Label>
              Favicon
            </Label>

            <div className="flex items-center gap-5">
              <div className="relative size-20 border rounded-lg overflow-hidden shrink-0">
                <img
                  src={
                    faviconPreview ||
                    '/media/ui/empty-image.svg'
                  }
                  alt="Favicon"
                  className="object-contain size-full p-2"
                />
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      faviconRef.current?.click()
                    }
                  >
                    Attach Image
                  </Button>

                  {favicon && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelFavicon}
                    >
                      Cancel
                    </Button>
                  )}

                  {!favicon &&
                    faviconUrl &&
                    faviconPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveFavicon}
                      >
                        Remove
                      </Button>
                    )}
                </div>

                <input
                  ref={faviconRef}
                  type="file"
                  accept=".ico,image/png,image/svg+xml"
                  className="hidden"
                  onChange={handleFaviconChange}
                />

                {favicon && (
                  <p className="text-sm text-muted-foreground">
                    {favicon.name}
                  </p>
                )}

                <p className="text-sm text-muted-foreground">
                  ICO, PNG or SVG.
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              RTL ADMIN
          ================================================= */}

          <div className="flex flex-col gap-2.5">
            <Label>
              RTL Admin Area
            </Label>

            <div className="flex items-center space-x-2 rounded-lg bg-accent/60 p-4">
              <Switch
                id="rtl-admin"
                checked={rtlAdmin}
                onCheckedChange={setRtlAdmin}
              />

              <Label
                htmlFor="rtl-admin"
                className="font-normal"
              >
                Right to Left direction for admin area.
              </Label>
            </div>
          </div>

          {/* =================================================
              RTL CUSTOMER
          ================================================= */}

          <div className="flex flex-col gap-2.5">
            <Label>
              RTL Customer Area
            </Label>

            <div className="flex items-center space-x-2 rounded-lg bg-accent/60 p-4">
              <Switch
                id="rtl-customer"
                checked={rtlCustomer}
                onCheckedChange={setRtlCustomer}
              />

              <Label
                htmlFor="rtl-customer"
                className="font-normal"
              >
                Right to Left direction for customer area.
              </Label>
            </div>
          </div>

          {/* =================================================
              ALLOWED FILE TYPES
          ================================================= */}

          <div className="flex flex-col gap-2.5">
            <Label htmlFor="allowed-file-types">
              Allowed File Types
            </Label>

            <Input
              id="allowed-file-types"
              type="text"
              value={allowedFileTypes}
              onChange={(e) =>
                setAllowedFileTypes(
                  e.target.value
                )
              }
              placeholder="jpg, jpeg, png, pdf, doc, docx"
            />

            <p className="text-sm text-muted-foreground">
              Enter file extensions separated by commas.
            </p>
          </div>

          {/* =================================================
              STORE DATA BACKEND
          ================================================= */}

          <div className="flex flex-col gap-2.5">
            <Label>
              Store Data in Backend
            </Label>

            <div className="flex items-center space-x-2 rounded-lg bg-accent/60 p-4">
              <Switch
                id="store-data-backend"
                checked={storeDataBackend}
                onCheckedChange={
                  setStoreDataBackend
                }
              />

              <Label
                htmlFor="store-data-backend"
                className="font-normal"
              >
                Store application settings and
                data in the backend database.
              </Label>
            </div>
          </div>

          {/* =================================================
              ACTION BUTTONS
          ================================================= */}

          <div className="flex gap-2.5 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && (
                <LoaderCircleIcon className="animate-spin" />
              )}

              {saving
                ? 'Saving...'
                : 'Save Settings'}
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}