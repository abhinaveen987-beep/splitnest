'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  ArrowLeftRight, 
  LogOut, 
  Users,
  PlusCircle
} from 'lucide-react';

export default function Sidebar({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Add Expense', href: '/expenses/add', icon: PlusCircle },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Pay & Get', href: '/balances', icon: Wallet },
    { name: 'Settlements', href: '/settlements', icon: ArrowLeftRight },
  ];

  if (userRole === 'ADMIN') {
    navItems.push({ name: 'Manage Users', href: '/admin/users', icon: Users });
  }

  return (
    <div className="w-64 h-screen hidden md:flex flex-col border-r border-border bg-black/20 backdrop-blur-xl">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-tr from-primary to-blue-500 rounded-lg flex items-center justify-center">
          <Wallet className="text-white w-4 h-4" />
        </div>
        <span className="text-xl font-bold text-gradient">SplitNest</span>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
