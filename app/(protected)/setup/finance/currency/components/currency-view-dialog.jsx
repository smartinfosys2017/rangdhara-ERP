'use client';

import { formatDate } from '@/lib/helpers';

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

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

// =======================================================
// COMPONENT
// =======================================================

const CurrencyViewDialog = ({
  open,
  closeDialog,
  currency,
}) => {
  if (!currency) {
    return null;
  }

  // =====================================================
  // CURRENCY DATA
  // =====================================================

  const name =
    currency.name || '-';

  const symbol =
    currency.symbol || '-';

  const decimalSeparator =
    currency.decimal_separator ?? '.';

  const thousandSeparator =
    currency.thousand_separator ?? ',';

  const placement =
    currency.placement || 'before';

  // =====================================================
  // FORMAT PLACEMENT
  // =====================================================

  const placementLabel =
    placement === 'after'
      ? 'After amount'
      : 'Before amount';

  // =====================================================
  // EXAMPLE
  // =====================================================

  const exampleAmount =
    placement === 'after'
      ? `100${symbol}`
      : `${symbol}100`;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Currency Details
          </DialogTitle>

          <DialogDescription>
            View currency information.
          </DialogDescription>
        </DialogHeader>

        {/* =============================================
            CURRENCY INFORMATION
        ============================================= */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* ID */}

          <InfoItem
            label="Currency ID"
            value={`#${currency.id}`}
          />

          {/* NAME */}

          <InfoItem
            label="Currency Name"
            value={name}
          />

          {/* SYMBOL */}

          <InfoItem
            label="Currency Symbol"
            value={symbol}
          />

          {/* DECIMAL SEPARATOR */}

          <InfoItem
            label="Decimal Separator"
            value={decimalSeparator}
          />

          {/* THOUSAND SEPARATOR */}

          <InfoItem
            label="Thousand Separator"
            value={thousandSeparator}
          />

          {/* PLACEMENT */}

          <InfoItem
            label="Symbol Placement"
            value={placementLabel}
          />

          {/* EXAMPLE */}

          <InfoItem
            label="Example"
            value={exampleAmount}
          />

          {/* CREATED */}

          <InfoItem
            label="Created At"
            value={
              currency.createdAt
                ? formatDate(
                    new Date(
                      currency.createdAt
                    )
                  )
                : '-'
            }
          />

          {/* UPDATED */}

          <InfoItem
            label="Updated At"
            value={
              currency.updatedAt
                ? formatDate(
                    new Date(
                      currency.updatedAt
                    )
                  )
                : '-'
            }
          />
        </div>

        {/* =============================================
            FOOTER
        ============================================= */}

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

export default CurrencyViewDialog;