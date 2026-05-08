import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userRole={session.user.role} />
      
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 relative">
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          {/* Subtle grid pattern background */}
          <div className="h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        <div className="relative z-10 p-4 md:p-8 max-w-6xl mx-auto">
          {/* Header for mobile */}
          <header className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-border">
            <h1 className="text-xl font-bold text-gradient">SplitNest</h1>
            <div className="text-sm font-medium text-gray-400">Hi, {session.user.name.split(' ')[0]}</div>
          </header>
          
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
