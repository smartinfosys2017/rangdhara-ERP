import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { customersToCSV } from "../../../../lib/customer-export/CustomerCSVExport";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        id: "asc"
      }
    });

    const csv = customersToCSV(customers);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="customers.csv"'
      }
    });
  } catch (error) {
    console.error("Customer export error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to export customers."
      },
      {
        status: 500
      }
    );
  }
}