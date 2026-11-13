"use client";

import { useState } from "react";


import { Container } from "@/components/common/container";

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from "@/components/common/toolbar";

import { Button } from "@/components/ui/button";

import CustomerExportActions from "../../../components/customer-export/CustomerExportActions";
import CustomerImport from "../../../components/customer-export/CustomerImport";

import InventoryExportActions from "../../../components/inventory-export/InventoryExportActions";
import InventoryImport from "../../../components/inventory-export/InventoryImport";

import InventoryIssueReciptExportActions from "../../../components/inventory-export/InventoryIssueReciptExportActions";
import InventoryIssueReciptImport from "../../../components/inventory-export/InventoryIssueReciptImport";

import InventoryItemGroupExportActions from "../../../components/inventory-export/InventoryItemGroupExportActions";
import InventoryItemGroupImport from "../../../components/inventory-export/InventoryItemGroupImport";

import InventoryUnitExportActions from "../../../components/inventory-export/InventoryUnitExportActions";
import InventoryUnitImport from "../../../components/inventory-export/InventoryUnitImport";

export default function Page() {
  // -----------------------------------------
  // IMPORT DIALOG STATE
  // -----------------------------------------
  const [activeImport, setActiveImport] = useState(null);

  const openImport = (type) => {
    setActiveImport(type);
  };

  const closeImport = () => {
    setActiveImport(null);
  };

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>Import / Export</ToolbarTitle>
          </ToolbarHeading>

          <ToolbarActions />
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          <div className="card flex flex-col items-stretch text-card-foreground rounded-xl bg-card border border-border shadow-xs">
            <div className="card-body px-5 py-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-foreground">
                    Customer CSV Management
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    Use the buttons above to import customers from a CSV file or
                    download your existing customer records.
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-3.5">
                  <CustomerExportActions />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openImport("customer")}
                  >
                    Import CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Container>
        <div className="grid gap-5 mt-3 lg:gap-7.5">
          <div className="card flex flex-col items-stretch text-card-foreground rounded-xl bg-card border border-border shadow-xs">
            <div className="card-body px-5 py-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-foreground">
                    Inventory Item Master CSV Management
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    Use the buttons above to import Inventory from a CSV file or
                    download your existing Inventory records.
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-3.5">
                  <InventoryExportActions />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openImport("inventory")}
                  >
                    Import Item Master CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Container>
        <div className="grid gap-5 mt-3 lg:gap-7.5">
          <div className="card flex flex-col items-stretch text-card-foreground rounded-xl bg-card border border-border shadow-xs">
            <div className="card-body px-5 py-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-foreground">
                    Inventory Issue/Receipt CSV Management
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    Use the buttons above to import Inventory Issue/Receipt from
                    a CSV file or download your existing Inventory records.
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-3.5">
                  <InventoryIssueReciptExportActions />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openImport("issueReceipt")}
                  >
                    Import Issue/Receipt CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
      <Container>
        <div className="grid gap-5 mt-3 lg:gap-7.5">
          <div className="card flex flex-col items-stretch text-card-foreground rounded-xl bg-card border border-border shadow-xs">
            <div className="card-body px-5 py-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-foreground">
                    Inventory Item Group CSV Management
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    Use the buttons above to import Inventory Item Group from a
                    CSV file or download your existing Inventory records.
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-3.5">
                  <InventoryItemGroupExportActions />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openImport("itemGroup")}
                  >
                    Import Item Group CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Container>
        <div className="grid gap-5 mt-3 lg:gap-7.5">
          <div className="card flex flex-col items-stretch text-card-foreground rounded-xl bg-card border border-border shadow-xs">
            <div className="card-body px-5 py-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-foreground">
                    Inventory Unit CSV Management
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    Use the buttons above to import Inventory Unit from a CSV
                    file or download your existing Inventory records.
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-3.5">
                  <InventoryUnitExportActions />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openImport("unit")}
                  >
                    Import Unit CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Customer */}
      <CustomerImport
        open={activeImport === "customer"}
        closeDialog={closeImport}
        onSuccess={async () => {
          closeImport();
        }}
      />

      {/* Inventory Item Master */}
      <InventoryImport
        open={activeImport === "inventory"}
        closeDialog={closeImport}
        onSuccess={async () => {
          closeImport();
        }}
      />

      {/* Issue/Receipt */}
      <InventoryIssueReciptImport
        open={activeImport === "issueReceipt"}
        closeDialog={closeImport}
        onSuccess={async () => {
          closeImport();
        }}
      />

      {/* Item Group */}
      <InventoryItemGroupImport
        open={activeImport === "itemGroup"}
        closeDialog={closeImport}
        onSuccess={async () => {
          closeImport();
        }}
      />

      {/* Unit */}
      <InventoryUnitImport
        open={activeImport === "unit"}
        closeDialog={closeImport}
        onSuccess={async () => {
          closeImport();
        }}
      />
    </>
  );
}
