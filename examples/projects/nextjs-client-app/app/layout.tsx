import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'gif2vid - Client-Side Next.js Example',
  description:
    'Convert GIF animations to MP4 videos entirely in the browser using WebCodecs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
