export interface Facility {
    id: string;
    name: string;
    slug: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
    created_at?: string;
}

export interface Resource {
    id: string;
    facility_id: string;
    name: string;
    type?: string | null;
    created_at?: string;
}
