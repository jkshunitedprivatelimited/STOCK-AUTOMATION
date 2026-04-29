# Graph Report - .  (2026-04-28)

## Corpus Check
- Large corpus: 102 files · ~1,377,856 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 237 nodes · 211 edges · 12 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Core Auth & Dashboard|Core Auth & Dashboard]]
- [[_COMMUNITY_Store Bills & Printer|Store Bills & Printer]]
- [[_COMMUNITY_Central Invoices & Requests|Central Invoices & Requests]]
- [[_COMMUNITY_Franchise Stock Order|Franchise Stock Order]]
- [[_COMMUNITY_Central Stock Master|Central Stock Master]]
- [[_COMMUNITY_Stock Update|Stock Update]]
- [[_COMMUNITY_Error Boundary|Error Boundary]]
- [[_COMMUNITY_Supabase Resilience Fetch|Supabase Resilience Fetch]]
- [[_COMMUNITY_Franchise Invoices|Franchise Invoices]]
- [[_COMMUNITY_Franchise Bills|Franchise Bills]]
- [[_COMMUNITY_Central Invoices|Central Invoices]]
- [[_COMMUNITY_Bulk Register Utils|Bulk Register Utils]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 24 edges
2. `formatCurrency()` - 7 edges
3. `amountToWords()` - 6 edges
4. `ErrorBoundary` - 5 edges
5. `formatDate()` - 4 edges
6. `FullPageInvoice()` - 4 edges
7. `useBluetoothPrinter()` - 3 edges
8. `parseDate()` - 3 edges
9. `formatTime()` - 3 edges
10. `FranchiseInvoices()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `OldQuotations()` --calls--> `useAuth()`  [INFERRED]
  src/pages/central/central_quotation_bills.jsx → src/context/AuthContext.jsx
- `PackageBills()` --calls--> `useAuth()`  [INFERRED]
  src/pages/central/central_new_franchise_bills.jsx → src/context/AuthContext.jsx
- `CentralStockMaster()` --calls--> `useAuth()`  [INFERRED]
  src/pages/central/central_stock_master.jsx → src/context/AuthContext.jsx
- `InvoicesBilling()` --calls--> `useAuth()`  [INFERRED]
  src/pages/stock/stock_invoices.jsx → src/context/AuthContext.jsx
- `StockUpdate()` --calls--> `useAuth()`  [INFERRED]
  src/pages/stock/stock_update.jsx → src/context/AuthContext.jsx

## Communities

### Community 0 - "Core Auth & Dashboard"
Cohesion: 0.05
Nodes (18): CentralInvoices(), CentralSettings(), CentralStaffProfiles(), CentralTransportationService(), CentralVendors(), CentralVoucher(), DashboardNavbar(), MobileNav() (+10 more)

### Community 1 - "Store Bills & Printer"
Cohesion: 0.14
Nodes (9): amountToWords(), formatCurrency(), formatTime(), FullPageInvoice(), OldQuotations(), useBluetoothPrinter(), BillingHistory(), CancelTimerButton() (+1 more)

### Community 2 - "Central Invoices & Requests"
Cohesion: 0.22
Nodes (7): amountToWords(), formatCurrency(), RequestInvoice(), FullPageInvoice(), FullPageInvoice(), InvoicesBilling(), FullPageInvoice()

### Community 3 - "Franchise Stock Order"
Cohesion: 0.2
Nodes (3): getPriceMultiplier(), StockOrder(), validateAndClampQty()

### Community 4 - "Central Stock Master"
Cohesion: 0.25
Nodes (1): CentralStockMaster()

### Community 5 - "Stock Update"
Cohesion: 0.25
Nodes (1): StockUpdate()

### Community 7 - "Error Boundary"
Cohesion: 0.33
Nodes (1): ErrorBoundary

### Community 8 - "Supabase Resilience Fetch"
Cohesion: 0.47
Nodes (4): fetchWithRetry(), getProxiedUrl(), isNetworkError(), resilientFetch()

### Community 9 - "Franchise Invoices"
Cohesion: 0.67
Nodes (5): formatDate(), formatTime(), FranchiseInvoices(), FullPageInvoice(), parseDate()

### Community 13 - "Franchise Bills"
Cohesion: 0.6
Nodes (4): amountToWords(), formatCurrency(), FullPageInvoice(), PackageBills()

### Community 14 - "Central Invoices"
Cohesion: 0.83
Nodes (3): amountToWords(), formatCurrency(), FullPageInvoice()

### Community 15 - "Bulk Register Utils"
Cohesion: 1.0
Nodes (2): bulkRegister(), generatePassword()

## Knowledge Gaps
- **Thin community `Central Stock Master`** (8 nodes): `CentralStockMaster()`, `CompanyBadge()`, `CustomSelect()`, `LabeledInput()`, `SortArrows()`, `StockUnitToggle()`, `TaxToggle()`, `central_stock_master.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stock Update`** (8 nodes): `stock_update.jsx`, `CompanyBadge()`, `CustomSelect()`, `LabeledInput()`, `SortArrows()`, `StockUnitToggle()`, `StockUpdate()`, `TaxToggle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Error Boundary`** (6 nodes): `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.render()`, `ErrorBoundary.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bulk Register Utils`** (3 nodes): `bulk_register.js`, `bulkRegister()`, `generatePassword()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Core Auth & Dashboard` to `Store Bills & Printer`, `Central Invoices & Requests`, `Central Stock Master`, `Stock Update`, `Franchise Bills`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Why does `formatCurrency()` connect `Central Invoices & Requests` to `Franchise Invoices`, `Franchise Stock Order`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `InvoicesBilling()` connect `Central Invoices & Requests` to `Core Auth & Dashboard`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `useAuth()` (e.g. with `DashboardNavbar()` and `MobileNav()`) actually correct?**
  _`useAuth()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `formatCurrency()` (e.g. with `FullPageInvoice()` and `FullPageInvoice()`) actually correct?**
  _`formatCurrency()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `amountToWords()` (e.g. with `FullPageInvoice()` and `FullPageInvoice()`) actually correct?**
  _`amountToWords()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Core Auth & Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._