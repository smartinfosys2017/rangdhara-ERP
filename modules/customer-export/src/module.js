const customerExportModule = {
    alias: "customer_export",

    name: "Import / Export",

    version: "1.4.0",

    routes: {
        pages: [
            {
                path: "/customer-export",
                file: "./app/customer-export/page.jsx",
            },
        ],

        api: [
            {
                path: "/api/customer-export/export",
                method: "GET",
                file: "./app/api/customer-export/export/route.js",
            },
            {
                path: "/api/customer-export/import",
                method: "POST",
                file: "./app/api/customer-export/import/route.js",
            },
        ],
    },
};

export default customerExportModule;