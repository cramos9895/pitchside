import Link from 'next/link';
import { MapPin } from 'lucide-react';

interface PublicFacilityCardProps {
    facility: {
        id: string;
        slug: string;
        name: string;
        city: string;
        state: string;
        hero_image_url: string | null;
        amenities: string[];
        public_description: string | null;
    };
}

export function PublicFacilityCard({ facility }: PublicFacilityCardProps) {
    // Determine the main display tag
    const mainAmenity = facility.amenities && facility.amenities.length > 0
        ? facility.amenities[0]
        : null;

    return (
        <Link
            href={`/facility/${facility.slug}`}
            className="group block bg-pitch-card border border-white/5 rounded-xl overflow-hidden hover:border-pitch-accent/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(204,255,0,0.1)] hover:-translate-y-1"
        >
            {/* Image Banner */}
            <div className="relative h-48 w-full bg-slate-900 border-b border-white/5 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:20px_20px]"></div>

                {facility.hero_image_url ? (
                    <img
                        src={facility.hero_image_url}
                        alt={facility.name}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-pitch-black via-slate-900 to-pitch-accent/10 group-hover:scale-105 transition-all duration-700"></div>
                )}

                {/* Optional Tag overlay */}
                {mainAmenity && (
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                        {mainAmenity}
                    </div>
                )}
            </div>

            {/* Content Details */}
            <div className="p-6">
                <h3 className="text-xl font-heading font-black italic uppercase tracking-tight text-white mb-2 group-hover:text-pitch-accent transition-colors">
                    {facility.name}
                </h3>

                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <MapPin className="w-4 h-4 text-pitch-secondary" />
                    <span>{facility.city}, {facility.state}</span>
                </div>

                {facility.public_description && (
                    <p className="text-sm text-gray-300 line-clamp-2 mb-4 leading-relaxed opacity-80">
                        {facility.public_description}
                    </p>
                )}

                {/* Additional Amenities Pills */}
                {facility.amenities && facility.amenities.length > 1 && (
                    <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-white/5">
                        {facility.amenities.slice(1, 4).map(amenity => (
                            <span
                                key={amenity}
                                className="text-xs bg-white/5 text-gray-400 border border-white/10 px-2 py-1 rounded"
                            >
                                {amenity}
                            </span>
                        ))}
                        {facility.amenities.length > 4 && (
                            <span className="text-xs text-gray-500 py-1 font-bold">
                                +{facility.amenities.length - 4} more
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Link>
    );
}
