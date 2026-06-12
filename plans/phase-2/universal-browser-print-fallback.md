# 🖨️ Universal Browser Print Fallback for Receipt Printing

> **Phase:** 2  
> **Status:** Planned (Not Implemented)  
> **Created:** 12 June 2026  
> **Priority:** High — Fixes printing on all browsers without user configuration  
> **Affected Files:** `BluetoothPrinter.jsx`, `store_new_bills.jsx`, `store_billing_history.jsx`

---

## Problem

The current printing system relies **exclusively** on the Web Bluetooth API to connect to thermal printers. This fails when:

| Scenario | Result |
|---|---|
| Browser has Web Bluetooth **globally disabled** | `NotFoundError: Web Bluetooth API globally disabled` |
| User is on **Firefox, Safari, or unsupported browser** | `navigator.bluetooth` is `undefined` |
| Bluetooth permissions **blocked** at OS or browser level | `Bluetooth permission has been blocked` |
| User is on **iOS** | Web Bluetooth not supported natively |

**Web Bluetooth cannot be enabled via code** — it's a browser/OS-level setting. So we need a universal fallback.

---

## Proposed Solution

Add a **`window.print()` based browser print fallback** that works in **every browser on every device**. The thermal printer just needs to be added as a system printer (via USB, WiFi, or Bluetooth at the OS level).

### How it works:

```
┌──────────────────────────────────────────────────┐
│              User completes checkout             │
│                       │                          │
│                       ▼                          │
│           Is Bluetooth connected?                │
│              ╱              ╲                    │
│            YES               NO                  │
│             │                 │                   │
│             ▼                 ▼                   │
│    Use ESC/POS over      Open receipt-styled      │
│    Bluetooth (current)   HTML popup + call        │
│             │            window.print()           │
│             │                 │                   │
│        If it FAILS ──────────┘                   │
│      (auto-fallback)                             │
└──────────────────────────────────────────────────┘
```

1. On page load, detect if Web Bluetooth is available
2. If **Bluetooth available** → show the existing "CONNECT PRINTER" button (unchanged behavior)
3. If **Bluetooth NOT available** → show a "🖨️ BROWSER PRINT" badge instead (indicating the fallback mode)
4. When printing a receipt:
   - If Bluetooth is connected → use ESC/POS over Bluetooth (current behavior, unchanged)
   - If Bluetooth is NOT connected → open a **receipt-styled popup window** and trigger `window.print()` automatically
5. If Bluetooth printing **fails mid-print** → automatically fall back to browser print

### End User Requirement:
> The thermal printer must be set up as a **system printer** (connected via USB or WiFi to the computer/phone, and added in OS printer settings). This is a **one-time setup**.

---

## Design Decisions To Make Before Implementing

### 1. Auto-print after checkout?

Currently, when Bluetooth is not connected, the bill is saved and the user gets an `alert("Bill saved!")`. Should we instead automatically trigger browser print after every successful checkout?

- **Option A (Recommended):** Always auto-print via browser after checkout if no Bluetooth is connected
- **Option B:** Only print when user explicitly clicks a "Print" button after bill is saved

### 2. Paper size?

The receipt HTML is optimized for **58mm thermal paper**. Should we also support **80mm** paper, or is 58mm the only size in use?

---

## File-by-File Changes

### 1. `src/pages/printer/BluetoothPrinter.jsx`

**What changes:**

- **Add `printViaBrowser()` function** — generates a receipt-styled HTML string (58mm thermal layout with monospace font, dashed dividers, company header, items table, totals) and opens it in a popup window with `window.print()` auto-triggered

- **Replace `supportError` state** with `bluetoothSupported` boolean for cleaner logic

- **Detect Bluetooth availability** using `navigator.bluetooth.getAvailability()` on mount

- **Modify `printReceipt()`** to auto-fallback: if Bluetooth not connected, call `printViaBrowser()` instead of showing an alert

- **Add error recovery**: if Bluetooth printing fails mid-print, catch the error and fallback to `printViaBrowser()`

- **Expose `printViaBrowser` and `bluetoothSupported`** via the context provider

**Key new function — `printViaBrowser(billData)`:**
```javascript
// Opens a new window with receipt-styled HTML and triggers window.print()
// Works in ALL browsers — no Bluetooth, no flags, no permissions
// Optimized for 58mm thermal printers but works on any printer
function printViaBrowser(billData) {
  const receiptHTML = `...`; // Receipt-styled HTML with @page { size: 58mm auto }
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}
```

---

### 2. `src/pages/store/store_new_bills.jsx`

**What changes:**

- **Import `bluetoothSupported`** from the printer hook

- **Conditional printer button UI** (lines ~291-306):
  - If `bluetoothSupported` → show existing "CONNECT PRINTER" / "CONNECTED" buttons (no change)
  - If `!bluetoothSupported` → show a "🖨️ BROWSER PRINT" info badge (green, non-interactive)

- **Modify `handleCompleteTransaction()`** (lines ~202-230):
  - Remove the `if (isConnected)` gate for printing
  - Always call `printReceipt(payload)` after a successful bill save
  - The `printReceipt` function internally decides Bluetooth vs browser print

**Before:**
```javascript
if (isConnected) {
  await printReceipt(printPayload);
} else {
  setTimeout(() => alert("Bill saved!"), 300);
}
```

**After:**
```javascript
// Always print — printReceipt handles Bluetooth vs browser fallback internally
await printReceipt(printPayload);
```

---

### 3. `src/pages/store/store_billing_history.jsx`

**What changes:**

- **Import `bluetoothSupported`** from the printer hook

- **Same conditional UI** for the printer button area (lines ~404-420)

- **Modify `handleReprint()`** (lines ~261-277):
  - Remove the `if (!isConnected) return alert("Connect printer first.")` guard
  - Just call `printReceipt()` — it will auto-fallback to browser print

**Before:**
```javascript
const handleReprint = async (e, bill) => {
  if (!isConnected) return alert("Connect printer first.");
  await printReceipt({ ... });
};
```

**After:**
```javascript
const handleReprint = async (e, bill) => {
  // printReceipt auto-fallbacks to browser print if no Bluetooth
  await printReceipt({ ... });
};
```

---

## Verification Plan

| Test | Expected Result |
|---|---|
| Open in Chrome with Bluetooth **disabled** | "BROWSER PRINT" badge shown instead of "CONNECT PRINTER" |
| Complete checkout (no Bluetooth) | Receipt popup opens, `window.print()` triggers automatically |
| Open in **Firefox** | Same "BROWSER PRINT" behavior (Firefox has no Web Bluetooth) |
| Click "REPRINT" in billing history (no Bluetooth) | Browser print popup opens with receipt |
| Bluetooth **enabled and connected** | Existing ESC/POS Bluetooth printing works unchanged |
| Bluetooth printing **fails mid-print** | Auto-fallback to browser print popup |

---

## Notes

- This does **NOT** remove or break existing Bluetooth printing — it only adds a fallback
- The popup may be blocked by aggressive pop-up blockers; the code shows an alert if this happens
- The receipt HTML uses `@page { size: 58mm auto }` CSS for proper thermal paper sizing
- Monospace font (`Courier New`) is used to match the ESC/POS character alignment
