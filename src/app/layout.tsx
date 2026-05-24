
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from '@/hooks/use-language';
import GoogleAnalytics from '@/components/google-analytics';

export const metadata: Metadata = {
  title: 'Pujoপথ',
  description: 'Your Smart Guide to Durga Puja Pandals in Kolkata',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <LanguageProvider>
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
