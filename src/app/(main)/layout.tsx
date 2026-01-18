import { MainHeader } from "@/components/home/MainHeader";
import { MainFooter } from "@/components/home/MainFooter";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MainHeader />
      <main className="flex-1 bg-white">{children}</main>
      <MainFooter />
    </div>
  );
}
