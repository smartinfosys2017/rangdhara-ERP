'use client';

import {
  useEffect,
  useState,
} from 'react';

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
// INFO ITEM
// =======================================================

const InfoItem = ({
  label,
  value,
}) => {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="break-words text-sm font-medium text-foreground">
        {value || '-'}
      </div>
    </div>
  );
};

// =======================================================
// FORMAT DATE
// =======================================================

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return formatDateTime(date);
  } catch {
    return '-';
  }
};

// =======================================================
// SECTION
// =======================================================

const Section = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-4">

      <div>
        <h3 className="text-base font-semibold">
          {title}
        </h3>

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
};

// =======================================================
// CustomerSync VIEW DIALOG
// =======================================================

const CustomerSyncViewDialog = ({
  open,
  closeDialog,
  CustomerSync,
}) => {
  const [loading, setLoading] =
    useState(false);

  const [CustomerSyncData, setCustomerSyncData] =
    useState(CustomerSync || null);

  // =====================================================
  // LOAD COMPLETE CUSTOMER
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadCustomerSync = async () => {
      if (
        !open ||
        !CustomerSync?.id
      ) {
        return;
      }

      try {
        setLoading(true);

        // IMPORTANT:
        // This matches:
        // app/api/CustomerSync/[id]/route.js

        const response =
          await apiFetch(
            `/api/CustomerSync/${CustomerSync.id}`
          );

        const result =
          await response
            .json()
            .catch(() => ({}));

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.message ||
              result?.error ||
              'Failed to load CustomerSync.'
          );
        }

        if (!mounted) {
          return;
        }

        setCustomerSyncData(
          result.customer ||
            result.data ||
            CustomerSync
        );

      } catch (error) {
        console.error(
          'CustomerSync VIEW LOAD ERROR:',
          error
        );

        if (mounted) {
          setCustomerSyncData(
            CustomerSync
          );
        }

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCustomerSync();

    return () => {
      mounted = false;
    };
  }, [
    open,
    CustomerSync?.id,
  ]);

  // =====================================================
  // RESET DATA WHEN CUSTOMER CHANGES
  // =====================================================

  useEffect(() => {
    if (CustomerSync) {
      setCustomerSyncData(
        CustomerSync
      );
    }
  }, [CustomerSync]);

  // =====================================================
  // NO CUSTOMER
  // =====================================================

  if (!CustomerSyncData) {
    return null;
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <DialogHeader>

          <DialogTitle>
            Customer Details
          </DialogTitle>

          <DialogDescription>
            View customer information and sync details.
          </DialogDescription>

        </DialogHeader>

        {/* =================================================
            CONTENT
        ================================================= */}

        {loading ? (

          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading customer details...
          </div>

        ) : (

          <div className="space-y-8 py-4">

            {/* =============================================
                CUSTOMER INFORMATION
            ============================================= */}

            <Section
              title="Customer Information"
              description="Basic customer information."
            >

              <InfoItem
                label="Customer ID"
                value={
                  CustomerSyncData.id
                }
              />

              <InfoItem
                label="Name"
                value={
                  CustomerSyncData.name
                }
              />

              <InfoItem
                label="Email"
                value={
                  CustomerSyncData.email
                }
              />

              <InfoItem
                label="Phone"
                value={
                  CustomerSyncData.phone
                }
              />

            </Section>

            {/* =============================================
                SYNC INFORMATION
            ============================================= */}

            <Section
              title="Sync Information"
              description="Customer synchronization information."
            >

              <InfoItem
                label="Last Synced At"
                value={formatDate(
                  CustomerSyncData.lastSyncedAt
                )}
              />

            </Section>

            {/* =============================================
                RECORD INFORMATION
            ============================================= */}

            <Section
              title="Record Information"
              description="Customer record timestamps."
            >

              <InfoItem
                label="Created At"
                value={formatDate(
                  CustomerSyncData.createdAt
                )}
              />

              <InfoItem
                label="Updated At"
                value={formatDate(
                  CustomerSyncData.updatedAt
                )}
              />

            </Section>

          </div>

        )}

        {/* =================================================
            FOOTER
        ================================================= */}

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

export default CustomerSyncViewDialog;