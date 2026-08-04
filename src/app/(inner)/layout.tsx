import InnerHeader from "@/components/inner/InnerHeader";
import InnerFooter from "@/components/inner/InnerFooter";

export default function InnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="tpl-inner">
      <InnerHeader />
      {children}
      <InnerFooter />
    </div>
  );
}
