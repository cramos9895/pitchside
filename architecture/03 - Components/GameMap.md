# 🧩 GameMap

**Type:** #component **Location:** `src/components/GameMap.tsx`

## 📥 Props Received

- **latitude / longitude** (numbers): The precise geographic coordinates of the event or facility.
- **locationName** (string): The human-readable address or facility nickname displayed below the map.

## 🎛️ Local State & UI Logic

- **"Scorched Earth" Cartography**:
    - Implements a custom 120-line JSON style object for the Google Maps SDK. This overrides standard map colors with a bespoke dark palette:
        - **Geometry**: `#212121` (Deep Charcoal)
        - **Water**: `#000000` (Pure Black)
        - **Roads**: `#2c2c2c`
    - This ensures the embedded map feels like a native part of the PitchSide UI rather than a generic third-party embed.
- **Minimalist Data Viz**:
    - Explicitly disables the default Google Maps UI (zoom controls, street view, map type) and hides all Points of Interest (POI) icons to prioritize the specific "Match Location" marker.
- **Deep-Link Navigation Bridge**:
    - Features a persistent "Get Directions" floating action button (FAB) that generates a targeted `https://www.google.com/maps/dir/` URL. This provides a one-touch transition from the web app to the user's native navigation app.
- **Async Loading Lifecycle**:
    - Uses an `isLoaded` guard from `@react-google-maps/api`. While the SDK loads, it displays a themed CSS skeleton (`animate-pulse`) to maintain layout stability.
- **Performance Memoization**:
    - Wraps the `center` coordinate object in `useMemo` to prevent the Google Maps instance from re-centering or flickering during parent re-renders.

## 🔗 Used In (Parent Pages)

- `src/app/games/[id]/page.tsx` (Match Details)
- `src/app/facilities/[id]/page.tsx` (Facility Overview)

## ⚡ Actions & API Triggers

- **Google Maps JavaScript API**: The primary external dependency.
- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`**: Required environment variable for map rendering and geocoding.

---

**GameMap provides high-utility geographic context for every event, utilizing a custom-styled dark theme to bridge the gap between logistical utility and premium sports aesthetics.**