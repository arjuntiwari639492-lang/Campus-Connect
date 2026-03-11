import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, ShoppingBag, Search, MapPin,
  Shield, Users, Zap, ArrowRight, Star,
  MessageCircle, AlertTriangle, CheckCircle2,
  TrendingUp, Activity, Package
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Stats {
  marketplace: number;
  lostFound: number;
  studySpaces: number;
  studyTotal: number;
}

// ─── Features Config ─────────────────────────────────────────────────────────

const features = [
  {
    icon: ShoppingBag,
    title: "Marketplace",
    description: "Buy and sell textbooks, electronics, and more with fellow students at campus prices.",
    color: "from-blue-500 to-indigo-600",
    lightBg: "bg-blue-50 dark:bg-blue-950/30",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    statLabel: "Active Listings",
  },
  {
    icon: Search,
    title: "Lost & Found",
    description: "Report and recover lost items on campus with our live feed and match system.",
    color: "from-rose-500 to-pink-600",
    lightBg: "bg-rose-50 dark:bg-rose-950/30",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    iconColor: "text-rose-600 dark:text-rose-400",
    statLabel: "Open Reports",
  },
  {
    icon: MapPin,
    title: "Study Spaces",
    description: "Find and reserve live study seats in the LRC — updated in real time.",
    color: "from-emerald-500 to-teal-600",
    lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    statLabel: "Seats Available",
  },
];

const benefits = [
  {
    icon: Shield,
    title: "Student Verified",
    description: "Only verified university students can access the platform, keeping it safe and trusted.",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/50",
  },
  {
    icon: Users,
    title: "Peer-to-Peer",
    description: "Connect directly with students from your campus community without middlemen.",
    color: "text-violet-600",
    bg: "bg-violet-50 dark:bg-violet-950/50",
  },
  {
    icon: Zap,
    title: "Real-Time Sync",
    description: "Live data streams keep listings, lost reports, and seat availability always up-to-date.",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/50",
  },
];

// ─── Live Count Badge ─────────────────────────────────────────────────────────

function LiveBadge({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-emerald-600 dark:text-emerald-400">{count} {label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Landing() {
  const [stats, setStats] = useState<Stats>({ marketplace: 0, lostFound: 0, studySpaces: 0, studyTotal: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [mCount, lfCount, ssAvail, ssTotal] = await Promise.all([
        supabase.from('marketplace_items').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('lost_found_items').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('lrc_seats').select('*', { count: 'exact', head: true }).eq('status', 'Available'),
        supabase.from('lrc_seats').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        marketplace: mCount.count || 0,
        lostFound: lfCount.count || 0,
        studySpaces: ssAvail.count || 0,
        studyTotal: ssTotal.count || 0,
      });

    } catch (err) {
      console.error("Landing data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channels = [
      supabase.channel('landing-mp').on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_items' }, fetchData).subscribe(),
      supabase.channel('landing-lf').on('postgres_changes', { event: '*', schema: 'public', table: 'lost_found_items' }, fetchData).subscribe(),
      supabase.channel('landing-ss').on('postgres_changes', { event: '*', schema: 'public', table: 'lrc_seats' }, fetchData).subscribe(),
    ];

    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-blue-300/20 rounded-full blur-2xl animate-float pointer-events-none" style={{ animationDelay: '3s' }} />

        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        <div className="relative container mx-auto px-4 py-24 lg:py-32 z-10">
          <div className="max-w-4xl mx-auto text-center">


            <div className="flex justify-center items-center gap-3 mb-6 animate-fade-in">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-white shadow-lg">
                <GraduationCap className="h-8 w-8" />
              </div>
              <span className="text-3xl font-extrabold text-white tracking-tight">CampusConnect</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 animate-slide-up">
              Your Campus,<br />
              <span className="text-white/80">All in One Place.</span>
            </h1>

            <p className="text-lg md:text-xl text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Buy & sell items, track lost belongings, and find open study seats — all powered by real-time live data.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-bold text-base px-8 py-6 rounded-2xl shadow-2xl shadow-black/20 hover:shadow-black/30 transition-all hover:-translate-y-0.5">
                <Link to="/auth">Get Started Free</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100L60 91C120 82 240 64 360 55C480 46 600 46 720 52C840 58 960 73 1080 78C1200 83 1320 79 1380 77L1440 75V100H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* ── LIVE STATS BAR ──────────────────────────────────────────────────── */}
      <section className="py-10 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { label: "Active Listings", value: stats.marketplace, icon: Package, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
              { label: "Lost Reports", value: stats.lostFound, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
              { label: "Seats Available", value: stats.studySpaces, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`flex items-center gap-4 p-4 rounded-2xl border border-border/50 ${stat.bg} animate-fade-in-up`}>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-900/50 shadow-sm ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={`text-2xl font-black ${stat.color}`}>{loading ? "–" : stat.value}</p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
              <Activity className="h-3.5 w-3.5" /> Three Powerful Tools
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
              Everything You Need,
              <br /><span className="text-primary">On One Platform.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Each module is connected to live Supabase streams — data updates the moment it changes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => {
              const liveCount = index === 0 ? stats.marketplace : index === 1 ? stats.lostFound : stats.studySpaces;
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className={`group relative p-8 rounded-3xl ${feature.lightBg} border border-border/40 transition-all duration-500 block overflow-hidden`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${feature.iconBg} ${feature.iconColor} mb-6`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">{feature.description}</p>
                  <div className="flex items-center justify-between">
                    <LiveBadge count={liveCount} label={feature.statLabel} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
              Built for Students,<br />
              <span className="text-primary">By Students.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              A safe, trusted, and modern environment for campus resource exchange.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className={`p-8 rounded-3xl ${benefit.bg} border border-border/30 text-center group transition-all duration-300`}>
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-slate-900/50 shadow-md mb-6 ${benefit.color}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/40">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="absolute -inset-12 bg-primary/5 rounded-[4rem] -z-10" />
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              <Zap className="h-3.5 w-3.5 fill-primary" /> Join Your Campus Community
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-6">
              Ready to Connect with Your Campus?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Join thousands of students already using CampusConnect for smarter campus living — all with a verified university email.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="font-bold text-base px-10 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                <Link to="/auth">Get Started Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-border bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5 font-bold text-lg text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-4 w-4" />
              </div>
              CampusConnect
            </div>



            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} CampusConnect
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}