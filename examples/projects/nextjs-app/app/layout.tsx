import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'gif2vid - Next.js Example',
  description: 'Convert GIF animations to MP4 videos using gif2vid with Next.js',
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
