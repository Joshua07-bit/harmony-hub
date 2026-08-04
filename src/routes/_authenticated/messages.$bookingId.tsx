import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/messages/$bookingId")({
  head: () => ({
    meta: [
      { title: "Messages · Nestly" },
      { name: "description", content: "Coordinate move-in details with your host or guest." },
    ],
  }),
  component: MessageThread,
});

type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type BookingCtx = {
  id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  status: string;
  listings: { id: string; title: string; city: string; landlord_id: string } | null;
};

function MessageThread() {
  const { bookingId } = Route.useParams();
  const { session } = useAuth();
  const userId = session!.user.id;
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["booking-ctx", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, tenant_id, start_date, end_date, status, listings!inner(id, title, city, landlord_id)")
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data as BookingCtx | null;
    },
  });

  const otherId = booking
    ? booking.tenant_id === userId
      ? booking.listings?.landlord_id
      : booking.tenant_id
    : null;

  const { data: otherProfile } = useQuery({
    queryKey: ["profile", otherId],
    enabled: !!otherId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", otherId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, booking_id, sender_id, body, created_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          qc.setQueryData(["messages", bookingId], (prev: Message[] | undefined) => {
            const next = payload.new as Message;
            if (prev?.some((m) => m.id === next.id)) return prev;
            return [...(prev ?? []), next];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, qc]);

  // Autoscroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages?.length]);

  const isAuthorized = useMemo(() => {
    if (!booking) return false;
    return booking.tenant_id === userId || booking.listings?.landlord_id === userId;
  }, [booking, userId]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      booking_id: bookingId,
      sender_id: userId,
      body,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft("");
  };

  if (bookingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!booking || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <p className="text-lg font-semibold">Conversation not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This booking either doesn't exist or you don't have access to it.
          </p>
          <Button asChild className="mt-4"><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const otherName = otherProfile?.full_name || "Nestly user";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 gap-1">
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
          </Button>
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Conversation with</p>
                <p className="truncate text-lg font-semibold">{otherName}</p>
                {booking.listings && (
                  <Link
                    to="/listing/$id"
                    params={{ id: booking.listings.id }}
                    className="text-sm text-primary hover:underline"
                  >
                    {booking.listings.title} · {booking.listings.city}
                  </Link>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {booking.start_date} → {booking.end_date}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">{booking.status}</Badge>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-card p-4 shadow-card"
          style={{ minHeight: 320, maxHeight: "calc(100vh - 380px)" }}
        >
          {(!messages || messages.length === 0) ? (
            <div className="grid h-full min-h-[240px] place-items-center text-center text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Say hello 👋</p>
                <p className="mt-1">Ask about check-in details, house rules, or anything else.</p>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="mt-4 flex items-end gap-2 rounded-2xl border bg-card p-3 shadow-card"
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write a message… (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="min-h-[52px] resize-none border-0 shadow-none focus-visible:ring-0"
          />
          <Button type="submit" disabled={sending || !draft.trim()} size="icon" className="h-10 w-10 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
