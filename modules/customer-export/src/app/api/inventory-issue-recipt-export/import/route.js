import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { csvToInventory } from "../../../../lib/Inventory-issue-recipt-export/InventoryIssueReciptCSVImport";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    // -------------------------------------------------
    // FILE VALIDATION
    // -------------------------------------------------

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV file is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!file.name?.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        {
          success: false,
          message: "Only CSV files are supported.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // READ CSV
    // -------------------------------------------------

    const csv = await file.text();

    const inventory = csvToInventory(csv);

    if (!inventory.length) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV file contains no Issue/Receipt records.",
        },
        {
          status: 400,
        }
      );
    }

    let imported = 0;
    let updated = 0;
    let failed = 0;

    const errors = [];

    // -------------------------------------------------
    // IMPORT Issue/Receipt
    // -------------------------------------------------

    for (let index = 0; index < inventory.length; index++) {
      const issueReceipt = inventory[index];

      try {
        // -------------------------------------------------
        // BASIC REQUIRED VALIDATION
        // -------------------------------------------------

        if (
          issueReceipt.ItemGroupid === null ||
          issueReceipt.ItemGroupid === undefined
        ) {
          failed++;

          errors.push({
            row: index + 2,
            message: "Item Group ID is required.",
          });

          continue;
        }

        // -------------------------------------------------
        // ID EXISTS → UPDATE
        // -------------------------------------------------

        if (issueReceipt.id) {
          const issueReceiptId =
            String(issueReceipt.id).trim();

          const existingIssueReceipt =
            await prisma.IssueReceipt.findUnique({
              where: {
                id: issueReceiptId,
              },
            });

          if (existingIssueReceipt) {
            const updateData = {
              ...issueReceipt,
            };

            delete updateData.id;
            delete updateData.createdAt;
            delete updateData.updatedAt;
            delete updateData.deletedAt;

            await prisma.IssueReceipt.update({
              where: {
                id: issueReceiptId,
              },
              data: updateData,
            });

            updated++;

            continue;
          }
        }

        // -------------------------------------------------
        // NO ID → CREATE NEW RECORD
        // -------------------------------------------------

        const createData = {
          ...issueReceipt,
        };

        delete createData.id;
        delete createData.createdAt;
        delete createData.updatedAt;
        delete createData.deletedAt;

        await prisma.IssueReceipt.create({
          data: createData,
        });

        imported++;
      } catch (error) {
        console.error(
          `Issue/Receipt import row ${index + 2}:`,
          error
        );

        failed++;

        errors.push({
          row: index + 2,
          message:
            error?.message ||
            "Unable to import Issue/Receipt.",
        });
      }
    }

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json({
      success: true,
      total: inventory.length,
      imported,
      updated,
      failed,
      errors,
    });
  } catch (error) {
    console.error(
      "Issue/Receipt import error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Issue/Receipt import failed.",
        error: error?.message,
      },
      {
        status: 500,
      }
    );
  }
}