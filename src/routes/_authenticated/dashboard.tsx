import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, Home, MessageCircle, Plus, User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Nestly" },
      { name: "description", content: "Manage your bookings and listings." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, session } = useAuth();
  const isLandlord = profile?.role === "landlord";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {isLandlord ? "Manage your properties and bookings." : "Your trips and booking requests."}
            </p>
          </div>
          {isLandlord && (
            <Button asChild size="lg" className="gap-2">
              <Link to="/listings/new"><Plus className="h-4 w-4" /> Add listing</Link>
            </Button>
          )}
        </div>

        {isLandlord ? <LandlordDashboard userId={session!.user.id} /> : <TenantDashboard userId={session!.user.id} />}
      </div>
    </div>
  );
}

function TenantDashboard({ userId }: { userId: string }) {
  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, start_date, end_date, status, message, listings(id, title, city, images)")
        .eq("tenant_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Calendar className="h-5 w-5 text-primary" /> Your bookings
      </div>
      {!bookings || bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          body="Find a place you love and send your first booking request."
          cta={<Button asChild><Link to="/browse">Browse listings</Link></Button>}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => (
            <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-background p-4">
              <img
                src={b.listings?.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=200&q=60"}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <Link to="/listing/$id" params={{ id: b.listings?.id }} className="line-clamp-1 font-semibold hover:underline">
                  {b.listings?.title}
                </Link>
                <p className="text-xs text-muted-foreground">{b.listings?.city}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {b.start_date} → {b.end_date}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={b.status} />
                {(b.status === "approved" || b.status === "pending") && (
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link to="/messages/$bookingId" params={{ bookingId: b.id }}>
                      <MessageCircle className="h-3.5 w-3.5" /> Message
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LandlordDashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();

  const { data: listings } = useQuery({
    queryKey: ["my-listings", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, city, price_monthly, images, is_available")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["landlord-bookings", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, start_date, end_date, status, message, tenant_id, listings!inner(id, title, landlord_id)")
        .eq("listings.landlord_id", userId)
        .order("created_at", { ascending: false });
      if (!data) return [];
      const ids = Array.from(new Set(data.map((b) => b.tenant_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as { id: string; full_name: string | null }[] };
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return data.map((b) => ({ ...b, profiles: map.get(b.tenant_id) ?? null }));
    },
  });


  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}`);
    qc.invalidateQueries({ queryKey: ["landlord-bookings", userId] });
  };

  const deleteListing = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing removed");
    qc.invalidateQueries({ queryKey: ["my-listings", userId] });
  };

  return (
    <Tabs defaultValue="listings">
      <TabsList>
        <TabsTrigger value="listings">
          <Home className="mr-1.5 h-4 w-4" /> Listings ({listings?.length ?? 0})
        </TabsTrigger>
        <TabsTrigger value="bookings">
          <Calendar className="mr-1.5 h-4 w-4" /> Bookings ({bookings?.length ?? 0})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="listings" className="mt-6">
        {!listings || listings.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <EmptyState
              title="No listings yet"
              body="Add your first boarding house to start receiving bookings."
              cta={<Button asChild><Link to="/listings/new">Add listing</Link></Button>}
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {listings.map((l: any) => (
              <div key={l.id} className="flex gap-4 rounded-2xl border bg-card p-4 shadow-card">
                <img
                  src={l.images?.[0] || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=200&q=60"}
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link to="/listing/$id" params={{ id: l.id }} className="line-clamp-1 font-semibold hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{l.city}</p>
                  <p className="mt-1 text-sm font-medium text-primary">K{l.price_monthly.toLocaleString()}/mo</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => deleteListing(l.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="bookings" className="mt-6">
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          {!bookings || bookings.length === 0 ? (
            <EmptyState title="No booking requests" body="Booking requests from tenants will appear here." />
          ) : (
            <div className="space-y-3">
              {bookings.map((b: any) => (
                <div key={b.id} className="flex flex-wrap items-start gap-4 rounded-xl border bg-background p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{b.profiles?.full_name ?? "Guest"}</p>
                    <p className="text-xs text-muted-foreground">
                      for <span className="font-medium text-foreground">{b.listings?.title}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{b.start_date} → {b.end_date}</p>
                    {b.message && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">{b.message}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={b.status} />
                    {b.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => updateStatus(b.id, "approved")}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "declined")}>Decline</Button>
                      </>
                    )}
                    {(b.status === "approved" || b.status === "pending") && (
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link to="/messages/$bookingId" params={{ bookingId: b.id }}>
                          <MessageCircle className="h-3.5 w-3.5" /> Message
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, string> = {
    pending: "bg-warning/15 text-warning-foreground",
    approved: "bg-success/15 text-success",
    declined: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <Badge className={`${variant[status] ?? "bg-muted"} border-0 capitalize`}>{status}</Badge>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="py-8 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
