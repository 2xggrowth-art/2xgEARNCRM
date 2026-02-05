'use client';

import { ReactNode } from 'react';
import MobileBottomNav from './MobileBottomNav';

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export default function MobileLayout({ children, showBottomNav = true }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className={showBottomNav ? 'pb-24' : ''}>
        {children}
      </div>
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}
