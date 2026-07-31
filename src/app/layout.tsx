import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { getConvertyStatus } from "@/lib/studio";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Fidely — Studio",
  description: "Fidely growth layer for e-commerce merchants",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const token = jar.get("fidely_session")?.value;

  let shop: { name: string; platform: string; initial: string } | null = null;
  if (token) {
    try {
      const [{ user }, converty] = await Promise.all([
        getSessionUser().then((user) => ({ user })),
        getConvertyStatus().catch(() => null),
      ]);
      const name = user.shopName || user.email;
      const platform = converty?.connected && converty.store?.name ? converty.store.name : "Converty store";
      shop = { name, platform, initial: (name || "?").charAt(0).toUpperCase() };
    } catch {
      shop = null;
    }
  }

  return (
    <html lang="en">
      <body>
        {shop ? (
          <div className="app">
            <Sidebar shop={shop} />
            <div className="main">{children}</div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
