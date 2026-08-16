import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto shrink-0 border-t border-line bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2 text-sm">
          <p className="font-medium text-paper">Fisheries Quota Exchange</p>
          <p className="text-paper/70">Australia · Development site. Not a live market.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <Link href="/about" className="text-paper/75 hover:text-paper">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-paper/75 hover:text-paper">
                Contact us
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
