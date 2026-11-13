import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { inventoryToCSV } from "../../../../lib/Inventory-unit-export/InventoryUnitCSVExport";
export async function GET() {
  try {
    const inventory = await prisma.Unit.findMany({
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
          'attachment; filename="inventory-Unit.csv"'
      }
    });
  } catch (error) {
    console.error("Unit export error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to export Unit."
      },
      {
        status: 500
      }
    );
  }
}