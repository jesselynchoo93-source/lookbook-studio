import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Lookbook Studio</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/about-lookbooks"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              What is a lookbook?
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="mb-3">
          <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
            V1 / Higgsfield + Nano Banana Pro
          </span>
        </div>
        <h2 className="text-4xl font-bold tracking-tight mb-4">
          Plan a coherent AI fashion lookbook
        </h2>
        <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto leading-relaxed">
          Not six random prompts. One consistent photoshoot with coordinated
          shots that share the same lighting, environment, and realism profile.
        </p>

        <Link
          href="/studio"
          className="inline-block bg-white text-gray-900 font-medium px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors text-base"
        >
          Start Lookbook Plan
        </Link>

        {/* Feature bullets */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">
              Master Shoot DNA
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              One shared visual identity for your entire set. Environment,
              lighting, lens, realism, and branding rules decided once, applied
              everywhere.
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">
              6 Coordinated Shots
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Hero seller, silhouette, branding detail, editorial angle,
              controlled motion, and mood shot. Each explains what it sells and
              why it matters.
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">
              Higgsfield-Ready Briefs
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Short delta briefs built on top of your DNA. Copy them directly
              into your generation workflow. No prompt engineering required.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
