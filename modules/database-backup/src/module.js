const databaseBackupModule = {
    alias: "database_backup",

    name: "Database Backup",

    version: "1.0.0",

    routes: {
        pages: [
            {
                path: "/database-backup",
                file: "./app/database-backup/page.jsx",
            },
        ],

        api: [
            {
                path: "/api/database-backup",
                method: "GET",
                file: "./app/api/database-backup/route.js",
            },

            {
                path: "/api/database-backup",
                method: "POST",
                file: "./app/api/database-backup/route.js",
            },

            {
                path: "/api/database-backup/delete",
                method: "DELETE",
                file: "./app/api/database-backup/delete/route.js",
            },

            {
                path: "/api/database-backup/download",
                method: "GET",
                file: "./app/api/database-backup/download/route.js",
            },

            {
                path: "/api/database-backup/download-history",
                method: "GET",
                file: "./app/api/database-backup/download-history/route.js",
            },

            {
                path: "/api/database-backup/restore",
                method: "POST",
                file: "./app/api/database-backup/restore/route.js",
            },
        ],
    },
};

export default databaseBackupModule;