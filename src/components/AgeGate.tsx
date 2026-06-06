import { useStore } from "../store/useStore";

export function isAdultContent(data: any): boolean {
  if (!data) return false;
  
  // Explicit TMDB adult flag (Extremely strict 18+ porn/adult content)
  if (data.adult === true) return true;

  // We are removing standard "R" or "TV-MA" from the global age gate because 
  // it flags normal action movies (like Deadpool, Joker, The Boys).
  // Now we ONLY flag extremely explicit adult certifications:
  
  // Movies
  if (data.release_dates?.results) {
    const us = data.release_dates.results.find((r: any) => r.iso_3166_1 === "US");
    const ind = data.release_dates.results.find((r: any) => r.iso_3166_1 === "IN");
    
    if (us?.release_dates) {
      const isAdult = us.release_dates.some((r: any) => r.certification === "NC-17");
      if (isAdult) return true;
    }
    if (ind?.release_dates) {
      const isAdult = ind.release_dates.some((r: any) => r.certification === "A"); // Indian 'A' is strictly adult
      if (isAdult) return true;
    }
  }

  return false;
}

export default function AgeGate({
  data,
  adult,
  children,
}: {
  data?: any;
  adult?: boolean;
  children: React.ReactNode;
}) {
  const { ageConfirmed, confirmAge } = useStore();
  const requiresAgeCheck = adult === true || (data ? isAdultContent(data) : false);

  if (requiresAgeCheck && !ageConfirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center pt-20">
        <div className="glass-strong max-w-md rounded-3xl p-8 neon-border shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500">
            <span className="text-2xl font-black">18+</span>
          </div>
          <h2 className="mb-3 text-2xl font-black">Age Restricted Content</h2>
          <p className="mb-8 text-sm text-zinc-400">
            This title is explicitly rated <strong>18+ Adult (NC-17 / A)</strong> and contains content that is inappropriate for children. You must be at least 18 years old to proceed.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={confirmAge}
              className="rounded-full bg-red-600 px-6 py-3 font-bold transition hover:bg-red-500"
            >
              I Confirm I am 18 or older
            </button>
            <button
              onClick={() => window.history.back()}
              className="rounded-full bg-white/10 px-6 py-3 font-bold transition hover:bg-white/20"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
