"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Pencil, Phone, RefreshCcw, Send, Truck } from "lucide-react";
import { useCan, useDB } from "@/lib/store";
import { vendorRegister } from "@/lib/registers";
import { Button, Empty, PageHeader, Panel, SectionTitle, Segmented } from "@/components/ui";
import { RegisterExport, RegisterTable } from "@/components/register";
import { ReceiveJobDialog, SendJobDialog, VendorDialog } from "@/components/actions";

type F = "out" | "returned" | "all";

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useDB();
  const can = useCan("jobwork.manage");
  const [f, setF] = useState<F>("all");
  const [process, setProcess] = useState("");
  const [dlg, setDlg] = useState<null | "edit" | "send" | { receive: string }>(null);
  const v = db.settings.vendors.find((x) => x.id === id);
  if (!v)
    return (
      <Panel>
        <Empty icon={<Truck className="size-7" />} title="Vendor not found" action={<Button href="/vendors">All vendors</Button>} />
      </Panel>
    );
  const jobs = db.jobWorks.filter((j) => j.vendorId === v.id && (!process || j.process === process));
  const list = jobs.filter((j) => f === "all" || (f === "out" ? !j.returnedAt : !!j.returnedAt));
  const spec = vendorRegister(db, list, {
    title: "Vendor Work Register",
    fileName: `Vendor-register-${v.name.replace(/\s+/g, "-")}`,
    subtitle: `${v.name} · ${v.city} · ${v.phone} · ${f === "all" ? "all challans" : f === "out" ? "currently out" : "returned"}${process ? ` · ${process}` : ""}`,
  });
  const out = jobs.filter((j) => !j.returnedAt);
  const d = typeof dlg === "object" && dlg ? dlg : null;
  return (
    <div>
      <Link href="/vendors" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold">
        <ArrowLeft className="size-4" /> Vendors
      </Link>
      <PageHeader
        kicker={`Job worker · ${v.processes.join(", ")}`}
        title={v.name}
        sub={`${v.city} · ${v.phone}`}
        actions={
          <>
            <Button variant="soft" icon={<Phone className="size-4" />} href={`tel:${v.phone}`}>
              Call
            </Button>
            <Button variant="soft" icon={<MessageCircle className="size-4" />} onClick={() => window.open(`https://wa.me/91${v.phone.slice(-10)}`, "_blank")}>
              WhatsApp
            </Button>
            {can && (
              <Button variant="soft" icon={<Pencil className="size-4" />} onClick={() => setDlg("edit")}>
                Edit
              </Button>
            )}
            {can && (
              <Button variant="gold" icon={<Send className="size-4" />} onClick={() => setDlg("send")}>
                Send work
              </Button>
            )}
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {spec.stats!.map((x) => (
          <Panel key={x.label} className="p-4">
            <div className="font-display tabular text-xl font-semibold break-words sm:text-2xl">{x.value}</div>
            <div className="text-xs text-muted">{x.label}</div>
          </Panel>
        ))}
      </div>

      {can && !!out.length && (
        <Panel className="mb-6 p-5">
          <SectionTitle kicker="With this vendor now" title={`Currently out (${out.length})`} />
          <div className="grid gap-2 md:grid-cols-2">
            {out.map((j) => {
              const p = db.pieces.find((x) => x.id === j.pieceId);
              return (
                <div key={j.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {j.number} · {p?.name}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {j.process} · expected {new Date(j.expectedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </div>
                  </div>
                  <Button size="sm" variant="gold" icon={<RefreshCcw className="size-3.5" />} onClick={() => setDlg({ receive: j.id })}>
                    Receive
                  </Button>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel className="p-5">
        <SectionTitle kicker="Register / history" title="Vendor work register" action={<RegisterExport spec={spec} compact />} />
        <div className="mb-3 flex flex-wrap items-center gap-2 [&>*]:min-w-0">
          <Segmented
            value={f}
            onChange={setF}
            options={[
              { value: "all", label: "All", count: jobs.length },
              { value: "out", label: "Currently out", count: out.length },
              { value: "returned", label: "Returned", count: jobs.length - out.length },
            ]}
          />
          {v.processes.length > 1 && (
            <Segmented
              value={process}
              onChange={setProcess}
              options={[{ value: "", label: "All processes" }, ...v.processes.map((p) => ({ value: p, label: p }))]}
            />
          )}
        </div>
        <RegisterTable spec={spec} empty="No job work with this vendor yet" />
      </Panel>

      <VendorDialog open={dlg === "edit"} onClose={() => setDlg(null)} vendor={v} />
      <SendJobDialog open={dlg === "send"} onClose={() => setDlg(null)} vendorId={v.id} />
      {d && "receive" in d && <ReceiveJobDialog open onClose={() => setDlg(null)} jwId={d.receive} />}
    </div>
  );
}
