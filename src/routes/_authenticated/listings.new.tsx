import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, X, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/listings/new")({
  head: () => ({
    meta: [
      { title: "New listing · Nestly" },
      { name: "description", content: "Add a boarding house listing." },
    ],
  }),
  component: NewListing,
});

const AMENITIES = [
  "Wi-Fi",
  "Parking",
  "Meals",
  "Security",
  "Laundry",
  "Air conditioning",
  "Study desk",
  "Water",
];

function NewListing() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    address: "",
    city: "Lusaka",
    price_monthly: "3500",
    price_daily: "",
    room_type: "single",
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<{ path: string; url: string }[]>([]);

  const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

  const handleFiles = async (files: FileList | null) => {
    if (!files || !session) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    try {
      for (const file of list) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10MB`);
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-media")
          .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (upErr) {
          toast.error(upErr.message);
          continue;
        }
        const { data: signed, error: signErr } = await supabase.storage
          .from("listing-media")
          .createSignedUrl(path, SIGNED_URL_TTL);
        if (signErr || !signed) {
          toast.error(signErr?.message ?? "Could not create image URL");
          continue;
        }
        setImages((prev) => [...prev, { path, url: signed.signedUrl }]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = async (path: string) => {
    setImages((prev) => prev.filter((i) => i.path !== path));
    await supabase.storage.from("listing-media").remove([path]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("listings")
      .insert({
        landlord_id: session.user.id,
        title: form.title,
        description: form.description,
        address: form.address,
        city: form.city,
        price_monthly: Number(form.price_monthly),
        price_daily: form.price_daily ? Number(form.price_daily) : null,
        room_type: form.room_type,
        amenities,
        images: images.map((i) => i.url),
      })
      .select("id")
      .single();

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Listing published!");
    navigate({ to: "/listing/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <button
          onClick={() => navigate({ to: "/browse" })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <h1 className="font-display text-3xl font-bold">Add a listing</h1>
        <p className="mt-1 text-muted-foreground">Fill in the details — you can edit anytime.</p>

        <form
          onSubmit={submit}
          className="mt-8 space-y-6 rounded-2xl border bg-card p-6 shadow-card"
        >
          <Field label="Title">
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Cozy single room near university"
            />
          </Field>

          <Field label="Description">
            <Textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the space, house rules, neighborhood…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <Textarea
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Lusaka, Kitwe, Ndola…"
              />
            </Field>
            <Field label="Address">
              <Textarea
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Plot 12, Kabulonga Road"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly price (K)">
              <Input
                required
                type="number"
                min={1}
                value={form.price_monthly}
                onChange={(e) => setForm({ ...form, price_monthly: e.target.value as any })}
              />
            </Field>
            <Field label="Daily price (K, optional)">
              <Input
                type="number"
                min={0}
                value={form.price_daily}
                onChange={(e) => setForm({ ...form, price_daily: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Room type">
            <Select
              value={form.room_type}
              onValueChange={(v) => setForm({ ...form, room_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single room</SelectItem>
                <SelectItem value="shared">Shared room</SelectItem>
                <SelectItem value="full-house">Full house</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Amenities">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {AMENITIES.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={amenities.includes(a)}
                    onCheckedChange={(c) =>
                      setAmenities((prev) => (c ? [...prev, a] : prev.filter((x) => x !== a)))
                    }
                  />
                  {a}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Photos">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img) => (
                <div
                  key={img.path}
                  className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                >
                  <img
                    src={img.url}
                    alt="Listing photo preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img.path)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
                {uploading ? "Uploading…" : "Add photos"}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload multiple images (JPG, PNG, up to 10MB each). The first photo will be used as
              the cover.
            </p>
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Publishing…" : "Publish listing"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
