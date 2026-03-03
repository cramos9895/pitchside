'use client';

import { useState } from 'react';
import { updateFacilityProfile } from '@/app/actions/facility';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FacilityProfileFormProps {
    initialData: {
        public_description: string | null;
        amenities: string[];
        hero_image_url: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        operating_hours: any;
    };
}

const AVAILABLE_AMENITIES = [
    'Turf Fields', 'Grass Fields', 'Hardwood Courts', 'Outdoor Courts',
    'Indoor Facility', 'Stadium Lights', 'Locker Rooms', 'Showers',
    'Restrooms', 'Concessions', 'Pro Shop', 'Water Fountains',
    'Spectator Seating', 'Scoreboards', 'PA System', 'Free Parking',
    'Paid Parking', 'Wifi', 'Vending Machines', 'First Aid Station'
];

export function FacilityProfileForm({ initialData }: FacilityProfileFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [description, setDescription] = useState(initialData.public_description || '');
    const [heroUrl, setHeroUrl] = useState(initialData.hero_image_url || '');
    const [email, setEmail] = useState(initialData.contact_email || '');
    const [phone, setPhone] = useState(initialData.contact_phone || '');
    const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set(initialData.amenities || []));

    const toggleAmenity = (amenity: string) => {
        const next = new Set(selectedAmenities);
        if (next.has(amenity)) {
            next.delete(amenity);
        } else {
            next.add(amenity);
        }
        setSelectedAmenities(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage(null);
        setErrorMessage(null);

        const formData = new FormData();
        formData.append('public_description', description);
        formData.append('hero_image_url', heroUrl);
        formData.append('contact_email', email);
        formData.append('contact_phone', phone);
        formData.append('amenities', JSON.stringify(Array.from(selectedAmenities)));
        // Could expand operating hours dynamically later. For now we will submit empty dict or stringified whatever
        formData.append('operating_hours', JSON.stringify(initialData.operating_hours || {}));

        try {
            const result = await updateFacilityProfile(formData);
            if (result.success) {
                setSuccessMessage('Profile updated successfully!');
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setErrorMessage(result.error || 'Failed to update profile.');
            }
        } catch (error) {
            setErrorMessage('An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
            {/* Context Header */}
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded text-blue-400 text-sm">
                This information is displayed publicly on the PitchSide Marketplace to help teams discover and book your facility.
            </div>

            {/* Basic Info */}
            <div className="space-y-6 bg-pitch-card border border-white/5 p-6 rounded-lg">
                <h3 className="text-xl font-heading font-black italic uppercase text-white mb-4">Marketing Profile</h3>

                <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Hero Image URL
                    </label>
                    <input
                        type="url"
                        value={heroUrl}
                        onChange={(e) => setHeroUrl(e.target.value)}
                        placeholder="https://example.com/stadium-shot.jpg"
                        className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-2">Provide a high-quality, wide-angle shot of your facility for the storefront.</p>
                </div>

                <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Public Description
                    </label>
                    <textarea
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell players what makes your facility the best place to play..."
                        className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors resize-none"
                    />
                </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-6 bg-pitch-card border border-white/5 p-6 rounded-lg">
                <h3 className="text-xl font-heading font-black italic uppercase text-white mb-4">Public Contact Info</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">
                            Booking Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="rentals@scunited.com"
                            className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">
                            Facility Phone
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(555) 123-4567"
                            className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-pitch-accent transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Amenities Grid */}
            <div className="space-y-6 bg-pitch-card border border-white/5 p-6 rounded-lg">
                <h3 className="text-xl font-heading font-black italic uppercase text-white mb-4">Facility Amenities</h3>
                <p className="text-sm text-gray-400 mb-4">Select all features available to players at your location.</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {AVAILABLE_AMENITIES.map(amenity => {
                        const isSelected = selectedAmenities.has(amenity);
                        return (
                            <button
                                key={amenity}
                                type="button"
                                onClick={() => toggleAmenity(amenity)}
                                className={`text-left px-4 py-3 rounded text-sm font-medium transition-all ${isSelected
                                        ? 'bg-pitch-accent text-pitch-black border-transparent shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                                        : 'bg-black/50 border border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                                    }`}
                            >
                                {amenity}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Status Messages */}
            {errorMessage && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    {successMessage}
                </div>
            )}

            {/* Save Action */}
            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-white text-pitch-black px-8 py-3 rounded font-heading font-black italic uppercase tracking-wider hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? (
                        'Saving...'
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Save Profile
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
