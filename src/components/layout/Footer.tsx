import Link from "next/link";
import Image from "next/image";

const productLinks = [
  { label: "Image Tools", href: "/image-tools" },
  { label: "PDF Tools", href: "/pdf-tools" },
  { label: "Convert", href: "/convert-tools" },
  { label: "Document Tools", href: "/document-tools" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div className="space-y-3">
          <Link
            href="/"
            aria-label="FileWalaTool Home"
            className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Image
              src="/logo.png"
              alt="FileWalaTool logo"
              width={210}
              height={115}
              className="h-12 w-auto object-contain"
            />
          </Link>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            FileWalaTool provides free online image, PDF, conversion, and document tools.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Product</h2>
          <nav className="mt-3 grid gap-2" aria-label="Product links">
            {productLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Support</h2>
          <nav className="mt-3 grid gap-2" aria-label="Support links">
            {companyLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>&copy; 2026 FileWalaTool. All rights reserved.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end" aria-label="Legal links">
            {legalLinks.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
