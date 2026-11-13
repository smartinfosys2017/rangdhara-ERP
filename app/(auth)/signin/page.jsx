'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LoaderCircleIcon } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from
  '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { toAbsoluteUrl } from '@/lib/helpers';
import { useSettings } from '@/providers/settings-provider';
import { getSigninSchema } from '../forms/signin-schema';

export default function Page() {
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const form = useForm({
    resolver: zodResolver(getSigninSchema()),
    // defaultValues: {
    //   email: 'demo@kt.com',
    //   password: 'demo123',
    //   rememberMe: false
    // }
  });

  async function onSubmit(values) {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });

      if (response?.error) {
        let errorMessage = 'Invalid email or password. Please try again.';

        try {
          const errorData = JSON.parse(response.error);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = response.error || errorMessage;
        }

        setError(errorMessage);
      } else if (response?.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } catch (err) {
      setError(
        err instanceof Error  ? err.message  : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="block w-full space-y-5">
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
            Sign in to <span>{companyName}</span>
          </h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) =>
          <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          } />


        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center gap-2.5">
                <FormLabel>Password</FormLabel>
                <Link
                href="/reset-password"
                className="text-sm font-semibold text-foreground hover:text-primary">

                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Input
                placeholder="Your password"
                type={passwordVisible ? 'text' : 'password'} // Toggle input type
                {...field} />

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

        <div className="flex items-center space-x-2">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) =>
            <>
                <Checkbox
                id="remember-me"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(!!checked)} />

                <label
                htmlFor="remember-me"
                className="text-sm leading-none text-muted-foreground">

                  Remember me
                </label>
              </>
            } />

        </div>

        <div className="flex flex-col gap-2.5">
          <Button type="submit" disabled={isProcessing}>
            {isProcessing ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            Continue
          </Button>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-sm font-semibold text-foreground hover:text-primary">

            Sign Up
          </Link>
        </p>
      </form>
    </Form>);

}