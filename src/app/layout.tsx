import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SelectionProvider } from "./_components/selection-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "norgrade",
  description:
    "The socioeconomic gradient in Norwegian school outcomes, from Statistics Norway's open data.",
};

/**
 * The layout is where `SelectionProvider` belongs: Next keeps it mounted
 * across navigation between the lenses, which is what lets a chosen
 * cross-section outlive the page it was chosen on
 * (src/app/_components/selection-context.tsx). `children` stays a server
 * component -- it is passed through the provider, not rendered inside a
 * client module -- so every route is still prerendered to static HTML.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <SelectionProvider>{children}</SelectionProvider>
      </body>
    </html>
  );
}
