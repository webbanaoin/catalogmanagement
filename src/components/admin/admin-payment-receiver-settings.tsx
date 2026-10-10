"use client";

import { useEffect, useState, type FormEvent } from "react";

type Receiver = { id: string; name: string; phone: string; upiId: string | null; cashEnabled: boolean; active: boolean };
type Submission = { id: string; officialReceiverId: string | null; amount: string; status: "PENDING" | "APPROVED" | "REJECTED"; method: string; paidAt: string; reference: string | null; shop: {name:string}; recipientNameSnapshot:string };
type History = { id: string; createdAt: string; metadata: unknown; actorUser: { name: string; email: string } | null };
const blank = { id: "", name: "", phone: "", upiId: "", cashEnabled: true, active: true };

export function AdminPaymentReceiverSettings() {
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [submissions,setSubmissions]=useState<Submission[]>([]);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/payment-receivers", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || "Unable to load receivers");
    setReceivers(body.data.receivers);
    setHistory(body.data.history);
    setSubmissions(body.data.submissions);
    setLoading(false);
  }
  useEffect(() => {
    void fetch("/api/admin/payment-receivers", { cache: "no-store" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Unable to load receivers");
        return body;
      })
      .then(body => {
        setReceivers(body.data.receivers);
        setHistory(body.data.history);
        setSubmissions(body.data.submissions);
        setLoading(false);
      })
      .catch(error => { setMessage(String(error)); setLoading(false); });
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm("Update the official payment receiver details? This affects future merchant payments.")) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/payment-receivers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: form.id || undefined, upiId: form.upiId || null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Save failed");
      setMessage("Official payment receiver saved. Changes are recorded in audit history.");
      setForm(blank);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed"); }
    finally { setSaving(false); }
  }
  return <div className="space-y-6">
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      Only these authorized receivers can accept subscription payments. Marketing/referral partners are NEVER authorized to collect money for Webbanao.
    </div>
    {message ? <p role="status" className="rounded-lg border p-3 text-sm">{message}</p> : null}
    <div className="grid gap-4 md:grid-cols-2">
      {loading ? <p>Loading payment receivers…</p> : receivers.map((receiver) => <div key={receiver.id} className="rounded-xl border bg-surface p-5 space-y-2">
        <p className="font-bold">{receiver.name}</p>
        <p>Phone: <a href={`tel:+91${receiver.phone}`} className="underline">{receiver.phone}</a></p>
        <p>UPI: {receiver.upiId ?? "Not configured yet"}</p>
        <p className="text-sm">UPI: {receiver.active && receiver.upiId ? "Available" : "Unavailable"} · Cash: {receiver.active && receiver.cashEnabled ? "Allowed" : "Unavailable"}</p>
        <button type="button" className="rounded-lg border px-4 py-2 text-sm font-semibold" onClick={() => setForm({ ...receiver, upiId: receiver.upiId || "" })}>Edit receiver</button>
      </div>)}
    </div>
    <form onSubmit={save} className="rounded-xl border bg-surface p-5 space-y-4">
      <h2 className="text-lg font-bold">{form.id ? "Edit official receiver" : "Add official receiver"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">Receiver name<input required maxLength={120} className="w-full rounded-lg border p-3" value={form.name} onChange={e => setForm(v => ({...v,name:e.target.value}))} /></label>
        <label className="space-y-1 text-sm">Mobile number<input required pattern="[0-9]{10}" className="w-full rounded-lg border p-3" value={form.phone} onChange={e => setForm(v => ({...v,phone:e.target.value}))} /></label>
        <label className="space-y-1 text-sm sm:col-span-2">UPI ID (leave empty until available)<input className="w-full rounded-lg border p-3" placeholder="name@bank" value={form.upiId} onChange={e => setForm(v => ({...v,upiId:e.target.value}))} /></label>
      </div>
      <label className="mr-5 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm(v=>({...v,active:e.target.checked}))} /> Active</label>
      <label className="text-sm"><input type="checkbox" checked={form.cashEnabled} onChange={e=>setForm(v=>({...v,cashEnabled:e.target.checked}))} /> Authorized to receive cash</label>
      <div className="flex gap-3"><button disabled={saving} className="rounded-lg bg-primary px-5 py-3 font-semibold text-white">{saving ? "Saving…" : "Save receiver"}</button><button type="button" className="rounded-lg border px-4" onClick={()=>setForm(blank)}>Clear</button></div>
    </form>
    <section className="rounded-xl border bg-surface p-5 space-y-4">
      <h2 className="font-bold">Receiver-wise transaction report</h2>
      <p className="text-sm text-muted">Only Admin-approved merchant submissions count as verified collections. These figures are app-recorded, not an automatic Google Pay or bank statement feed. Directly admin-recorded legacy payments are not included.</p>
      <div className="grid gap-3 md:grid-cols-2">{receivers.map(receiver=>{
        const matched=submissions.filter(item=>item.officialReceiverId===receiver.id);
        const approved=matched.filter(item=>item.status==="APPROVED");
        const pending=matched.filter(item=>item.status==="PENDING");
        return <div key={receiver.id} className="rounded-lg border p-4 space-y-2">
          <p className="font-semibold">{receiver.name}</p>
          <p>Verified: <strong>{new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(approved.reduce((sum,item)=>sum+Number(item.amount),0))}</strong> ({approved.length})</p>
          <p>Pending claims: {new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(pending.reduce((sum,item)=>sum+Number(item.amount),0))} ({pending.length})</p>
        </div>;
      })}</div>
      <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Shop</th><th className="p-2">Recipient</th><th className="p-2">Amount</th><th className="p-2">Method</th><th className="p-2">Status</th><th className="p-2">UTR / Receipt</th></tr></thead>
      <tbody>{submissions.map(item=><tr key={item.id} className="border-t"><td className="p-2">{item.shop.name}</td><td className="p-2">{item.recipientNameSnapshot}</td><td className="p-2">₹{item.amount}</td><td className="p-2">{item.method}</td><td className="p-2">{item.status}</td><td className="p-2">{item.reference??"—"}</td></tr>)}</tbody></table></div>
    </section>
    <section className="rounded-xl border bg-surface p-5 space-y-3"><h2 className="font-bold">Receiver change history</h2>
      {history.length===0?<p className="text-sm text-muted">No changes yet.</p>:history.map(item=><details key={item.id} className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer">{new Date(item.createdAt).toLocaleString("en-IN")} · {item.actorUser?.name ?? "Former admin"}</summary>
        <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(item.metadata,null,2)}</pre>
      </details>)}
    </section>
  </div>;
}
