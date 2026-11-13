# Customer Import / Export

Customer CSV import and export module for the application.

## Version

1.0.0

## Features

- Export customers to CSV
- Import customers from CSV
- Create new customers
- Update existing customers using VAT number
- Display import results
- Display failed import rows

## Installation

Upload the module ZIP through the application module manager.

The installer copies:

src/app
src/components
src/lib

into the main Next.js src directory.

## Customer Import

Company is required.

If a VAT number already exists, the existing customer is updated.

If no matching VAT number exists, a new customer is created.

## API

GET:

/api/customer-export/export

POST:

/api/customer-export/import

## Page

/customer-export