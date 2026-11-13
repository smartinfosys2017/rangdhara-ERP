'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, SquarePen, Check, X } from 'lucide-react';
import { toast } from 'sonner';

import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

const socialFields = [
  {
    key: 'socialLinkedin',
    label: 'LinkedIn',
    logo: '/media/brand-logos/linkedin.svg',
  },
  {
    key: 'socialTwitch',
    label: 'Twitch',
    logo: '/media/brand-logos/twitch-purple.svg',
  },
  {
    key: 'socialX',
    label: 'X',
    logo: '/media/brand-logos/x.svg',
  },
  {
    key: 'socialDribbble',
    label: 'Dribbble',
    logo: '/media/brand-logos/dribbble.svg',
  },
];

const BasicSettings = ({ title, onUserDataUpdated }) => {
  const [profile, setProfile] = useState({});
  const [account, setAccount] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/user-details', {
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Unable to load settings');
      }

      setAccount(result.user || {});
      setProfile(result.userDetails || {});
    } catch (error) {
      toast.error(error.message || 'Unable to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveSettings = async (data) => {
    setSaving(true);

    try {
      const response = await fetch('/api/user-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Unable to save settings');
      }

      setProfile(result.userDetails);
      setEditing(null);
      toast.success('Settings saved successfully');
      if (onUserDataUpdated) {
        await onUserDataUpdated();
      }
    } catch (error) {
      toast.error(error.message || 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (field) => {
    setEditing(field.key);
    setValue(profile[field.key] || '');
  };

  const referralLink =
    profile.referralLink ||
    (profile.referralCode
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${encodeURIComponent(profile.referralCode)}`
      : '');

  const copyReferralLink = async () => {
    if (!referralLink) {
      toast.error('No referral link is available yet');
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied');
    } catch {
      toast.error('Unable to copy referral link');
    }
  };

  return (
    <Card className="min-w-full">
      <CardHeader>
        <CardTitle>{title || 'Basic Settings'}</CardTitle>

        <div className="flex items-center gap-2">
          <Label htmlFor="public-profile" className="text-sm">
            Public Profile
          </Label>

          <Switch
            id="public-profile"
            size="sm"
            checked={profile.publicProfile ?? true}
            disabled={loading || saving}
            onCheckedChange={(checked) => {
              saveSettings({ publicProfile: checked });
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="kt-scrollable-x-auto pb-3 p-0">
        <Table className="align-middle text-sm text-muted-foreground">
          <TableBody>
            {/* Email */}
            <TableRow>
              <TableCell className="py-2 min-w-36 text-secondary-foreground font-normal">
                Email
              </TableCell>

              <TableCell className="py-2 min-w-60">
                <span className="text-foreground font-normal">
                  {loading ? 'Loading...' : account.email || 'Not available'}
                </span>
              </TableCell>

              <TableCell className="py-2 max-w-16 text-end">
                <span className="text-xs">Account email</span>
              </TableCell>
            </TableRow>

            {/* Password */}
            <TableRow>
              <TableCell className="py-2 text-secondary-foreground font-normal">
                Password
              </TableCell>

              <TableCell className="py-2 text-secondary-foreground font-normal">
                Managed by your account security settings
              </TableCell>

              <TableCell className="py-2 text-end">
                <Button variant="ghost" mode="icon" asChild>
                  <Link href="/account/home/user-profile">
                    <SquarePen size={16} className="text-blue-500" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>

            {/* Social profiles */}
            <TableRow>
              <TableCell className="py-2 text-secondary-foreground font-normal">
                Social Profiles
              </TableCell>

              <TableCell className="py-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    {socialFields.map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        title={field.label}
                        onClick={() => startEdit(field)}
                        className={`flex items-center justify-center size-8 bg-background rounded-full border ${editing === field.key
                            ? 'border-primary'
                            : 'border-input'
                          }`}
                      >
                        <img
                          src={toAbsoluteUrl(field.logo)}
                          className="size-4"
                          alt={field.label}
                        />
                      </button>
                    ))}
                  </div>

                  {editing && socialFields.some((field) => field.key === editing) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        className="max-w-sm"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder="Enter profile URL"
                      />

                      <Button
                        size="sm"
                        disabled={saving}
                        onClick={() => saveSettings({ [editing]: value.trim() })}
                      >
                        <Check size={14} className="mr-1" />
                        Save
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => setEditing(null)}
                      >
                        <X size={14} className="mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell className="py-2 text-end">
                <span className="text-xs">Select an icon to edit</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export { BasicSettings };