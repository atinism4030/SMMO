import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'SMMO — Social Media Management Organization',
  description: 'Internal business management system for social media agencies',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#14141f',
              color: '#e2e8f0',
              border: '1px solid #1e1e35',
            },
          }}
        />
      </body>
    </html>
  );
}
