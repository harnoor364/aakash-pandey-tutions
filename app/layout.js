import "./globals.css";
import { siteConfig } from "@/lib/siteConfig";

export const metadata = {
  title: `${siteConfig.tutorName} — Physics & Chemistry Tutor for Class 11 & 12`,
  description:
    "Personalised Physics & Chemistry coaching for Class 11, 12, JEE and NEET aspirants, with an AI-powered test paper analyzer to track and fix weak topics.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
