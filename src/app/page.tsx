import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[--border-subtle] bg-[--surface-card]/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[--text-primary]">Lookbook Studio</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/about-lookbooks"
              className="text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
            >
              What is a lookbook?
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="mb-3">
          <span className="text-xs text-[--text-tertiary] bg-[--surface-inset] px-3 py-1 rounded-full">
            V1 / Higgsfield + Nano Banana Pro
          </span>
        </div>
        <h2 className="text-4xl font-bold tracking-tight text-[--text-primary] mb-4">
          Plan a coherent AI fashion lookbook
        </h2>
        <p className="text-lg text-[--text-secondary] mb-8 max-w-xl mx-auto leading-relaxed">
          Not six random prompts. One consistent photoshoot with coordinated
          shots that share the same lighting, environment, and realism profile.
        </p>

        <Link
          href="/studio"
          className="inline-block bg-[--text-primary] text-[--text-inverted] font-medium px-8 py-3 rounded-lg hover:opacity-90 transition-opacity text-base"
        >
          Start Lookbook Plan
        </Link>

        {/* Feature bullets */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-[--surface-card] rounded-xl p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="text-sm font-semibold text-[--text-primary] mb-2">
              Master Shoot DNA
            </h3>
            <p className="text-xs text-[--text-secondary] leading-relaxed">
              One shared visual identity for your entire set. Environment,
              lighting, lens, realism, and branding rules decided once, applied
              everywhere.
            </p>
          </div>
          <div className="bg-[--surface-card] rounded-xl p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="text-sm font-semibold text-[--text-primary] mb-2">
              6 Coordinated Shots
            </h3>
            <p className="text-xs text-[--text-secondary] leading-relaxed">
              Hero seller, silhouette, branding detail, editorial angle,
              controlled motion, and mood shot. Each explains what it sells and
              why it matters.
            </p>
          </div>
          <div className="bg-[--surface-card] rounded-xl p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="text-sm font-semibold text-[--text-primary] mb-2">
              Higgsfield-Ready Briefs
            </h3>
            <p className="text-xs text-[--text-secondary] leading-relaxed">
              Short delta briefs built on top of your DNA. Copy them directly
              into your generation workflow. No prompt engineering required.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
