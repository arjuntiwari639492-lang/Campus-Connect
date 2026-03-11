import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LostFoundCard } from "@/components/cards/LostFoundCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Loader2,
  PackageSearch,
  MapPin,
  Filter,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  TrendingUp,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface LostFoundItem {
  id: string;
  title: string;
  description: string;
  location: string;
  date_reported: string;
  created_at: string;
  type: "lost" | "found";
  image_url: string;
  reporter_id: string;
  reporter: { full_name: string; email: string | null } | null;
}

export default function LostFound() {
  const [lostItems, setLostItems] = useState<LostFoundItem[]>([]);
  const [foundItems, setFoundItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<"lost" | "found">("lost");
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const [newItem, setNewItem] = useState({ title: "", description: "", location: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lost_found_items')
      .select(`
        *,
        reporter:profiles!lost_found_items_reporter_id_fkey(full_name, email)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch error:", error.message);
      toast({ variant: "destructive", title: "Connection Error", description: error.message });
    } else {
      const allItems = (data || []) as any[];
      setLostItems([...allItems.filter((i) => i.type === 'lost')]);
      setFoundItems([...allItems.filter((i) => i.type === 'found')]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    fetchItems();
    const channel = supabase.channel('lost-found-global-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'lost_found_items' }, () => fetchItems()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchItems]);

  const handleReportItem = async () => {
    if (!newItem.title.trim() || !newItem.location.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Item name and location are required." });
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ variant: "destructive", title: "Auth Required", description: "Please sign in to report items." });
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from('lost_found_items').insert({
      reporter_id: user.id,
      title: newItem.title,
      description: newItem.description,
      location: newItem.location,
      type: reportType,
      status: 'open',
    });
    if (error) {
      toast({ variant: "destructive", title: "Post Failed", description: error.message });
    } else {
      toast({ title: "Item Published", description: `Successfully listed your ${reportType} item.` });
      setNewItem({ title: "", description: "", location: "" });
      setIsDialogOpen(false);
    }
    setSubmitting(false);
  };

  const handleMarkAsFound = async (id: string) => {
    setLostItems((prev) => prev.filter((item) => item.id !== id));
    const { error } = await supabase.from('lost_found_items').delete().eq('id', id).eq('reporter_id', userId);
    if (error) {
      fetchItems();
      toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    } else {
      toast({ title: "Marked as Found! 🎉", description: "Your item has been removed from the feed." });
    }
  };

  const filteredLost = lostItems.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.location.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFound = foundItems.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.location.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-12 py-4 md:py-8 px-3 md:px-8">

        {/* --- Hero Section --- */}
        <section className="relative overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] bg-slate-950 p-6 md:p-16 border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -mr-48 -mt-48 opacity-50" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12">
            <div className="space-y-4 md:space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <Sparkles className="h-3 md:h-4 w-3 md:w-4 text-primary animate-pulse" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/70">Campus Safety Network</span>
              </div>
              <h1 className="text-3xl md:text-7xl font-black tracking-tight text-white leading-[1.1]">
                Recover What <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Is Yours.</span>
              </h1>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 pt-4">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="xl" className="w-full sm:w-auto rounded-2xl px-8 md:px-10 py-5 md:py-7 text-base md:text-lg font-bold shadow-2xl bg-primary text-white border-0 transition-all hover:scale-105 active:scale-95">
                      Post a Report <Plus className="ml-2 h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-[560px] bg-[#0a0f1e] border border-white/10 text-white shadow-2xl rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8">
                    <DialogHeader className="space-y-2 text-left">
                      <DialogTitle className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">Report an Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 md:space-y-7 py-4 md:py-6">
                      <div className="flex p-1.5 bg-white/5 rounded-2xl gap-2 border border-white/5">
                        <Button className={`flex-1 h-12 md:h-14 rounded-xl font-black transition-all ${reportType === 'lost' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-transparent text-slate-500'}`} variant="ghost" onClick={() => setReportType("lost")}>LOST</Button>
                        <Button className={`flex-1 h-12 md:h-14 rounded-xl font-black transition-all ${reportType === 'found' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-transparent text-slate-500'}`} variant="ghost" onClick={() => setReportType("found")}>FOUND</Button>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 flex items-center gap-2 ml-1"><span className="w-1 h-3 bg-primary rounded-full" />Item Name</Label>
                          <Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} placeholder="e.g. Sony Headphones" className="h-12 md:h-14 bg-white/5 border-white/8 rounded-xl md:rounded-2xl text-white px-5" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 flex items-center gap-2 ml-1"><span className="w-1 h-3 bg-blue-400 rounded-full" />Location</Label>
                          <Input value={newItem.location} onChange={(e) => setNewItem({ ...newItem, location: e.target.value })} placeholder="e.g. LRC Hall" className="h-12 md:h-14 bg-white/5 border-white/8 rounded-xl md:rounded-2xl text-white px-5" />
                        </div>
                        <Textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="Details..." className="min-h-[100px] bg-white/5 border-white/8 rounded-xl md:rounded-2xl text-white resize-none p-5" />
                      </div>
                      <Button className="w-full h-14 md:h-16 text-base font-black rounded-xl md:rounded-2xl bg-gradient-to-r from-primary to-blue-500 text-white" onClick={handleReportItem} disabled={submitting}>{submitting ? <Loader2 className="animate-spin h-6 w-6" /> : "PUBLISH SIGNAL"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4 w-full lg:w-auto">
              <Card className="p-4 md:p-6 bg-white/5 border-white/10 backdrop-blur-xl rounded-2xl md:rounded-3xl h-32 md:h-40 flex flex-col justify-between"><TrendingUp className="h-5 md:h-6 w-5 md:w-6 text-primary" /><div><p className="text-2xl md:text-3xl font-black text-white">{lostItems.length + foundItems.length}</p><p className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Active Signals</p></div></Card>
              <Card className="p-4 md:p-6 bg-white/5 border-white/10 backdrop-blur-xl rounded-2xl md:rounded-3xl h-32 md:h-40 flex flex-col justify-between"><ShieldCheck className="h-5 md:h-6 w-5 md:w-6 text-emerald-400" /><div><p className="text-2xl md:text-3xl font-black text-white">92%</p><p className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Success Rate</p></div></Card>
            </div>
          </div>
        </section>

        {/* --- GLOBAL COMMAND BAR: RELATIVE POSITION (SCROLLS WITH CARDS) --- */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-center p-3 md:p-5 bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border shadow-lg relative z-10 transition-all">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 h-5 md:h-6 w-5 md:w-6 text-slate-400 group-focus-within:text-primary" />
            <Input
              placeholder="Search by keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 md:pl-14 h-12 md:h-14 bg-slate-100 dark:bg-slate-800 border-none rounded-xl md:rounded-2xl text-base md:text-lg font-medium"
            />
          </div>
          <div className="flex gap-2 md:gap-3 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none h-12 md:h-14 rounded-xl md:rounded-2xl px-4 md:px-6 gap-2 border-slate-200 dark:border-slate-700 font-bold"><Filter className="h-4 md:h-5 w-4 md:w-5" /> Filters</Button>
            <Button variant="ghost" className="h-12 md:h-14 w-12 md:w-14 rounded-xl md:rounded-2xl border border-slate-200" onClick={() => fetchItems()}><Clock className="h-4 md:h-5 w-4 md:w-5" /></Button>
          </div>
        </div>

        {/* --- Interactive Tabs Feed --- */}
        <Tabs defaultValue="lost" className="space-y-6 md:space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 md:pb-4 overflow-x-auto no-scrollbar">
            <TabsList className="bg-transparent h-auto p-0 gap-6 md:gap-10 justify-start flex-nowrap">
              <TabsTrigger value="lost" className="relative px-0 py-3 md:py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-destructive data-[state=active]:text-destructive text-lg md:text-2xl font-black whitespace-nowrap uppercase tracking-tighter">
                Lost Feed <Badge className="ml-1 bg-destructive text-white px-2 py-0.5 rounded-lg text-[10px] md:text-xs">{lostItems.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="found" className="relative px-0 py-3 md:py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-500 text-lg md:text-2xl font-black whitespace-nowrap uppercase tracking-tighter">
                Found Feed <Badge className="ml-1 bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-[10px] md:text-xs">{foundItems.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <div className="hidden sm:flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 shrink-0"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span><span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">Live Campus Sync</span></div>
          </div>

          <TabsContent value="lost" className="mt-0 outline-none focus:ring-0">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {[1, 2].map(i => <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
              </div>
            ) : filteredLost.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {filteredLost.map((item) => (
                  <LostFoundCard key={item.id} {...item} name={item.title} date={new Date(item.date_reported || item.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} reporter={item.reporter?.full_name || "Member"} reporterEmail={item.reporter?.email ?? null} reporterId={item.reporter_id} currentUserId={userId} onMarkAsFound={() => handleMarkAsFound(item.id)} />
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-12 md:p-32 border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-3xl md:rounded-[3rem]"><PackageSearch className="h-16 md:h-24 w-16 md:w-24 text-slate-300 mb-4" /><h3 className="text-xl md:text-3xl font-black text-slate-400">BOARD IS EMPTY</h3></Card>
            )}
          </TabsContent>

          <TabsContent value="found" className="mt-0 outline-none focus:ring-0">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {[1, 2].map(i => <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
              </div>
            ) : filteredFound.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {filteredFound.map((item) => (
                  <LostFoundCard key={item.id} {...item} name={item.title} date={new Date(item.date_reported || item.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} reporter={item.reporter?.full_name || "Member"} reporterEmail={item.reporter?.email ?? null} />
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-12 md:p-32 border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-3xl md:rounded-[3rem]"><CheckCircle className="h-16 md:h-24 w-16 md:w-24 text-slate-300 mb-4" /><h3 className="text-xl md:text-3xl font-black text-slate-400">NO NEW FINDS</h3></Card>
            )}
          </TabsContent>
        </Tabs>

        {/* --- Global Notice --- */}
        <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20 rounded-2xl md:rounded-[2rem] p-5 md:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-6"><div className="bg-primary p-3 rounded-xl md:rounded-2xl shadow-xl"><Info className="h-6 md:h-8 w-6 md:w-8 text-white" /></div><div className="flex-1 space-y-1 text-center md:text-left"><h4 className="text-lg md:text-xl font-black uppercase tracking-tighter">Verify Before You Meet</h4><p className="text-sm md:text-base text-slate-500 font-medium">Coordinate trades in public campus spots like the LRC hall or cafeteria.</p></div><Button className="w-full md:w-auto rounded-xl px-8 h-12 md:h-14 font-black">SAFETY GUIDE</Button></Card>

      </div>
    </DashboardLayout>
  );
}