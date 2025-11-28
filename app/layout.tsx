import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام الإشعارات",
  description: "نظام إدارة الإشعارات",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
