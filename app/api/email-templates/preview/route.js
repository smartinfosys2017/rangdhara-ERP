import { NextResponse } from "next/server";

import { checkMenuAccess } from "@/lib/module-access";
import {
    getEmailTemplate,
    replaceMergeFields,
    htmlToText,
} from "@/lib/email-template";

export async function POST(request) {
    const accessError =
        await checkMenuAccess("email-templates");

    if (accessError) {
        return accessError;
    }

    try {
        const body = await request.json();

        const {
            templateSlug,
            data = {},
        } = body;

        if (!templateSlug) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Template slug is required.",
                },
                { status: 400 }
            );
        }

        const template =
            await getEmailTemplate(templateSlug);

        const previewData = {
            contact_firstname: "John",
            contact_lastname: "Doe",
            contact_phonenumber: "+1 555 123 4567",
            contact_title: "Manager",
            contact_email: "john@example.com",

            client_company: "Example Company",
            client_phonenumber: "+1 555 987 6543",
            client_country: "United States",
            client_city: "Denver",
            client_zip: "80202",
            client_state: "Colorado",
            client_address: "123 Main Street",
            client_vat_number: "VAT-123456",
            client_id: "1001",
            client_website: "https://example.com",

            item_name: "Sample Product",
            item_id: "ITEM-1001",
            item_sku: "SKU-1001",
            item_price: "$99.00",

            stock_quantity: "3",
            minimum_stock: "5",
            warehouse_name: "Main Warehouse",

            invoice_number: "INV-10001",
            invoice_total: "$1,250.00",

            payment_amount: "$1,250.00",
            payment_method: "Credit Card",

            companyname: "Rangdhara",
            crm_url: "https://example.com",
            email_signature: "Rangdhara Team",

            ...data,
        };

        const subject = replaceMergeFields(
            template.subject,
            previewData
        );

        const html = replaceMergeFields(
            template.message,
            previewData
        );

        const text = htmlToText(html);

        return NextResponse.json({
            success: true,
            data: {
                id: template.id,
                name: template.name,
                subject,
                fromName: replaceMergeFields(
                    template.fromName,
                    previewData
                ),
                to: replaceMergeFields(
                    template.to,
                    previewData
                ),
                cc: replaceMergeFields(
                    template.cc,
                    previewData
                ),
                bcc: replaceMergeFields(
                    template.bcc,
                    previewData
                ),
                html,
                text,
                plaintext: template.plaintext,
            },
        });
    } catch (error) {
        console.error(
            "Email Template Preview Error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate email preview.",
            },
            { status: 500 }
        );
    }
}