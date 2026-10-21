import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniDSP Data Discovery",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="stylesheet" href="https://lepide-design-system.vercel.app/v1/lepidus.css" />
      </head>
      <body className="product-shell">{children}</body>
    </html>
  );
}
