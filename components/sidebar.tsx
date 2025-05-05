'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Truck,
  Settings,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const routes = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      active: pathname === '/dashboard',
    },
    {
      label: 'Products',
      icon: Package,
      href: '/dashboard/products',
      active: pathname === '/dashboard/products',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/dashboard/settings',
      active: pathname === '/dashboard/settings',
    },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-gray-50", className)}>
      <div className="space-y-4 py-4 flex flex-col h-full">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold">
            Navigation
          </h2>
          <div className="space-y-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                  route.active ? "text-primary bg-primary/10" : "text-zinc-700"
                )}
              >
                <div className="flex items-center flex-1">
                  <route.icon className={cn("h-5 w-5 mr-3", route.active ? "text-primary" : "text-zinc-700")} />
                  {route.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 