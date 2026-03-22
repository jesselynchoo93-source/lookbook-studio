import Link from "next/link";
import StudioShell from "@/components/lookbook/StudioShell";

export default function StudioPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[--border-subtle] bg-[--surface-card]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-lg font-semibold text-[--text-primary] hover:opacity-70 transition-opacity"
            >
              Lookbook Studio
            </Link>
            <span className="text-xs text-[--text-tertiary] bg-[--surface-inset] px-2 py-0.5 rounded">
              v1
            </span>
          </div>
          <Link
            href="/about-lookbooks"
            className="text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
          >
            What is a lookbook?
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <StudioShell />
      </main>
    </div>
  );
}
