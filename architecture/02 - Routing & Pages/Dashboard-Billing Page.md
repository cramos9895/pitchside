# 📄 Dashboard Billing Page

**Path:** `src/app/dashboard/billing/page.tsx` (Billing & Contracts Sub-tab)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Section Header:** Branded header for "Billing & Contracts" providing a summary of the user's financial status and active vaulted terms.
    - **Transaction History Table:** A dense, data-rich table that acts as the primary ledger for the user. Columns include:
        - **Date Issued:** When the booking or contract was first created.
        - **Facility / Description:** Identifies the venue and specific resource (e.g., "Northwest Turf - Field 1").
        - **Event Date:** The actual calendar date of the scheduled match or rental.
        - **Status:** Color-coded badges for `Paid` (Green), `Unpaid` (Red), or `Pending` (Gray).
        - **Terms:** Identifies the payment structure (e.g., "Weekly Auto-Pay" or "Standard").
    - **Empty State Display:** A clean fallback UI that renders the `Receipt` icon when no financial records are discovered in the database.
- **Imported Custom Components:**
    
    - _(Note: This page currently utilizes standard Tailwind-styled HTML table elements for maximum data density rather than high-level custom cards)._
- **Icons (lucide-react):**
    
    - `Loader2`, `Receipt`, `Search`, `ArrowDownToLine`, `RefreshCw`
- **Buttons / Clickable Elements:**
    
    - **Weekly Auto-Pay Badge:** While informative, features a `RefreshCw` icon to signify recurring billing logic.

## 🎛️ State & Variables

- **React State (Client-Side):**
    
    - `loading`: Manages the UI transition while resolving the complex multi-table billing join.
    - `transactions`: Stores the final merged array of booking data and contract terms.
- **Data Aggregation Logic:**
    
    - **Contract Mapping:** The page performs a two-stage fetch. It first retrieves all `resource_bookings`, then identifies distinct `recurring_group_id` keys to fetch associated metadata from the `recurring_booking_groups` table. This allows the UI to surface specific payment terms for each line item.
- **Database Queries (Client-Side):**
    
    - **Auth:** [[supabase.auth.getUser]] ensures the user is logged in before attempting to access sensitive financial data.
    - **Resource Bookings Fetch:** Retrieves all historical and future records from `resource_bookings` for the current user.
    - **Contract Fetch:** Queries `recurring_booking_groups` using an `in` filter based on the IDs discovered in the bookings result.

## 🔗 Links & Routing (Outbound)

- `href="/login"` (Auth-gate redirect for session timeouts)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the client-side Supabase connection)
- [[formatPrice]] (A local helper function that converts raw cents into a localized USD string e.g., "$25.00")