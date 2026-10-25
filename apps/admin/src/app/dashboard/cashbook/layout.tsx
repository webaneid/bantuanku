import CashbookLayoutNav from "@/components/cashbook/CashbookLayoutNav";

export default function CashbookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <CashbookLayoutNav />
      <div className="mt-2">{children}</div>
    </div>
  );
}
