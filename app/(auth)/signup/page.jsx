
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  LoaderCircleIcon,
} from 'lucide-react';
import { useForm } from 'react-hook-form';

import { apiFetch } from '@/lib/api';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useSettings } from '@/providers/settings-provider';

import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RecaptchaPopover } from '@/components/common/recaptcha-popover';
import { getSignupSchema } from '../forms/signup-schema';

function SignupForm() {
  const router = useRouter();

  const { getOption, settingsLoading } = useSettings();

  const companyName =
    getOption('company.company_name') || 'Rangdhara Fabrics';
  const defaultLogo = toAbsoluteUrl('/media/app/Logo.png');

  const lightLogo =
    getOption('general.company_logo_light') || defaultLogo;

  const darkLogo =
    getOption('general.company_logo_dark') || defaultLogo;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmationVisible, setPasswordConfirmationVisible] =
    useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showRecaptcha, setShowRecaptcha] = useState(false);

  const form = useForm({
    resolver: zodResolver(getSignupSchema()),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      accept: false,
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const valid = await form.trigger();

    if (!valid) return;

    setShowRecaptcha(true);
  };

  const handleVerifiedSubmit = async (token) => {
    try {
      const values = form.getValues();

      setIsProcessing(true);
      setError(null);
      setShowRecaptcha(false);

      const response = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-recaptcha-token': token,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(
          result.message ||
          'Unable to create your account. Please try again.'
        );
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <Alert onClose={() => setSuccess(false)}>
        <AlertIcon>
          <Check />
        </AlertIcon>
        <AlertTitle>
          You have successfully signed up! Please check your email to verify
          your account and then{' '}
          <Link
            href="/signin/"
            className="text-primary hover:text-primary-darker"
          >
            Log in
          </Link>
          .
        </AlertTitle>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="block w-full space-y-5">
        <div className="flex items-center justify-center w-full">
          {!settingsLoading && (
            <>
              {/* Light theme */}
              <img
                key={lightLogo}
                src={lightLogo}
                className="h-[150px] object-contain dark:hidden"
                alt={companyName}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultLogo;
                }}
              />

              {/* Dark theme */}
              <img
                key={darkLogo}
                src={darkLogo}
                className="h-[150px] object-contain hidden dark:block"
                alt={companyName}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultLogo;
                }}
              />
            </>
          )}
        </div>

        <div className="space-y-1.5 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-center">
            Sign Up to <span>{companyName}</span>
          </h1>
        </div>

        {error && (
          <Alert variant="destructive" onClose={() => setError(null)}>
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <Input
                  placeholder="Your password"
                  type={passwordVisible ? 'text' : 'password'}
                  {...field}
                />

                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                  aria-label={
                    passwordVisible ? 'Hide password' : 'Show password'
                  }
                >
                  {passwordVisible ? (
                    <EyeOff className="text-muted-foreground" />
                  ) : (
                    <Eye className="text-muted-foreground" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="passwordConfirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <div className="relative">
                <Input
                  type={passwordConfirmationVisible ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  {...field}
                />

                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  onClick={() =>
                    setPasswordConfirmationVisible(
                      !passwordConfirmationVisible
                    )
                  }
                  className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                  aria-label={
                    passwordConfirmationVisible
                      ? 'Hide password confirmation'
                      : 'Show password confirmation'
                  }
                >
                  {passwordConfirmationVisible ? (
                    <EyeOff className="text-muted-foreground" />
                  ) : (
                    <Eye className="text-muted-foreground" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center space-x-2">
          <FormField
            control={form.control}
            name="accept"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="accept"
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(!!checked)
                      }
                    />

                    <label
                      htmlFor="accept"
                      className="text-sm leading-none text-muted-foreground"
                    >
                      I agree to the
                    </label>

                    <Link
                      href="/privacy-policy"
                      target="_blank"
                      className="-ms-0.5 text-sm font-semibold text-foreground hover:text-primary"
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <RecaptchaPopover
            open={showRecaptcha}
            onOpenChange={(open) => {
              if (!open) setShowRecaptcha(false);
            }}
            onVerify={handleVerifiedSubmit}
            trigger={
              <Button type="submit" disabled={isProcessing}>
                {isProcessing && (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                )}
                Continue
              </Button>
            }
          />
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Already have an account?{' '}
          <Link
            href="/signin"
            className="font-semibold text-foreground hover:text-primary"
          >
            Sign In
          </Link>
        </div>
      </form>
    </Form>
  );
}

export default function Page() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}