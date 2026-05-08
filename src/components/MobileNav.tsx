'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet,
  ArrowLeftRight,
  PlusCircle
} from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dash', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Add', href: '/expenses/add', icon: PlusCircle },
    { name: 'History', href: '/expenses', icon: Receipt },
    { name: 'Pay/Get', href: '/balances', icon: Wallet },
    { name: 'Settles', href: '/settlements', icon: ArrowLeftRight },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden bg-black/40 backdrop-blur-xl border-t border-border z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
