"use client";

import { Container } from "@/components/common/container";
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from "@/components/common/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSignature, Plus } from "lucide-react";

const contracts = [
  {
    id: 1,
    subject: "Website Development Contract",
    customer: "Smart",
    contractType: "Fixed Term",
    contractValue: "$4,533.00",
    startDate: "Sep 04, 2026",
    endDate: "Sep 25, 2026",
    signature: "Signed",
  },
  {
    id: 2,
    subject: "UI/UX Design Agreement",
    customer: "Smart",
    contractType: "Project Based",
    contractValue: "$2,500.00",
    startDate: "Sep 01, 2026",
    endDate: "Sep 20, 2026",
    signature: "Pending",
  },
  {
    id: 3,
    subject: "Maintenance & Support",
    customer: "Smart",
    contractType: "Monthly",
    contractValue: "$750.00",
    startDate: "Sep 10, 2026",
    endDate: "Oct 10, 2026",
    signature: "Signed",
  },
];

function getSignatureVariant(signature) {
  return signature === "Signed" ? "default" : "secondary";
}

export default function ContractsPage() {
  return (
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>Contracts</ToolbarTitle>
        </ToolbarHeading>

        <ToolbarActions>
          <Button>
            <Plus className="mr-2 size-4" />
            New Contract
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="rounded-xl border bg-background">
        {/* Desktop Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">
                  Subject
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Customer
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Contract Type
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Contract Value
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  End Date
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Signature
                </th>
              </tr>
            </thead>

            <tbody>
              {contracts.map((contract) => (
                <tr
                  key={contract.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-4 font-medium">
                    {contract.id}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <FileSignature className="size-4 text-muted-foreground" />
                      <span className="font-medium">
                        {contract.subject}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {contract.customer}
                  </td>

                  <td className="px-4 py-4">
                    {contract.contractType}
                  </td>

                  <td className="px-4 py-4 font-medium">
                    {contract.contractValue}
                  </td>

                  <td className="px-4 py-4 text-muted-foreground">
                    {contract.startDate}
                  </td>

                  <td className="px-4 py-4 text-muted-foreground">
                    {contract.endDate}
                  </td>

                  <td className="px-4 py-4">
                    <Badge
                      variant={getSignatureVariant(contract.signature)}
                    >
                      {contract.signature}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 p-4 md:hidden">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="rounded-lg border p-4"
            >
              <div className="mb-4 flex items-start gap-3">
                <FileSignature className="mt-0.5 size-5 text-muted-foreground" />

                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs text-muted-foreground">
                    #{contract.id}
                  </div>

                  <h3 className="font-medium">
                    {contract.subject}
                  </h3>
                </div>

                <Badge
                  variant={getSignatureVariant(contract.signature)}
                >
                  {contract.signature}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Customer
                  </p>
                  <p>{contract.customer}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Contract Type
                  </p>
                  <p>{contract.contractType}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Contract Value
                  </p>
                  <p className="font-medium">
                    {contract.contractValue}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Start Date
                  </p>
                  <p>{contract.startDate}</p>
                </div>

                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    End Date
                  </p>
                  <p>{contract.endDate}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}