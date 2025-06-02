// app/layout.tsx
import './globals.css';
import { Source_Sans_3 } from 'next/font/google';
import Head from 'next/head'; 

const sourceSansPro = Source_Sans_3({ subsets: ['latin'], weight: ['400', '600', '700'] });

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
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className={`${sourceSansPro.className} bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
