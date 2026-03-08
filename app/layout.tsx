import type { Metadata } from "next";
import { Exo_2, IBM_Plex_Mono, Manrope, Prata, Rubik_Mono_One } from "next/font/google";
import { CornerLogoLoop } from "@/app/components/corner-logo-loop";
import "./globals.css";
import "./collage.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const prata = Prata({
  variable: "--font-prata",
  weight: "400",
  subsets: ["latin"],
});

const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin", "cyrillic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
});

const rubikMono = Rubik_Mono_One({
  variable: "--font-rubik-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Lastik",
  description: "Атмосферный сайт Lastik в стиле журнального лендинга",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${prata.variable} ${exo2.variable} ${plexMono.variable} ${rubikMono.variable} antialiased`}>
        <CornerLogoLoop />
        {children}
      </body>
    </html>
  );
}
