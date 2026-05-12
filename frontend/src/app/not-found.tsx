import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs">
        <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-gray-500">ERROR 404</p>
        <h1 className="mb-3 text-3xl font-semibold text-gray-900">Page Not Found</h1>
        <p className="mb-6 text-sm text-gray-600">
          The page you are looking for does not exist or may have moved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/projects">Go to Projects</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
