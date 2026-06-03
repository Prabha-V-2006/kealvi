import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        
        {/* NAVBAR */}
        <nav className="flex gap-6 p-4 border-b bg-white">
          <Link href="/" className="font-semibold text-blue-600">
            Q&A
          </Link>

          <Link href="/polls" className="font-semibold text-blue-600">
            Polls
          </Link>
        </nav>

        {/* PAGE CONTENT */}
        {children}
      </body>
    </html>
  );
}