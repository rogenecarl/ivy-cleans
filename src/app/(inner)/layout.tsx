import InnerHeader from "@/components/inner/InnerHeader";
import InnerFooter from "@/components/inner/InnerFooter";

export default function InnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InnerHeader />
      {children}
      <InnerFooter />
    </>
  );
}
