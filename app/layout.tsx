
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Finance | Money Dashboard",
  description:
    "Track salary, expenses, savings and investments in one place.",
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
