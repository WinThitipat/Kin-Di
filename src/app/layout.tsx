import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'กินดิ! — KIN DI | คิดไม่ออก ก็สุ่มดิ! (Stop thinking. Start eating.)',
  description:
    'กินดิ! — KIN DI ระบบสุ่มไพ่เมนูอาหาร ค้นหาเมนูจากวัตถุดิบในตู้เย็น และคัดกรองสารก่อภูมิแพ้อย่างปลอดภัย',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
