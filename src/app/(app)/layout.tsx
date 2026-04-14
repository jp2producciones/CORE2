import BottomNav from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-20">
      <main className="px-4 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}
