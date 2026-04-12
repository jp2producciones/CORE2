import Sidebar from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <Sidebar />
      <main className="p-4 pt-18 lg:ml-64 lg:p-8">{children}</main>
    </div>
  );
}
