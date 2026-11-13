import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { inventoryToCSV } from "../../../../lib/Inventory-issue-recipt-export/InventoryIssueReciptCSVExport";
export async function GET() {
  try {
    const inventory = await prisma.IssueReceipt.findMany({
      orderBy: {
        id: "asc"
      }
    });

    const csv = inventoryToCSV(inventory);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="inventory-IssueReceipt.csv"'
      }
    });
  } catch (error) {
    console.error("IssueReceipt export error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to export IssueReceipt."
      },
      {
        status: 500
      }
    );
  }
}