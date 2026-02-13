import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import CrispInjector from '@/lib/crisp-injector';
import PostHogLayoutClient from '@/lib/posthog-layout-client';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL("https://crec-experts-comptables.majoli.io/"),
  title: "CREC Experts Comptables",
  description: "Pilotez votre entreprise avec sérénité grâce à un accompagnement stratégique, humain et digital.",
  applicationName: "CREC Experts Comptables",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://crec-experts-comptables.majoli.io/",
    languages: undefined,
  },
  openGraph: {
    title: "CREC Experts Comptables",
    description: "Pilotez votre entreprise avec sérénité grâce à un accompagnement stratégique, humain et digital.",
    url: "https://crec-experts-comptables.majoli.io/",
    siteName: "CREC Experts Comptables",
    images: [
      {
        url: "https://app.majoli.io/MajoliHubLogo2.svg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "FR_FR",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "CREC Experts Comptables",
    description: "Pilotez votre entreprise avec sérénité grâce à un accompagnement stratégique, humain et digital.",
    images: ["https://app.majoli.io/MajoliHubLogo2.svg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <CrispInjector
        isEnabled={true}
        websiteId=""
        themeColor=""
      />
      <body className={inter.className}>
      <PostHogLayoutClient siteId="e64668ea-2a54-4a8d-8fd0-0744e429c51a">
          {children}
        </PostHogLayoutClient>
      </body>
    </html>
  );
}