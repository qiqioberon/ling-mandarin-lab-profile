import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ShieldCheck, ExternalLink, RefreshCw, Search, Clock, MessageCircle } from 'lucide-react';

type AdminOrder = {
  orderRef: string;
  buyerEmail: string;
  buyerName: string;
  buyerWhatsapp: string;
  amount: number;
  uniqueCode: number | null;
  expiresAt: string | null;
  productTitle: string;
  proofUrl: string | null;
  createdAt: string;
};

/** Hours until an order expires, or null if no expiry. */
function hoursLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return (new Date(expiresAt).getTime() - Date.now()) / 3600_000;
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

function whatsappMessage(o: AdminOrder, accessUrl: string) {
  return (
    `Halo ${o.buyerName}, pembayaran Anda untuk ${o.productTitle} sudah kami verifikasi. ✅\n\n` +
    `Ini link pribadi untuk membaca e-book Anda (langsung buka, tanpa login):\n${accessUrl}\n\n` +
    `Link ini aktif untuk maksimal 2 perangkat (mis. HP & laptop) — mohon jangan dibagikan.\n` +
    `Kode pesanan: ${o.orderRef}\n\nTerima kasih! 🙏`
  );
}

/** Indonesian mobile → wa.me format: strip non-digits, leading 0 → 62. */
function waPhone(raw: string) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  return d;
}

function waSendLink(o: AdminOrder, accessUrl: string) {
  return `https://wa.me/${waPhone(o.buyerWhatsapp)}?text=${encodeURIComponent(whatsappMessage(o, accessUrl))}`;
}

export default function AdminVerify() {
  const { user, session, loading, signInWithOtpEmail, verifyOtp } = useAuth();

  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [fetching, setFetching] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [resetRef, setResetRef] = useState('');

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const loadOrders = useCallback(async () => {
    if (!session?.access_token) return;
    setFetching(true);
    setForbidden(false);
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 403) {
        setForbidden(true);
        setOrders([]);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat pesanan');
      setOrders(data.orders || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setFetching(false);
    }
  }, [session]);

  useEffect(() => {
    if (user && session) loadOrders();
  }, [user, session, loadOrders]);

  async function resetDevices() {
    if (!session?.access_token || !resetRef.trim()) return;
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderRef: resetRef.trim(), action: 'reset_devices' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
      toast.success('Perangkat direset. Pembeli bisa aktifkan ulang di 2 perangkat baru.');
      setResetRef('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal');
    }
  }

  async function act(orderRef: string, action: 'approve' | 'reject') {
    if (!session?.access_token) return;
    let note: string | undefined;
    if (action === 'reject') {
      note = window.prompt('Alasan penolakan (opsional):') || undefined;
    }
    setBusyRef(orderRef);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderRef, action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses');

      if (action === 'approve') {
        // Delivery is via WhatsApp — open a chat to the buyer prefilled with
        // their private access link (returned by the endpoint) so admin just sends.
        const order = orders.find((o) => o.orderRef === orderRef);
        const accessUrl: string | undefined = data.accessUrl;
        if (order && accessUrl) {
          window.open(waSendLink(order, accessUrl), '_blank', 'noopener,noreferrer');
          await navigator.clipboard.writeText(whatsappMessage(order, accessUrl)).catch(() => {});
          toast.success('Disetujui. WhatsApp dibuka dengan link akses — tinggal kirim.');
        } else {
          toast.success('Disetujui.');
        }
      } else {
        toast.success('Pesanan ditolak.');
      }
      await loadOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal');
    } finally {
      setBusyRef(null);
    }
  }

  // ── Not logged in → OTP form ─────────────────────────────────────────────
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-soft max-w-md w-full">
          <h1 className="text-2xl font-bold text-[#6A2B2B] mb-6 text-center">Admin — Verifikasi</h1>
          {!otpSent ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthBusy(true);
                const { error } = await signInWithOtpEmail(emailInput);
                setAuthBusy(false);
                if (error) toast.error(error.message);
                else {
                  setOtpSent(true);
                  toast.success('Kode OTP dikirim ke email.');
                }
              }}
              className="space-y-4"
            >
              <Input
                type="email"
                placeholder="email admin"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="h-12 bg-sand/30"
              />
              <Button type="submit" disabled={authBusy} className="w-full h-12 bg-[#6A2B2B] hover:bg-[#6A2B2B]/90">
                {authBusy ? 'Mengirim…' : 'Kirim Kode OTP'}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthBusy(true);
                const { error } = await verifyOtp(emailInput, otpInput);
                setAuthBusy(false);
                if (error) toast.error('Kode salah atau kadaluarsa');
              }}
              className="space-y-4"
            >
              <Input
                type="text"
                placeholder="000000"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                className="h-12 bg-sand/30 text-center text-xl tracking-[0.4em] font-mono"
              />
              <Button type="submit" disabled={authBusy} className="w-full h-12 bg-[#6A2B2B] hover:bg-[#6A2B2B]/90">
                {authBusy ? 'Memverifikasi…' : 'Masuk'}
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-sand flex items-center justify-center">Memuat…</div>;
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-soft max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Akun ini bukan admin.</h2>
          <p className="text-muted-foreground text-sm">Masuk dengan akun admin untuk mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-[#6A2B2B]">Verifikasi Pembayaran</h1>
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={fetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? 'animate-spin' : ''}`} /> Muat Ulang
          </Button>
        </div>

        {/* Support tool: free a buyer's device slots so they can re-activate. */}
        <details className="mb-4 bg-white rounded-xl border p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-foreground">Reset perangkat pembeli</summary>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <Input
              value={resetRef}
              onChange={(e) => setResetRef(e.target.value)}
              placeholder="Kode pesanan (mis. LCL-M-…)"
              className="bg-white"
            />
            <Button variant="outline" onClick={resetDevices} disabled={!resetRef.trim()} className="shrink-0">
              Reset 2 perangkat
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Mengosongkan perangkat terikat agar pembeli bisa aktifkan ulang link di 2 perangkat baru (mis. ganti HP/laptop).
          </p>
        </details>

        {/* Match by incoming nominal: type the last 3 digits to isolate a card. */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nominal, mis. 517 atau 62517…"
            className="pl-9 bg-white"
            inputMode="numeric"
          />
        </div>

        {(() => {
          const q = search.trim();
          const filtered = q
            ? orders.filter((o) => String(o.amount).includes(q.replace(/\D/g, '')))
            : orders;
          return orders.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-soft text-center text-muted-foreground">
              Tidak ada pesanan yang menunggu verifikasi. 🎉
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-soft text-center text-muted-foreground">
              Tidak ada nominal yang cocok dengan “{q}”.
            </div>
          ) : (
          <div className="space-y-4">
            {filtered.map((o) => {
              const hrs = hoursLeft(o.expiresAt);
              return (
              <div key={o.orderRef} className="bg-white rounded-2xl shadow-soft p-6 grid md:grid-cols-[160px_1fr] gap-6">
                <div>
                  {o.proofUrl ? (
                    <a href={o.proofUrl} target="_blank" rel="noopener noreferrer" className="block group">
                      <img
                        src={o.proofUrl}
                        alt="Bukti transfer"
                        className="w-full h-40 object-cover rounded-lg border group-hover:opacity-90"
                        onError={(e) => ((e.currentTarget.style.display = 'none'))}
                      />
                      <span className="text-xs text-primary flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3" /> Perbesar / PDF
                      </span>
                    </a>
                  ) : (
                    <div className="w-full h-40 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center text-xs text-red-600 text-center p-2">
                      Tanpa bukti — upload mungkin gagal
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Nominal is the admin's primary matching key → largest element. */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xl font-extrabold text-[#6A2B2B] leading-none">
                      {formatPrice(o.amount)}
                    </span>
                    {hrs !== null && hrs < 2 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                        <Clock className="w-3 h-3" />
                        {hrs <= 0 ? 'kedaluwarsa' : `< ${Math.ceil(hrs)} jam`}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{o.orderRef}</span>
                  <h3 className="font-bold text-foreground">{o.productTitle}</h3>
                  <div className="text-sm text-muted-foreground">
                    <p>{o.buyerName} — {o.buyerEmail}</p>
                    <p>WA: {o.buyerWhatsapp}</p>
                    <p>{new Date(o.createdAt).toLocaleString('id-ID')}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          disabled={busyRef === o.orderRef}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <ShieldCheck className="w-4 h-4 mr-1" /> Setujui
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Setujui pembayaran ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Akses ke <strong>{o.productTitle}</strong> akan diberikan ke{' '}
                            <strong>{o.buyerEmail}</strong>. Tindakan ini <strong>tidak bisa dibatalkan</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => act(o.orderRef, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Ya, setujui
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyRef === o.orderRef}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => act(o.orderRef, 'reject')}
                    >
                      Tolak
                    </Button>

                    <span className="text-xs text-muted-foreground self-center flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" /> Setujui → WhatsApp terbuka dengan link akses
                    </span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
