import './styles/globals.css';
import { Providers } from './providers';
import logo from '@/assests/logo.png';

export const metadata = {
  title: 'Saiban Orphan Support Data Collector',
  description: 'Temporary data collection app for orphan registration data',
  icons: {
    icon: logo.src,
    apple: logo.src,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevents iOS input zooming which can break layouts
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}