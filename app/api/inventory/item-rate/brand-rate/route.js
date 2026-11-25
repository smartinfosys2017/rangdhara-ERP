
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const ItemMasterid = searchParams.get("itemMasterId");
    const BrandManufacturerid = searchParams.get("brandManufacturerId");
    const ItemConditionid = searchParams.get("itemConditionId");
    const ItemGroupid = searchParams.get("itemGroupId");
    const Unitid = searchParams.get("unitId");
    const date = searchParams.get("date");

    if (!ItemMasterid || !date) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Master and date are required.",
        },
        { status: 400 }
      );
    }

    // Validate date
    const selectedDate = new Date(`${date}T00:00:00.000Z`);

    if (Number.isNaN(selectedDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date." },
        { status: 400 }
      );
    }

    const nextDay = new Date(selectedDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    // Fetch Item Master and its assigned brands
    const itemMaster = await prisma.itemMaster.findFirst({
      where: {
        id: ItemMasterid,
        deletedAt: null,
      },
      include: {
        brands: true,
      },
    });

    if (!itemMaster) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Master not found.",
        },
        { status: 404 }
      );
    }

    const assignedBrands = itemMaster.brands || [];

    // CASE 1: Only one brand assigned
    // Fetch rate directly from Item Master
    if (assignedBrands.length === 1) {
      return NextResponse.json({
        success: true,
        message: "Item Master rate fetched successfully.",
        data: {
          id: itemMaster.id,
          ItemMasterid: itemMaster.id,
          BrandManufacturerid:
            assignedBrands[0].BrandManufacturerid ||
            assignedBrands[0].brandManufacturerid ||
            null,
          ItemConditionid: ItemConditionid || null,
          ItemGroupid: ItemGroupid || itemMaster.ItemGroupid,
          Unitid: Unitid || itemMaster.Unitid,
          ApplicableFromDate: null,
          ApplicableToDate: null,
          Rate: Number(itemMaster.rather) || 0,
          rateSource: "ITEM_MASTER",
        },
      });
    }

    // CASE 2: Multiple brands assigned
    // Brand Manufacturer is required
    if (!BrandManufacturerid) {
      return NextResponse.json(
        {
          success: false,
          message: "Brand Manufacturer is required.",
        },
        { status: 400 }
      );
    }

    const where = {
      ItemMasterid,
      BrandManufacturerid,
      deletedAt: null,

      ApplicableFromDate: {
        lt: nextDay,
      },

      OR: [
        { ApplicableToDate: null },
        { ApplicableToDate: { gte: selectedDate } },
      ],
    };

    if (ItemConditionid) {
      where.ItemConditionid = ItemConditionid;
    }

    if (ItemGroupid) {
      where.ItemGroupid = ItemGroupid;
    }

    if (Unitid) {
      where.Unitid = Unitid;
    }

    const itemRate = await prisma.itemRates.findFirst({
      where,
      orderBy: [
        { ApplicableFromDate: "desc" },
        { createdAt: "desc" },
      ],
    });

    if (!itemRate) {
      return NextResponse.json(
        {
          success: false,
          message: "No applicable brand-based rate found for this date.",
          data: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Brand-based rate fetched successfully.",
      data: {
        id: itemRate.id,
        ItemMasterid: itemRate.ItemMasterid,
        BrandManufacturerid: itemRate.BrandManufacturerid,
        ItemConditionid: itemRate.ItemConditionid,
        Unitid: itemRate.Unitid,
        ApplicableFromDate: itemRate.ApplicableFromDate,
        ApplicableToDate: itemRate.ApplicableToDate,
        Rate: itemRate.Rate,
        rateSource: "ITEM_RATES",
      },
    });
  } catch (error) {
    console.error("BRAND RATE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch item rate.",
      },
      { status: 500 }
    );
  }
}