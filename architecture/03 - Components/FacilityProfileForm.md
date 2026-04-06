# 🧩 FacilityProfileForm

**Type:** #component **Location:** `src/components/facility/FacilityProfileForm.tsx`

## 📥 Props Received

- **initialData** (object): The existing facility profile data, including `public_description`, `amenities`, `hero_image_url`, and contact details.

## 🎛️ Local State & UI Logic

- **Marketing & Brand Architecture**:
    - The form is segmented into three logical zones: **Marketing Profile** (visuals and copy), **Public Contact Info** (leads generation), and the **Amenities Matrix**.
- **Interactive Amenity Matrix**:
    - Implements a high-density grid of selectable feature tags (e.g., "Stadium Lights," "Locker Rooms," "Concessions").
    - Uses a `Set` for state management to perform $O(1)$ toggles, ensuring zero-latency response times during the selection process. Selected items trigger a high-contrast `pitch-accent` glow to signify active status.
- **Visual Validation Feedback**:
    - Employs a local "Save Action Lifecycle" notification system. Instead of global toasts, success and error messages are rendered directly within the form's layout using `CheckCircle2` (Green) and `AlertCircle` (Red) alerts, providing immediate spatial context for the operation.
- **Storefront Optimization**:
    - Includes a persistent blue informational header reminding facility owners that this data is the primary driver for their **PitchSide Marketplace** storefront's visibility and conversion rate.
- **Data Serialization Logic**:
    - Automatically stringifies the `amenities` set and `operating_hours` object into JSON format during the `handleSubmit` process to ensure structural integrity when passed to the server action.

## 🔗 Used In (Parent Pages)

- `src/app/admin/facility/profile/page.tsx` (The Facility Management dashboard)

## ⚡ Actions & API Triggers

- **`updateFacilityProfile(formData)`**: The backend server action that persists the facility's brand identity. It manages the update of the `facilities` table and handles any necessary revalidation of the public facility discovery pages.

---

**FacilityProfileForm is the platform's primary brand-management interface, empowering facility owners to maintain a high-quality, conversion-optimized storefront on the global marketplace.**