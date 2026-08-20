import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Star } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const searchSchema = z.object({
  city: z.string().optional(),
  room: z.string().optional(),
  max: z.coerce.number().optional(),
});

export const Route = createFileRoute("/browse")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Browse listings · Nestly" },
      { name: "description", content: "Browse verified boarding houses. Filter by city, room type, and price." },
      { property: "og:title", content: "Browse listings · Nestly" },
      { property: "og:description", content: "Verified boarding houses filtered by city, room type, and price." },
    ],
  }),
  component: Browse,
});

type Listing = {
  id: string;
  title: string;
  city: string;
  address: string;
  price_monthly: number;
  price_daily: number | null;
  room_type: string;
  amenities: string[];
  images: string[];
  is_available: boolean;
};

function Browse() {
  const initial = Route.useSearch();
  const [city, setCity] = useState(initial.city ?? "");
  const [room, setRoom] = useState(initial.room ?? "any");
  const [maxPrice, setMaxPrice] = useState<number>(initial.max ?? 0);
  const [cityInput, setCityInput] = useState(initial.city ?? "");
  const [roomInput, setRoomInput] = useState(initial.room ?? "any");
  const [priceInput, setPriceInput] = useState<string>((initial.max ?? 0).toString());

  const { data, isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,city,address,price_monthly,price_daily,room_type,amenities,images,is_available")
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Listing[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((l) => {
      if (city && !l.city.toLowerCase().includes(city.toLowerCase())) return false;
      if (room !== "any" && l.room_type !== room) return false;
      if (l.price_monthly > maxPrice) return false;
      return true;
    });
  }, [data, city, room, maxPrice]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Browse boarding houses</h1>
          <p className="mt-2 text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} places available`}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-6 rounded-2xl border bg-card p-5 shadow-card lg:sticky lg:top-24 lg:h-fit">
            <div>
              <label className="mb-2 block text-sm font-medium">City</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="e.g. Lusaka, Kitwe, Ndola"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Room type</label>
              <Select value={roomInput} onValueChange={setRoomInput}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="single">Single room</SelectItem>
                  <SelectItem value="shared">Shared room</SelectItem>
                  <SelectItem value="full-house">Full house</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="max-monthly-price" className="mb-2 block text-sm font-medium">
                Max monthly
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  K
                </span>
                <Input
                  id="max-monthly-price"
                  type="number"
                  min={500}
                  max={20000}
                  step={250}
                  value={priceInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPriceInput(value);

                    if (value === "") {
                      setMaxPrice(0);
                      return;
                    }

                    const nextValue = Number(value);
                    if (!Number.isNaN(nextValue)) {
                      setMaxPrice(Math.min(20000, Math.max(500, nextValue)));
                    }
                  }}
                  onBlur={() => {
                    if (priceInput === "") {
                      setPriceInput("0");
                      setMaxPrice(0);
                    }
                  }}
                  className="h-10 w-full rounded-lg border pl-7 pr-3 shadow-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Enter max price"
                  aria-label="Maximum monthly price"
                />
              </div>
            </div>

            <Button
              type="button"
              className="w-full gap-2"
              onClick={() => {
                setCity(cityInput);
                setRoom(roomInput);
                setMaxPrice(Number(priceInput) || 0);
              }}
            >
              <Search className="h-4 w-4" />
              Search
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setCity("");
                setRoom("any");
                setMaxPrice(0);
                setCityInput("");
                setRoomInput("any");
                setPriceInput("0");
              }}
            >
              Reset filters
            </Button>
          </aside>

          <div>
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border bg-card p-16 text-center shadow-card">
                <p className="text-lg font-medium">No listings match your filters</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try broadening your search or check back soon — new places are added often.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((l) => <ListingCard key={l.id} l={l} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingCard({ l }: { l: Listing }) {
  const cover =
    l.images[0] ||
    `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=60`;
  return (
    <Link
      to="/listing/$id"
      params={{ id: l.id }}
      className="group overflow-hidden rounded-2xl border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={cover}
          alt={l.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold shadow-soft">
          K{l.price_monthly.toLocaleString()}/mo
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold">{l.title}</h3>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" /> New
          </div>
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> <span className="line-clamp-1">{l.city}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] capitalize text-secondary-foreground">
            {l.room_type.replace("-", " ")}
          </span>
          {l.amenities.slice(0, 2).map((a) => (
            <span key={a} className="rounded-full bg-accent px-2 py-0.5 text-[11px] capitalize text-accent-foreground">{a}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
