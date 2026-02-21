'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { Loader2, Save, Image as ImageIcon, LayoutTemplate } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface SiteContent {
    id: number;
    hero_headline: string;
    hero_subtext: string;
    hero_image_url: string;
    how_it_works_image_url: string;
    testimonial_text: string;
}

export function SiteEditor() {
    const [content, setContent] = useState<SiteContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // File inputs refs
    const heroImageRef = useRef<HTMLInputElement>(null);
    const howItWorksImageRef = useRef<HTMLInputElement>(null);

    const [uploadingHero, setUploadingHero] = useState(false);
    const [uploadingHow, setUploadingHow] = useState(false);

    const supabase = createClient();
    const { success, error: toastError } = useToast();

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('site_content')
                .select('*')
                .eq('id', 1)
                .single();

            if (data) setContent(data);
            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching site content:', error);
                toastError("Failed to load site content. Please check Database RLS.");
            }
            setLoading(false);
        };

        fetchContent();
    }, [supabase, toastError]);

    const handleTextChange = (field: keyof SiteContent, value: string) => {
        if (!content) return;
        setContent({ ...content, [field]: value });
    };

    const handleSave = async () => {
        if (!content) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('site_content')
                .update({ ...content, updated_at: new Date().toISOString() })
                .eq('id', 1);

            if (error) throw error;
            success("Site content updated successfully!");
        } catch (err: any) {
            toastError(err.message || 'Failed to update site content.');
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'hero_image_url' | 'how_it_works_image_url') => {
        const file = event.target.files?.[0];
        if (!file || !content) return;

        const isHero = field === 'hero_image_url';
        isHero ? setUploadingHero(true) : setUploadingHow(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${field}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('public-assets')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('public-assets')
                .getPublicUrl(filePath);

            setContent({ ...content, [field]: publicUrl });
            success("Image uploaded. Remember to save your changes.");
        } catch (err: any) {
            toastError("Failed to upload image: " + err.message);
        } finally {
            isHero ? setUploadingHero(false) : setUploadingHow(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 text-white">
                <Loader2 className="animate-spin w-8 h-8 text-pitch-accent" />
            </div>
        );
    }

    if (!content) {
        return <div className="text-gray-400 text-center py-12">Content not found. Make sure the database fix script was run.</div>;
    }

    return (
        <div className="bg-pitch-card border border-white/5 rounded-lg p-6 space-y-8 mt-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                    <h2 className="font-oswald text-xl font-bold uppercase flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-pitch-accent" />
                        Site Editor
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Update the main landing page text and imagery.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-pitch-accent text-pitch-black font-bold uppercase tracking-wider rounded text-sm hover:bg-white transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <h3 className="font-heading text-lg font-bold uppercase text-pitch-accent mb-4">Hero Section</h3>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">Headline</label>
                            <textarea
                                value={content.hero_headline}
                                onChange={(e) => handleTextChange('hero_headline', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors min-h-[80px]"
                                placeholder="Main headline text..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">Subtext</label>
                            <textarea
                                value={content.hero_subtext}
                                onChange={(e) => handleTextChange('hero_subtext', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors min-h-[80px]"
                                placeholder="Secondary text under the headline..."
                            />
                        </div>

                        <div className="space-y-1 relative">
                            <label className="text-xs font-bold uppercase text-gray-500">Hero Background Image</label>
                            {content.hero_image_url && (
                                <div className="mb-2 relative aspect-[21/9] w-full max-w-lg bg-gray-900 rounded overflow-hidden border border-white/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={content.hero_image_url} alt="Hero Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={heroImageRef}
                                onChange={(e) => handleImageUpload(e, 'hero_image_url')}
                            />
                            <button
                                onClick={() => heroImageRef.current?.click()}
                                disabled={uploadingHero}
                                className="w-full max-w-lg flex justify-center items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded text-xs font-bold uppercase"
                            >
                                {uploadingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                {uploadingHero ? "Uploading..." : content.hero_image_url ? "Replace Image" : "Upload Hero Image"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <h3 className="font-heading text-lg font-bold uppercase text-pitch-accent mb-4">"How It Works" Graphic</h3>
                    <div className="space-y-1 relative">
                        <label className="text-xs font-bold uppercase text-gray-500">Instructional Image</label>
                        {content.how_it_works_image_url && (
                            <div className="mb-2 relative aspect-video w-full max-w-lg bg-gray-900 rounded overflow-hidden border border-white/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={content.how_it_works_image_url} alt="How It Works Preview" className="w-full h-full object-contain" />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={howItWorksImageRef}
                            onChange={(e) => handleImageUpload(e, 'how_it_works_image_url')}
                        />
                        <button
                            onClick={() => howItWorksImageRef.current?.click()}
                            disabled={uploadingHow}
                            className="w-full max-w-lg flex justify-center items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded text-xs font-bold uppercase"
                        >
                            {uploadingHow ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            {uploadingHow ? "Uploading..." : content.how_it_works_image_url ? "Replace Image" : "Upload Instructional Image"}
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <h3 className="font-heading text-lg font-bold uppercase text-pitch-accent mb-4">Testimonial</h3>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-gray-500">Quote</label>
                        <textarea
                            value={content.testimonial_text}
                            onChange={(e) => handleTextChange('testimonial_text', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-pitch-accent transition-colors min-h-[100px] font-medium"
                            placeholder="Enter user testimonial here..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
