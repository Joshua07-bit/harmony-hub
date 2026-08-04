import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Nestly" },
      { name: "description", content: "Update your name, phone, and notification preferences." },
      { property: "og:title", content: "Your Profile — Nestly" },
      { property: "og:description", content: "Manage your Nestly account details and notifications." },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

function ProfilePage() {
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingUpdates, setBookingUpdates] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, email_booking_updates, email_new_messages, email_marketing")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setPhone(data.phone ?? "");
          setBookingUpdates(data.email_booking_updates ?? true);
          setNewMessages(data.email_new_messages ?? true);
          setMarketing(data.email_marketing ?? false);
        }
        setLoading(false);
      });
  }, [session?.user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    const parsed = schema.safeParse({ full_name: fullName, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone || null,
        email_booking_updates: bookingUpdates,
        email_new_messages: newMessages,
        email_marketing: marketing,
      })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    await refreshProfile();
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Your profile</h1>
        <p className="mt-1 text-muted-foreground">Manage your account details and notification preferences.</p>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading…</p>
        ) : (
          <form onSubmit={handleSave} className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account details</CardTitle>
                <CardDescription>Your email is {session?.user.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={30}
                    placeholder="Optional"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification preferences</CardTitle>
                <CardDescription>Choose which emails you want to receive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PrefRow
                  id="booking_updates"
                  label="Booking updates"
                  description="Requests, approvals, and cancellations."
                  checked={bookingUpdates}
                  onChange={setBookingUpdates}
                />
                <PrefRow
                  id="new_messages"
                  label="New messages"
                  description="When a landlord or tenant messages you."
                  checked={newMessages}
                  onChange={setNewMessages}
                />
                <PrefRow
                  id="marketing"
                  label="Product updates"
                  description="Occasional news and tips from Nestly."
                  checked={marketing}
                  onChange={setMarketing}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function PrefRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
