import './styles/globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Saiban Orphan Support Data Collector',
  description: 'Temporary data collection app for orphan registration data',
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
