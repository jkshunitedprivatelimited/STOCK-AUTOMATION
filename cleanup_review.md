# Database and Feature Cleanup Review

Please mark the items you want to DELETE with an `[x]` and leave the ones you want to KEEP as `[ ]`.
You can also add notes next to any item.

## 1. Database Tables

**Users & Roles**

- [ ] `profiles` (Main users/owners)
- [ ] `companies`
- [ ] `staff_profiles` (Franchise-level staff)
- [X] `office_staff_profiles` (Central HQ staff)

**Settings & Logs**

- [ ] `central_settings`
- [X] `office_settings` (Holds the HQ Geofencing coordinates)
- [ ] `login_logs`
- [X] `office_staff_attendance_logs`

**Inventory & Stock**

- [ ] `stocks`
- [ ] `stock_requests`
- [ ] `stock_request_orders`

**Billing, Invoices & Orders**

- [ ] `bills_generated`
- [ ] `bills_items_generated`
- [ ] `invoices`
- [ ] `invoice_items`
- [ ] `quotations`
- [ ] `token_bills`
- [ ] `vouchers`

**Misc / Vendors**

- [ ] `menus`
- [ ] `vendors`
- [ ] `logos`

## 2. Features / Concepts

Please mark any entire features or concepts you want to completely remove from the codebase:

- [X] **Geofencing / GPS Check-In** (Requires staff to be near HQ to check in)
- [X] **Office Staff Dashboard** (The separate portal for HQ staff attendance)
- [ ] **Central Staff Profiles** (Managing HQ staff)
- [ ] **Franchise Staff Profiles** (Managing branch-level staff)
- [ ] **Vouchers**
- [ ] **Token Bills**
- [ ] **Quotations**
- [ ] **Vendor Management**

---

Once you have made your changes to this file and saved it, just let me know, and I will analyze your selections and begin carefully removing the unneeded code and tables!
