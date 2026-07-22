import "./globals.css";

export const metadata = {
  title: "WONSPAREPARTS Sales Management",
  description: "Sales and inventory management for WONSPAREPARTS using Google Sheets.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
