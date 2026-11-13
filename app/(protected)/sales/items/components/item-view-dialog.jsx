'use client';

import {
  DollarSign,
  FileText,
  Layers,
  Package,
  Percent,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';


// =======================================================
// FORMAT MONEY
// =======================================================

const formatMoney = (value) => {
  const amount = Number(value || 0);

  return `$${amount.toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};


// =======================================================
// COMPONENT
// =======================================================

export default function ItemsViewDialog({
  open,
  closeDialog,
  item,
}) {

  if (!item) {
    return null;
  }


  return (
    <Dialog
      open={open}
      onOpenChange={(value)=>{
        if(!value){
          closeDialog?.();
        }
      }}
    >

      <DialogContent className="max-w-2xl">

        <DialogHeader className="border-b pb-4">

          <DialogTitle className="text-xl font-bold">
            Item Details
          </DialogTitle>

          <DialogDescription>
            View complete item information.
          </DialogDescription>

        </DialogHeader>


        <div className="space-y-5 py-4">


          {/* DESCRIPTION */}

          <div className="rounded-lg border p-4">

            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" />
              Description
            </div>


            <p className="text-sm">
              {item.description || '-'}
            </p>

          </div>



          {/* LONG DESCRIPTION */}

          <div className="rounded-lg border p-4">

            <div className="mb-2 flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4" />
              Long Description
            </div>


            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {item.longDescription || '-'}
            </p>

          </div>



          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">


            {/* RATE */}

            <div className="rounded-lg border p-4">

              <div className="mb-2 flex items-center gap-2 font-semibold">
                <DollarSign className="h-4 w-4" />
                Rate
              </div>


              <p className="text-sm">
                {formatMoney(item.rate)}
              </p>

            </div>



            {/* UNIT */}

            <div className="rounded-lg border p-4">

              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Layers className="h-4 w-4" />
                Unit
              </div>


              <p className="text-sm">
                {item.unit || '-'}
              </p>

            </div>



            {/* TAX 1 */}

            <div className="rounded-lg border p-4">

              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Percent className="h-4 w-4" />
                Tax 1
              </div>


              <p className="text-sm">
                {item.tax1 || '-'}
              </p>

            </div>



            {/* TAX 2 */}

            <div className="rounded-lg border p-4">

              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Percent className="h-4 w-4" />
                Tax 2
              </div>


              <p className="text-sm">
                {item.tax2 || '-'}
              </p>

            </div>


          </div>



          {/* GROUP */}

          <div className="rounded-lg border p-4">

            <div className="mb-2 font-semibold">
              Group Name
            </div>


            <p className="text-sm">
              {item.groupName || '-'}
            </p>

          </div>



        </div>



        <DialogFooter className="border-t pt-4">

          <Button
            variant="outline"
            onClick={closeDialog}
          >
            Close
          </Button>

        </DialogFooter>


      </DialogContent>

    </Dialog>
  );
}