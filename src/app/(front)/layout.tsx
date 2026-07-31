import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function FrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopBar />
      <Header />
      {children}
      <Footer />
    </>
  );
}
