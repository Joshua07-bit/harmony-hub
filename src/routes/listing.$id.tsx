import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/listing/$id")({
  component: ListingDetail,
  head: () => ({
    meta: [
      { title: "Boarding house · Nestly" },
      { name: "description", content: "See photos, amenities, and reviews for this boarding house." },
      { property: "og:title", content: "Boarding house · Nestly" },
      { property: "og:description", content: "See photos, amenities, and reviews for this boarding house." },
    ],
  }),
});

function ListingDetail() {
  const { id } = Route.useParams();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", data.landlord_id)
        .maybeSingle();
      return { ...data, profiles: prof } as any;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, tenant_id")
        .eq("listing_id", id)
        .order("created_at", { ascending: false });
      if (!data) return [];
      const ids = Array.from(new Set(data.map((r) => r.tenant_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as { id: string; full_name: string | null }[] };
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return data.map((r) => ({ ...r, profiles: map.get(r.tenant_id) ?? null }));
    },
  });


  const avg = reviews && reviews.length > 0
    ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
    : null;

  if (isLoading || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  const cover =
    listing.images?.[0] ||
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=60";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link to="/browse" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="overflow-hidden rounded-3xl shadow-elevated">
          <img src={cover} alt={listing.title} className="aspect-[16/9] w-full object-cover" />
        </div>

        {listing.images?.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {listing.images.slice(1, 5).map((src: string, i: number) => (
              <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-bold sm:text-4xl">{listing.title}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {listing.address}, {listing.city}
                </p>
              </div>
              {avg !== null && (
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-3 py-1.5 text-sm font-semibold text-warning-foreground">
                  <Star className="h-4 w-4 fill-warning text-warning" /> {avg.toFixed(1)}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs capitalize text-secondary-foreground">
                {listing.room_type.replace("-", " ")}
              </span>
              {listing.amenities?.map((a: string) => (
                <span key={a} className="rounded-full bg-accent px-3 py-1 text-xs capitalize text-accent-foreground">
                  {a}
                </span>
              ))}
            </div>

            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold">About this place</h2>
              <p className="mt-3 whitespace-pre-line text-foreground/90">{listing.description}</p>
            </div>

            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold">
                Reviews {reviews && reviews.length > 0 && <span className="text-muted-foreground">({reviews.length})</span>}
              </h2>
              {!reviews || reviews.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="rounded-2xl border bg-card p-4 shadow-card">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{r.profiles?.full_name ?? "Guest"}</div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-foreground/90">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-2xl border bg-card p-6 shadow-elevated">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">K{listing.price_monthly.toLocaleString()}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              {listing.price_daily && (
                <p className="text-sm text-muted-foreground">or K{listing.price_daily.toLocaleString()} / day</p>
              )}

              <BookingDialog listingId={listing.id} landlordId={listing.landlord_id} />

              <div className="mt-6 border-t pt-4">
                <p className="text-xs text-muted-foreground">Listed by</p>
                <p className="mt-1 font-semibold">{listing.profiles?.full_name ?? "Landlord"}</p>
                {listing.profiles?.phone && (
                  <p className="text-sm text-muted-foreground">{listing.profiles.phone}</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BookingDialog({ listingId, landlordId }: { listingId: string; landlordId: string }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isOwn = session?.user.id === landlordId;

  if (!session) {
    return (
      <Button className="mt-4 w-full" size="lg" onClick={() => navigate({ to: "/auth" })}>
        Sign in to book
      </Button>
    );
  }

  if (isOwn) {
    return <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">This is your listing.</p>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("bookings").insert({
      listing_id: listingId,
      tenant_id: session.user.id,
      start_date: start,
      end_date: end,
      message,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Booking request sent!");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mt-4 w-full" size="lg">Request to book</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Input type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input type="date" required value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Message to landlord (optional)</Label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell them a bit about yourself…" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
