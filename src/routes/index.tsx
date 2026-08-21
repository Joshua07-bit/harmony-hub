import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, MapPin, Search, ShieldCheck, Star, Wifi } from "lucide-react";

import heroImg from "@/assets/hero.jpg";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nestly — Find your next boarding house" },
      {
        name: "description",
        content:
          "Search verified boarding houses near you, book securely, and manage your stay from one app. Built for students, young professionals, and landlords.",
      },
      { property: "og:title", content: "Nestly — Find your next boarding house" },
      {
        property: "og:description",
        content:
          "Search verified boarding houses near you, book securely, and manage your stay from one app.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [city, setCity] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <img
          src={heroImg}
          alt=""
          aria-hidden
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-40"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="max-w-3xl text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified landlords · Secure bookings
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              Boarding houses,
              <br />
              made simple.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-primary-foreground/90">
              Browse real listings, message landlords, and reserve your room in minutes — no more
              endless phone calls or dead-end classifieds.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/browse", search: { city } as never });
              }}
              className="mt-6 flex w-full max-w-xl flex-col gap-2 rounded-4xl bg-background p-2 shadow-elevated sm:flex-row"
            >
              <div className="flex flex-1 items-center gap-2 px-3">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Search a city or area (e.g. Lusaka, Kitwe)"
                  className="h-12 border-0 bg-white text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                />
              </div>
              <Button type="submit" size="lg" className="gap-2">
                <Search className="h-4 w-4" /> Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: MapPin,
              title: "Near you",
              body: "Filter by city, distance, and room type to find a place that actually fits your life.",
            },
            {
              icon: Wifi,
              title: "Real amenities",
              body: "Wi-Fi, parking, meals, security — see exactly what's included before you book.",
            },
            {
              icon: Star,
              title: "Trusted ratings",
              body: "Every listing carries reviews from real past tenants, not fake stars.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-4xl border bg-card p-6 shadow-card transition-shadow hover:shadow-elevated"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Landlord CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="overflow-hidden rounded-4xl bg-gradient-hero p-10 text-primary-foreground shadow-elevated sm:p-14">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Own a boarding house?</h2>
              <p className="mt-3 max-w-md text-primary-foreground/90">
                List your property in minutes, manage bookings from a single dashboard, and reach
                thousands of tenants actively looking.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link to="/auth" search={{ mode: "signup" } as never}>
                  List your property <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/10 text-primary-foreground border-white/30 hover:bg-white/20">
                <Link to="/browse">Browse listings</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Nestly. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/browse" className="hover:text-foreground">Browse</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
