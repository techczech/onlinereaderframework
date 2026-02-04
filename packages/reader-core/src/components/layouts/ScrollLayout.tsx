import React from 'react';

interface ScrollLayoutProps {
  children: React.ReactNode;
}

export function ScrollLayout({ children }: ScrollLayoutProps) {
  return <div className="space-y-6">{children}</div>;
}
