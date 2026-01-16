import type { Metadata } from "next";
import "./globals.css";
import { Toast } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Peel - AI Workflow Editor",
  description: "Node-based generative AI workflow editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toast />
      </body>
    </html>
  );
}
