import { STATUS_LABEL } from "@/lib/cashbook";

const STATUS_CLASS: Record<string, string> = {
  lunas: "bg-success-50 text-success-700",
  sebagian: "bg-warning-50 text-warning-700",
  belum: "bg-danger-50 text-danger-700",
  kosong: "bg-gray-100 text-gray-500",
};

/** Status transfer bagi hasil: lunas / sebagian / belum ditransfer. */
export default function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">-</span>;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status] || ""}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function transferStatus(hak: number, dibayar: number): string {
  if (hak <= 0) return "kosong";
  if (dibayar >= hak) return "lunas";
  return dibayar > 0 ? "sebagian" : "belum";
}
