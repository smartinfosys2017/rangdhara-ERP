import CSVExport from "./CSVExport";

export default class InventoryCSVExport extends CSVExport {
  constructor(filename = "inventory.csv") {
    super(filename);

    this.setHeaders([
      "ID",
      "Item Group ID",
      "Item Name",
      "Description",
      "Opening Balance",
      "Unit ID",
      "Rather",
      "Tax 1",
      "Tax 2",
      "Applicable For Relocate Level",
      "Relocate Level",
      "Status",
      "Default",
      "Created At",
      "Updated At",
      "Deleted At",
      "Last Sync At"
    ]);
  }

  formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? ""
      : date.toISOString();
  }

  formatBoolean(value) {
    return value ? "Yes" : "No";
  }

  addInventory(inventory) {
    this.addRow([
      inventory.id,
      inventory.ItemGroupid,
      inventory.ItemName,
      inventory.Description,
      inventory.openingBalance,
      inventory.Unitid,
      inventory.rather,
      inventory.Tax1,
      inventory.Tax2,
      this.formatBoolean(inventory.ApplicableForRelocateLevel),
      inventory.RelocateLevel,
      inventory.status,
      this.formatBoolean(inventory.isDefault),
      this.formatDate(inventory.createdAt),
      this.formatDate(inventory.updatedAt),
      this.formatDate(inventory.deletedAt),
      this.formatDate(inventory.lastSyncAt)
    ]);

    return this;
  }

  addInventories(inventories = []) {
    for (const inventory of inventories) {
      this.addInventory(inventory);
    }

    return this;
  }
}