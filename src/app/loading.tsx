import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-pitch-black pt-20">
      {/* Hero Section Skeleton */}
      <section className="relative px-6 md:px-12 pt-12 md:pt-24 pb-16 md:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[70vh]">
        <div className="relative z-10 w-full max-w-5xl mx-auto text-center">
          <div className="h-12 md:h-20 bg-white/5 animate-pulse rounded-sm w-3/4 mx-auto mb-6"></div>
          <div className="h-6 md:h-8 bg-white/5 animate-pulse rounded-sm w-1/2 mx-auto mb-10"></div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="h-14 w-48 bg-pitch-accent/50 animate-pulse rounded-sm"></div>
            <div className="h-14 w-48 bg-white/5 animate-pulse rounded-sm"></div>
          </div>
        </div>

        {/* Hero Image Skeleton */}
        <div className="relative z-10 w-full max-w-5xl mx-auto mt-16 rounded-sm overflow-hidden border border-white/10 shadow-2xl animate-pulse bg-white/5 aspect-[21/9]">
        </div>
      </section>

      {/* Featured Games Preview Skeleton */}
      <section className="pt-8 pb-12 md:pb-20 px-6 bg-pitch-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div className="h-10 md:h-12 bg-white/5 animate-pulse rounded-sm w-64"></div>
            <div className="h-10 w-24 bg-pitch-accent/20 animate-pulse rounded-sm"></div>
          </div>

          <div className="flex overflow-x-hidden -mx-6 px-6 gap-6 md:grid md:grid-cols-3 md:pb-0 md:mx-0 md:px-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="min-w-[85vw] md:min-w-0 flex flex-col h-[400px] bg-pitch-card rounded-sm border border-white/5 animate-pulse p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-6 bg-white/5 rounded w-1/3"></div>
                  <div className="h-6 bg-white/5 rounded w-1/4"></div>
                </div>
                <div className="h-8 bg-white/5 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-white/5 rounded w-1/2 mb-8"></div>
                
                <div className="mt-auto space-y-4">
                  <div className="h-4 bg-white/5 rounded w-full"></div>
                  <div className="h-4 bg-white/5 rounded w-5/6"></div>
                </div>
                <div className="h-12 bg-white/10 rounded w-full mt-6"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
