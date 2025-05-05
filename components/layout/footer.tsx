export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto px-4 py-6 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-gray-600">
            © 2025 wcms. All rights reserved.
          </p>
          <nav className="flex gap-4">
            <a
              className="text-sm text-gray-600 hover:text-gray-900"
              href="/privacy-policy"
            >
              Privacy Policy
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}