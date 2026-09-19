import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { getActiveTheme } from "@/lib/theme/service";

export const metadata: Metadata = {
  title: "Word Quest — WordFind",
  description: "Ứng dụng dò từ vựng tiếng Anh cho học sinh THCS/THPT",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getActiveTheme();

  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeProvider theme={theme}>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
