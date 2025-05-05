'use client';

import { useState, useEffect } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { Footer } from './footer';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt + key combinations
      if (e.altKey) {
        switch (e.key) {
          case 'd':
            window.location.href = '/';
            break;
          case 'p':
            window.location.href = '/products';
            break;
          case 'o':
            window.location.href = '/orders';
            break;
          case 'c':
            window.location.href = '/couriers';
            break;
          case '/':
            setShortcuts(!shortcuts);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        <main 
          id="main-content" 
          className="flex-1 px-4 py-8 md:px-6 overflow-x-hidden"
          role="main"
          aria-label="Main content"
        >
          <div className="page-transition">
            {children}
          </div>
        </main>
      </div>
      <Footer />

      {/* Keyboard shortcuts help dialog */}
      {shortcuts && (
        <div
          role="dialog"
          aria-label="Keyboard shortcuts"
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={() => setShortcuts(false)}
        >
          <div 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                       bg-card p-6 rounded-lg shadow-lg max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt><kbd className="px-2 py-1 bg-muted rounded">Alt + D</kbd></dt>
                <dd>Go to Dashboard</dd>
              </div>
              <div className="flex justify-between">
                <dt><kbd className="px-2 py-1 bg-muted rounded">Alt + P</kbd></dt>
                <dd>Go to Products</dd>
              </div>
              <div className="flex justify-between">
                <dt><kbd className="px-2 py-1 bg-muted rounded">Alt + O</kbd></dt>
                <dd>Go to Orders</dd>
              </div>
              <div className="flex justify-between">
                <dt><kbd className="px-2 py-1 bg-muted rounded">Alt + C</kbd></dt>
                <dd>Go to Couriers</dd>
              </div>
              <div className="flex justify-between">
                <dt><kbd className="px-2 py-1 bg-muted rounded">Alt + /</kbd></dt>
                <dd>Toggle this help dialog</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}