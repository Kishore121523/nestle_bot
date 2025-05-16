// app/layout.tsx
import './globals.css';
import { Poppins } from 'next/font/google';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600'] });

export const metadata = {
  title: 'Nestle Assistant',
  description: "Nestle's AI Assistant Chatbot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.className} bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
