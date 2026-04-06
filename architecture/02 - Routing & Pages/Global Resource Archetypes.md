# 📄 Global Resource Archetypes

**Path:** `src/app/admin/(dashboard)/settings/resources/page.tsx` (Inventory Schema Registry)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Resource Registry Header:** A standardized administrative header featuring the `MapPin` icon. This page acts as the global blueprint for all bookable physical spaces (fields, courts, rooms) across the network.
    - **Global Archetype Creator:** A high-contrast inline form (`bg-black/20`) for expanding the system's inventory types. It allows Master Admins to define new resource categories (e.g., "Tennis Court", "Billiard Table", "Full-Size Turf") with optional descriptive metadata.
    - **[[ResourceItem]] (Archetype Row):** An interactive client-side component that manages the lifecycle of individual resource types:
        - **Identity Cluster:** Displays the archetype name and its descriptive subtext.
        - **Inline Schema Editor:** Enables real-time modification of archetype labels and descriptions without page refreshes.
        - **Schema Deletion Node:** A trash-icon button for removing redundant or retired resource types from the platform's global selection list.
- **Imported Custom Components:**
    
    - [[ResourceItem]] (The administrative row module for archetype management).
- **Icons (lucide-react):**
    
    - `MapPin`, `Plus`, `Edit2`, `Trash2`, `Check`, `X`

## 🎛️ State & Variables

- **The Resource Archetype Model:**
    - A simple yet extensible schema containing `id`, `name`, and an optional `description`. Facilities utilize this "Global List" to classify their specific physical assets, ensuring data consistency for search and filtering.
- **Master Authorization:**
    - Access is strictly gated to `role === 'master_admin'`. Standard facility hosts or players attempting to access this internal schema are redirected to the root `/admin` dashboard.
- **Unified Data Flow:**
    - **Action-Based Forms:** Leverages Next.js `form` actions to execute `createResourceType` and `updateResourceType` server actions, providing a robust, server-side data pipeline with a responsive client-side experience.

## 🔗 Links & Routing (Outbound)

- `/admin/settings` (Navigation back to the Settings Hub)
- `/login` (Standard Auth Fallback)
- `/admin` (Redirect for unauthorized access)

## ⚡ Server Actions / APIs Triggered

- [[createResourceType]]: The entry action for system resource expansion.
- [[updateResourceType]]: Used for clarifying resource definitions.
- [[deleteResourceType]]: Used for registry pruning.

---

**The Global Resource Archetypes page is the architectural blueprint for PitchSide's inventory system, ensuring that every facility on the network uses a standardized classification system for its bookable assets.**