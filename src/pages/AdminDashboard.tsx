import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RefreshCw, ExternalLink, MessageCircle, Search, ShieldCheck } from 'lucide-react';

type Order = {
  orderRef: string;
  buyerEmail: string;
  buyerName: string;
  buyerWhatsapp: string;
  amount: number;
  uniqueCode: number | null;
  status: string;
  paymentMethod: string | null;
  productTitle: string;
  proofUrl: string | null;
  createdAt: string;
};

const formatPrice = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

/** Indonesian mobile → wa.me format: strip non-digits, leading 0 → 62. */
function waPhone(raw: string) {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  return d;
}

function deliveryMessage(o: Order, accessUrl: string) {
  return (
    `Halo ${o.buyerName}, pembayaran Anda untuk ${o.productTitle} sudah kami verifikasi. ✅\n\n` +
    `Ini link pribadi untuk membaca e-book Anda (langsung buka, tanpa login):\n${accessUrl}\n\n` +
    `Link ini aktif untuk maksimal 3 perangkat (mis. HP & laptop) — mohon jangan dibagikan.\n` +
    `Kode pesanan: ${o.orderRef}\n\nTerima kasih! 🙏`
  );
}

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700 border-green-200',
  awaiting_verification: 'bg-amber-100 text-amber-700 border-amber-200',
  rejected: 'bg-red-100 text-red-600 border-red-200',
};
const STATUS_LABEL: Record<string, string> = {
  paid: 'Lunas',
  awaiting_verification: 'Menunggu verifikasi',
  rejected: 'Ditolak',
};

export default function AdminDashboard() {
  // Credentials are kept only in this tab's sessionStorage.
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [authed, setAuthed] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState('');
  const [busyRef, setBusyRef] = useState<string | null>(null);

  const load = useCallback(
    async (u: string, p: string) => {
      setFetching(true);
      try {
        const res = await fetch('/api/admin/dashboard', {
          headers: { 'x-admin-user': u, 'x-admin-password': p },
        });
        // Server may return non-JSON on a crash (e.g. missing env) — read text
        // first so the real message shows instead of "Unexpected token".
        const raw = await res.text();
        let data: { error?: string; orders?: Order[] } = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error(raw.slice(0, 200) || `Server error (${res.status})`);
        }
        if (res.status === 401) {
          setAuthed(false);
          sessionStorage.removeItem('admin_dash');
          throw new Error(data.error || 'Login gagal');
        }
        if (!res.ok) throw new Error(data.error || 'Gagal memuat data');
        setOrders(data.orders || []);
        setAuthed(true);
        sessionStorage.setItem('admin_dash', JSON.stringify({ u, p }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal');
      } finally {
        setFetching(false);
      }
    },
    []
  );

  async function act(o: Order, action: 'approve' | 'reject') {
    if (action === 'approve' && !window.confirm(`Setujui pembayaran ${o.buyerName} (${formatPrice(o.amount)}) dan buat link akses? Tindakan ini tidak bisa dibatalkan.`)) return;
    let note: string | undefined;
    if (action === 'reject') {
      note = window.prompt('Alasan penolakan (opsional):') || undefined;
    }
    setBusyRef(o.orderRef);
    try {
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-user': user, 'x-admin-password': pass },
        body: JSON.stringify({ orderRef: o.orderRef, action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses');

      if (action === 'approve' && data.accessUrl) {
        window.open(`https://wa.me/${waPhone(o.buyerWhatsapp)}?text=${encodeURIComponent(deliveryMessage(o, data.accessUrl))}`, '_blank', 'noopener,noreferrer');
        await navigator.clipboard.writeText(data.accessUrl).catch(() => {});
        toast.success('Disetujui. WhatsApp terbuka dengan link akses — tinggal kirim. Link juga tersalin.');
      } else {
        toast.success('Pesanan ditolak.');
      }
      await load(user, pass);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal');
    } finally {
      setBusyRef(null);
    }
  }

  // Restore a session if the tab was reloaded.
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_dash');
    if (saved) {
      const { u, p } = JSON.parse(saved);
      setUser(u);
      setPass(p);
      load(u, p);
    }
  }, [load]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(user, pass);
          }}
          className="bg-white p-8 rounded-2xl shadow-soft max-w-sm w-full space-y-4"
        >
          <h1 className="text-2xl font-bold text-[#6A2B2B] text-center">Dashboard Admin</h1>
          <Input placeholder="Username" value={user} onChange={(e) => setUser(e.target.value)} className="h-12 bg-sand/30" autoComplete="username" />
          <Input type="password" placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} className="h-12 bg-sand/30" autoComplete="current-password" />
          <Button type="submit" disabled={fetching} className="w-full h-12 bg-[#6A2B2B] hover:bg-[#6A2B2B]/90">
            {fetching ? 'Memuat…' : 'Masuk'}
          </Button>
        </form>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? orders.filter(
        (o) =>
          o.buyerName.toLowerCase().includes(q) ||
          o.buyerEmail.toLowerCase().includes(q) ||
          o.buyerWhatsapp.includes(q.replace(/\D/g, '')) ||
          String(o.amount).includes(q.replace(/\D/g, '')) ||
          o.orderRef.toLowerCase().includes(q)
      )
    : orders;

  return (
    <div className="min-h-screen bg-sand py-10 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-[#6A2B2B]">Rekap Pesanan</h1>
          <Button variant="outline" size="sm" onClick={() => load(user, pass)} disabled={fetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? 'animate-spin' : ''}`} /> Muat Ulang
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, no. WA, nominal, atau kode pesanan…"
            className="pl-9 bg-white"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-soft text-center text-muted-foreground">
            Belum ada pesanan.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((o) => (
              <div key={o.orderRef} className="bg-white rounded-2xl shadow-soft p-5 grid md:grid-cols-[140px_1fr] gap-5">
                <div>
                  {o.proofUrl ? (
                    <a href={o.proofUrl} target="_blank" rel="noopener noreferrer" className="block group">
                      <img
                        src={o.proofUrl}
                        alt="Bukti transfer"
                        className="w-full h-36 object-cover rounded-lg border group-hover:opacity-90"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                      <span className="text-xs text-primary flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3" /> Perbesar / PDF
                      </span>
                    </a>
                  ) : (
                    <div className="w-full h-36 bg-muted rounded-lg border flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                      Tanpa bukti
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-2xl font-extrabold text-[#6A2B2B] leading-none">{formatPrice(o.amount)}</span>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${STATUS_STYLE[o.status] || 'bg-muted text-muted-foreground'}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{o.orderRef}</span>
                  <h3 className="font-bold text-foreground">{o.productTitle}</h3>
                  <div className="text-sm text-muted-foreground">
                    <p>{o.buyerName} — {o.buyerEmail}</p>
                    <p>WA: {o.buyerWhatsapp} · {o.paymentMethod?.toUpperCase() || '—'}</p>
                    <p>{new Date(o.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2">
                    {o.status === 'awaiting_verification' && (
                      <>
                        <Button size="sm" disabled={busyRef === o.orderRef} onClick={() => act(o, 'approve')} className="bg-green-600 hover:bg-green-700 text-white">
                          <ShieldCheck className="w-4 h-4 mr-1" /> Setujui &amp; kirim link
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyRef === o.orderRef} onClick={() => act(o, 'reject')} className="border-red-200 text-red-600 hover:bg-red-50">
                          Tolak
                        </Button>
                      </>
                    )}
                    {o.status === 'paid' && (
                      <Button size="sm" disabled={busyRef === o.orderRef} onClick={() => act(o, 'approve')} className="bg-green-600 hover:bg-green-700 text-white">
                        <ShieldCheck className="w-4 h-4 mr-1" /> Kirim ulang link
                      </Button>
                    )}
                    <a href={`https://wa.me/${waPhone(o.buyerWhatsapp)}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <MessageCircle className="w-4 h-4 mr-1" /> Chat WA
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
