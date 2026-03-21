import Link from "next/link";

export default function AboutLookbooksPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-semibold hover:text-gray-300 transition-colors"
          >
            Lookbook Studio
          </Link>
          <Link
            href="/studio"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Start Planning
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">What is a Lookbook?</h1>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
          <section>
            <p>
              A lookbook is a collection of photographs that showcase a brand's
              products in a consistent visual style. Unlike a product catalog
              (which just shows items on a white background), a lookbook tells a
              story. It shows how pieces look on a person, in context, with
              intentional lighting and mood.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Why Consistency Matters
            </h2>
            <p>
              A good lookbook feels like one photoshoot, not six random images
              stitched together. The lighting should match across shots. The
              background should feel related. The model should look like the same
              person in every frame. When these elements are consistent, the
              viewer trusts the brand and engages with the products.
            </p>
            <p className="mt-3">
              In AI-generated lookbooks, consistency is harder to achieve. Each
              generation is independent, so without careful planning, you end up
              with mismatched lighting, different-looking models, and incoherent
              styling. That is why Lookbook Studio builds a Master Shoot DNA
              first, then creates variations on top of it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              The Six Shot Types
            </h2>
            <p className="mb-4">
              A well-planned lookbook typically includes these types of shots.
              Each serves a different commercial or editorial purpose:
            </p>

            <div className="space-y-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-1">Hero Shot</h3>
                <p className="text-gray-400">
                  The primary product visibility shot. Full-body, front-facing,
                  with the complete garment clearly visible. This is the image
                  that goes on your product page. The buyer sees fit,
                  proportions, and fabric at a glance.
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-1">
                  Silhouette / Fit Shot
                </h3>
                <p className="text-gray-400">
                  Shows the garment's shape from a side or three-quarter angle.
                  Reveals proportions, hem length, and how the fabric drapes on
                  the body. Buyers use this to understand how the piece will look
                  from angles other than the front.
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-1">
                  Branding / Detail Shot
                </h3>
                <p className="text-gray-400">
                  A tight crop on the logo, label, stitching, or construction
                  detail. Shows craftsmanship and brand identity. Particularly
                  important for luxury and premium products where the logo is
                  part of the selling point.
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-1">
                  Editorial Angle Shot
                </h3>
                <p className="text-gray-400">
                  A more creative composition that adds mood and narrative
                  interest. Might include a torso turn, an environmental
                  interaction, or a seated pose. This shot elevates the lookbook
                  beyond a simple catalog.
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-1">
                  Controlled Motion Shot
                </h3>
                <p className="text-gray-400">
                  Shows the garment in subtle movement, like a half stride or a
                  pivot. Buyers see how fabric moves and drapes during natural
                  motion, which static shots cannot convey. Keep the movement
                  controlled to avoid AI artifacts.
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-1">
                  Mood / Supporting Shot
                </h3>
                <p className="text-gray-400">
                  A wider or more atmospheric shot that places the product in a
                  lifestyle context. Often used for social media, brand
                  campaigns, or the opening spread of a digital lookbook. Shows
                  who the product is for and where it belongs.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Generation Order
            </h2>
            <p>
              When generating AI lookbook images, start with the safest,
              most straightforward shots first. The hero and silhouette shots
              have the highest reliability with tools like Higgsfield. These
              anchor shots validate your model, lighting, and garment rendering
              before you attempt more creative or risky compositions.
            </p>
            <p className="mt-3">
              Save editorial and motion shots for later. These are more likely to
              need multiple generation attempts to get right, and you will have a
              better sense of what works after seeing your anchor shots.
            </p>
          </section>

          <div className="pt-4">
            <Link
              href="/studio"
              className="inline-block bg-white text-gray-900 font-medium px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              Start Planning Your Lookbook
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
