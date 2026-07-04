import * as XLSX from "xlsx";

/**
 * Compute total price with GST based on tax mode.
 * If Inclusive, the price already includes GST → return as-is.
 * If Exclusive, add GST on top.
 */
const computeTotalWithTax = (price, gstRate, taxMode) => {
    const p = parseFloat(price) || 0;
    const gst = parseFloat(gstRate) || 0;
    if (!p) return 0;
    if (taxMode === "Inclusive") return p;
    return p + (p * gst) / 100;
};

/**
 * Determine stock status label from quantity and threshold.
 */
const getStockStatus = (quantity, threshold) => {
    const qty = Number(quantity) || 0;
    const thr = Number(threshold) || 0;
    if (qty <= 0) return "Out of Stock";
    if (qty <= thr) return "Low Stock";
    return "In Stock";
};

/**
 * Export filtered stock items as a comprehensive Excel (.xlsx) file.
 *
 * @param {Array} items - The filtered array of stock items to export.
 * @param {Array} selectedCompanies - Currently selected company names.
 */
export const exportStockSheet = (items, selectedCompanies) => {
    if (!items || items.length === 0) {
        alert("No items to export. Please adjust your filters.");
        return;
    }

    // Build row data
    const rows = items.map((item, index) => {
        const gstRate = parseFloat(item.gst_rate) || 0;
        const purchasePrice = parseFloat(item.purchase_price) || 0;
        const salesPrice = parseFloat(item.price) || 0;
        const totalPurchase = computeTotalWithTax(purchasePrice, gstRate, item.purchase_tax_inc);
        const totalSales = computeTotalWithTax(salesPrice, gstRate, item.sales_tax_inc);
        const stockStatus = getStockStatus(item.quantity, item.threshold);

        return {
            "Sr. No": index + 1,
            "Item Code / SKU": item.item_code || "-",
            "HSN Code": item.hsn_code || "-",
            "Item Name": item.item_name || "-",
            "Category": item.category || "Uncategorized",
            "Description": item.description || "-",
            "Company Availability": item.company_availability === "All" || !item.company_availability ? "All Companies" : item.company_availability,
            "Online Store": item.online_store ? "Yes" : "No",
            "Unit Type": item.unit || "pcs",
            "Alt Unit": item.alt_unit || "None",
            "Current Stock (Primary)": Number(item.quantity) || 0,
            "Min Stock Alert (Primary)": Number(item.threshold) || 0,
            "Current Stock (Alt)": Number(item.quantity_alt) || 0,
            "Min Stock Alert (Alt)": Number(item.threshold_alt) || 0,
            "Stock Status": stockStatus,
            "MOQ (Primary)": Number(item.min_order_quantity) || 0,
            "MOQ (Alt Unit)": Number(item.min_order_quantity_alt) || 0,
            "Purchase Price (₹)": purchasePrice,
            "Purchase Unit": item.purchase_unit || item.unit || "pcs",
            "Purchase Tax Mode": item.purchase_tax_inc || "Exclusive",
            "Total Purchase Price (₹)": Math.round(totalPurchase * 100) / 100,
            "Sales Price (₹)": salesPrice,
            "Sales Tax Mode": item.sales_tax_inc || "Exclusive",
            "Total Sales Price (₹)": Math.round(totalSales * 100) / 100,
            "GST Rate (%)": gstRate,
            "MRP (₹)": Number(item.mrp) || 0,
        };
    });

    // Create worksheet from JSON
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths for clean printing
    const colWidths = [
        { wch: 7 },   // Sr. No
        { wch: 16 },  // Item Code / SKU
        { wch: 12 },  // HSN Code
        { wch: 30 },  // Item Name
        { wch: 18 },  // Category
        { wch: 30 },  // Description
        { wch: 25 },  // Company Availability
        { wch: 12 },  // Online Store
        { wch: 10 },  // Unit Type
        { wch: 10 },  // Alt Unit
        { wch: 20 },  // Current Stock (Primary)
        { wch: 22 },  // Min Stock Alert (Primary)
        { wch: 18 },  // Current Stock (Alt)
        { wch: 20 },  // Min Stock Alert (Alt)
        { wch: 14 },  // Stock Status
        { wch: 15 },  // MOQ (Primary)
        { wch: 15 },  // MOQ (Alt Unit)
        { wch: 16 },  // Purchase Price
        { wch: 14 },  // Purchase Unit
        { wch: 18 },  // Purchase Tax Mode
        { wch: 22 },  // Total Purchase Price
        { wch: 14 },  // Sales Price
        { wch: 16 },  // Sales Tax Mode
        { wch: 20 },  // Total Sales Price
        { wch: 12 },  // GST Rate
        { wch: 12 },  // MRP
    ];
    ws["!cols"] = colWidths;

    // Create workbook
    const companyLabel = selectedCompanies.length === 1
        ? selectedCompanies[0]
        : selectedCompanies.length > 1
            ? `${selectedCompanies.length}_Companies`
            : "All_Companies";

    // Sheet name (max 31 chars for Excel compatibility)
    const sheetName = companyLabel.length > 31 ? companyLabel.substring(0, 31) : companyLabel;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate filename with date
    const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).replace(/ /g, "_");

    const filename = `Stock_Report_${companyLabel.replace(/[^a-zA-Z0-9_]/g, "_")}_${today}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
};
