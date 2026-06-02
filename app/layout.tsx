import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { EditorProvider } from "./components/EditorContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Smart AI Image Editor",
  description: "Describe image edits in plain language and generate with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <EditorProvider>{children}</EditorProvider>
      </body>
    </html>
  );
}
