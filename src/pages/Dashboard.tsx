import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag, Search, MapPin,
  Package, Clock, BarChart3,
  ChevronRight, Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const StatusBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="px-2 py-1 border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-tight bg-white">
    {children}
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({ marketplace: 0, lostFound: 0, studySpaces: 0 });
  const [totalSeats, setTotalSeats] = useState(0); // Track total for percentage
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate live occupancy percentage
  const occupancyPercentage = useMemo(() => {
    if (totalSeats === 0) return 0;
    const occupiedCount = totalSeats - stats.studySpaces;
    return Math.round((occupiedCount / totalSeats) * 100);
  }, [stats.studySpaces, totalSeats]);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fetch Counts and Total Seats for Density
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
      });
      setTotalSeats(ssTotal.count || 0);

      // 2. Fetch Recent Activity
      const { data: mItems } = await supabase
        .from('marketplace_items')
        .select('title, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(2);

      const { data: lfItems } = await supabase
        .from('lost_found_items')
        .select('title, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(2);

      const combined = [
        ...(mItems?.map(i => ({ text: `New Listing: ${i.title}`, time: i.created_at, category: 'Market' })) || []),
        ...(lfItems?.map(l => ({ text: `Lost Report: ${l.title}`, time: l.created_at, category: 'Lost' })) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setActivities(combined);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const channel = supabase.channel('dashboard-feed')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchDashboardData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDashboardData]);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Campus Overview</h1>
            <p className="text-slate-500 font-medium">Live sensor data from LRC and Marketplace.</p>
          </div>
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Marketplace", value: stats.marketplace, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Lost & Found", value: stats.lostFound, icon: Search, color: "text-rose-600", bg: "bg-rose-50" },
            { label: "Available Seats", value: stats.studySpaces, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((item) => (
            <Card key={item.label} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-4xl font-black text-slate-900">{loading ? "..." : item.value}</p>
                </div>
                <div className={`h-14 w-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center`}>
                  <item.icon className="h-7 w-7" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Working Occupancy Chart */}
          <Card className="border-none shadow-sm overflow-hidden bg-slate-900 text-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-400" /> Live LRC Density
              </CardTitle>
              <StatusBadge>Real-time</StatusBadge>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="flex items-center justify-center mb-8">
                <div className="relative h-40 w-40 flex items-center justify-center">
                  {/* Circular Progress Logic */}
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent"
                      strokeDasharray={440}
                      strokeDashoffset={440 - (440 * occupancyPercentage) / 100}
                      className="text-indigo-500 transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-black">{occupancyPercentage}%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Occupied</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-2xl text-center">
                  <p className="text-2xl font-black text-emerald-400">{stats.studySpaces}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Free Seats</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-2xl text-center">
                  <p className="text-2xl font-black text-indigo-400">{totalSeats}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Capacity</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Campus Feed */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-500" /> Live Campus Feed
              </CardTitle>
              <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {activities.length > 0 ? (
                  activities.map((act, idx) => (
                    <div key={idx} className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${act.category === 'Market' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                          {act.category === 'Market' ? <ShoppingBag className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{act.text}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{act.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900">
                          {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {new Date(act.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-slate-400 font-medium text-sm italic">
                    Waiting for campus activity...
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50/50">
                <Button variant="ghost" className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700" asChild>
                  <Link to="/marketplace">Explore All Interactions <ChevronRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}