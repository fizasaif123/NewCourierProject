'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Warehouse, Package, LogOut, Home, Truck, MapPin, FileText, Boxes, User, BarChart3, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const user = localStorage.getItem('currentUser');
    if (!user) {
      toast.error('Please sign in to access the dashboard');
      router.push('/auth/login');
      return;
    }

    try {
      const userData = JSON.parse(user);
      if (!userData.email) {
        toast.error('Invalid user data. Please sign in again');
        handleLogout();
        return;
      }
      setUsername(userData.email.split('@')[0]);
    } catch (error) {
      console.error('Error parsing user data:', error);
      toast.error('Session error. Please sign in again');
      handleLogout();
      return;
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/auth/login');
  };

  const navGroups = [
    {
      heading: 'MAIN',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: Home, shortcut: 'Ctrl+D' },
        { name: 'Live Tracking', href: '/dashboard/live-tracking', icon: MapPin, shortcut: 'Ctrl+L' },
      ],
    },
    {
      heading: 'WAREHOUSE',
      items: [
        { name: 'Inventories', href: '/dashboard/inventories', icon: Package, shortcut: 'Ctrl+I' },
        { name: 'Warehouses', href: '/dashboard/warehouses', icon: Warehouse, shortcut: 'Ctrl+W' },
        { name: 'Warehouse Operations', href: '/dashboard/warehouse-operations', icon: Boxes, shortcut: 'Ctrl+O' },
      ],
    },
    {
      heading: 'TRANSPORT',
      items: [
        { name: 'Courier Management', href: '/dashboard/couriers', icon: Truck, shortcut: 'Ctrl+C' },
      ],
    },
    {
      heading: 'BUSINESS',
      items: [
        { name: 'Customers', href: '/dashboard/customers', icon: User, shortcut: '' },
        { name: 'Reports', href: '/dashboard/reports', icon: FileText, shortcut: '' },
      ],
    },
  ];

  // Show nothing while checking authentication
  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 min-h-screen flex flex-col px-6 py-8 bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl border border-blue-100 fixed">
          {/* Profile Card */}
          <div className="flex flex-col items-center mb-8">
            <span className="font-extrabold text-2xl text-blue-700 flex items-center gap-2 tracking-tight select-none mb-2">
              OMNI<span className="text-blue-500">-WTMS</span>
            </span>
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700 mb-2">
              {username ? username[0].toUpperCase() : 'K'}
            </div>
            <div className="text-sm font-medium text-gray-700 mb-1">Welcome, {username || 'User'}!</div>
          </div>
          {/* Logout at top */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all mb-6"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden md:inline">Logout</span>
          </button>
          {/* Navigation Groups */}
          <nav className="flex-1 flex flex-col gap-4">
            {navGroups.map(group => (
              <div key={group.heading}>
                <div className="text-xs font-semibold text-blue-400 mb-2 pl-2 tracking-widest">{group.heading}</div>
                <div className="flex flex-col gap-1">
                  {group.items.map(item => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`relative flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-150 group text-sm ${isActive ? 'bg-gradient-to-r from-blue-100 to-white text-blue-700 font-semibold shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:scale-[1.03]'} `}
                        style={{ boxShadow: isActive ? '0 2px 8px 0 rgba(59,130,246,0.08)' : undefined }}
                      >
                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-blue-600 rounded-r-lg" />}
                        <item.icon className="h-5 w-5 mr-3 z-10" />
                        <span className="z-10 flex-1">{item.name}</span>
                        {item.shortcut && <span className="ml-2 text-xs text-blue-400 font-mono bg-blue-50 px-2 py-0.5 rounded">{item.shortcut}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          {/* Settings at bottom */}
          <div className="mt-8 flex items-center gap-2 justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all">
              <Settings className="h-5 w-5" />
              <span className="hidden md:inline">Settings</span>
            </button>
          </div>
        </aside>
        {/* Main Content */}
        <div className="flex-1 p-8 ml-72">
          {children}
        </div>
      </div>
    </div>
  );
} 