import CSVExport from "./CSVExport";

export default class CustomerCSVExport extends CSVExport {
  constructor(filename = "customers.csv") {
    super(filename);

    this.setHeaders([
      "ID",
      "Company",
      "VAT Number",
      "Phone",
      "Website",
      "Default Currency",
      "Default Language",
      "Address",
      "City",
      "State",
      "ZIP",
      "Country",
      "Billing Street",
      "Billing City",
      "Billing State",
      "Billing ZIP",
      "Billing Country",
      "Shipping Street",
      "Shipping City",
      "Shipping State",
      "Shipping ZIP",
      "Shipping Country",
      "Groups",
      "Active",
      "Created At",
      "Updated At",
      "Custom Fields"
    ]);
  }

  formatDate(value) {
    if (!value) return "";

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  addCustomer(customer) {
    this.addRow([
      customer.id,
      customer.company,
      customer.vatNumber,
      customer.phone,
      customer.website,
      customer.defaultCurrency,
      customer.defaultLanguage,
      customer.address,
      customer.city,
      customer.state,
      customer.zip,
      customer.country,
      customer.billingStreet,
      customer.billingCity,
      customer.billingState,
      customer.billingZip,
      customer.billingCountry,
      customer.shippingStreet,
      customer.shippingCity,
      customer.shippingState,
      customer.shippingZip,
      customer.shippingCountry,
      customer.groups,
      customer.active ? "Yes" : "No",
      this.formatDate(customer.createdAt),
      this.formatDate(customer.updatedAt),
      customer.customFields
    ]);

    return this;
  }

  addCustomers(customers = []) {
    for (const customer of customers) {
      this.addCustomer(customer);
    }

    return this;
  }
}
