import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { csvToCustomers } from "../../../../lib/customer-export/CustomerCSVImport";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV file is required."
        },
        {
          status: 400
        }
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        {
          success: false,
          message: "Only CSV files are supported."
        },
        {
          status: 400
        }
      );
    }

    const csv = await file.text();

    const customers = csvToCustomers(csv);

    if (!customers.length) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV file contains no customer records."
        },
        {
          status: 400
        }
      );
    }

    let imported = 0;
    let updated = 0;
    let failed = 0;

    const errors = [];

    for (let index = 0; index < customers.length; index++) {
      const customer = customers[index];

      try {
        if (!customer.company) {
          failed++;

          errors.push({
            row: index + 2,
            message: "Company is required."
          });

          continue;
        }

        /*
         * VAT number is used as the update identifier
         * when it is available.
         *
         * Otherwise a new customer is created.
         */

        if (customer.vatNumber) {
          const existingCustomer =
            await prisma.customer.findFirst({
              where: {
                vatNumber: customer.vatNumber
              }
            });

          if (existingCustomer) {
            await prisma.customer.update({
              where: {
                id: existingCustomer.id
              },
              data: customer
            });

            updated++;

            continue;
          }
        }

        await prisma.customer.create({
          data: customer
        });

        imported++;
      } catch (error) {
        console.error(
          `Customer import row ${index + 2}:`,
          error
        );

        failed++;

        errors.push({
          row: index + 2,
          message: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: customers.length,
      imported,
      updated,
      failed,
      errors
    });
  } catch (error) {
    console.error("Customer import error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Customer import failed."
      },
      {
        status: 500
      }
    );
  }
}