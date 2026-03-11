import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ItemCard } from "@/components/cards/ItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Loader2,
  PackageCheck,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  Filter,
  ImagePlus,
  ShoppingCart,
  Banknote
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const categories = ["All", "Textbooks", "Electronics", "Furniture", "Clothing", "Other"];

interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  image_url: string;
  seller_id: string;
  seller?: { full_name: string } | null;
  profiles?: { full_name: string; email?: string } | null;
  created_at: string;
}

export default function Marketplace() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", description: "", price: "", category: "Textbooks", condition: "Good" });
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems((data || []) as MarketplaceItem[]);
    } catch (error: any) {
      console.error("Fetch error:", error.message);
      toast({ variant: "destructive", title: "Error Fetching Listings", description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });

    fetchItems();

    const channel = supabase
      .channel('marketplace-global-sync')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'marketplace_items' },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const handlePostItem = async () => {
    if (!newItem.title.trim() || !newItem.price || !newItem.description.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({ variant: "destructive", title: "Auth Required", description: "Please sign in to post items." });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('marketplace_items')
      .insert({
        seller_id: user.id,
        title: newItem.title,
        description: newItem.description,
        price: parseFloat(newItem.price),
        category: newItem.category,
        condition: newItem.condition,
        status: 'active'
      });

    if (error) {
      toast({ variant: "destructive", title: "Post Failed", description: error.message });
    } else {
      toast({ title: "Success", description: "Item listed successfully!" });
      setIsDialogOpen(false);
      setNewItem({ title: "", description: "", price: "", category: "Textbooks", condition: "Good" });
      fetchItems();
    }
    setSubmitting(false);
  };

  const filteredItems = items.filter((item) => {
    const title = item.title || "";
    const description = item.description || "";
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 py-4 md:py-8 px-4 sm:px-6 lg:px-8">

        {/* --- Professional Hero Section --- */}
        <section className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 md:p-12 border border-slate-800 shadow-sm">
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center lg:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                <Sparkles className="h-3 md:h-4 w-3 md:w-4 text-blue-400" />
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-300">Campus Economy</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                Buy & Sell Smarter.
              </h1>
              <p className="text-base md:text-lg text-slate-400 max-w-xl leading-relaxed">
                Connect with students to find textbooks, electronics, and essentials at unbeatable campus prices.
              </p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 md:gap-4 pt-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full sm:w-auto rounded-lg px-8 font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 transition-colors">
                      Sell an Item <Plus className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-[560px] bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-xl p-4 sm:p-8">
                    <DialogHeader className="space-y-1 text-left">
                      <DialogTitle className="text-xl md:text-2xl font-bold">Sell Something</DialogTitle>
                      <DialogDescription className="text-sm">
                        List your item for sale on the campus marketplace.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 md:space-y-5 py-4">
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold">Title</Label>
                          <Input
                            value={newItem.title}
                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                            placeholder="e.g. Calculus 4th Edition"
                            className="rounded-lg h-10 md:h-12"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Price (₹)</Label>
                            <div className="relative">
                              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                type="number"
                                value={newItem.price}
                                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                placeholder="0.00"
                                className="pl-9 rounded-lg h-10 md:h-12"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Condition</Label>
                            <Select value={newItem.condition} onValueChange={(val) => setNewItem({ ...newItem, condition: val })}>
                              <SelectTrigger className="rounded-lg h-10 md:h-12">
                                <SelectValue placeholder="Condition" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Like New">Like New</SelectItem>
                                <SelectItem value="Good">Good</SelectItem>
                                <SelectItem value="Fair">Fair</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold">Category</Label>
                          <Select value={newItem.category} onValueChange={(val) => setNewItem({ ...newItem, category: val })}>
                            <SelectTrigger className="rounded-lg h-10 md:h-12">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.filter(c => c !== "All").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold">Description</Label>
                          <Textarea
                            value={newItem.description}
                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                            placeholder="Tell us more about the item..."
                            className="min-h-[80px] md:min-h-[100px] resize-none rounded-lg"
                          />
                        </div>
                      </div>

                      <Button
                        className="w-full h-11 md:h-12 text-base font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        onClick={handlePostItem}
                        disabled={submitting}
                      >
                        {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Publish Listing"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-lg px-8 border-slate-700 bg-slate-800 text-white hover:bg-slate-700">
                  Active Sales
                </Button>
              </div>
            </div>

            {/* Clean Stats */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 w-full lg:w-auto">
              <Card className="p-4 md:p-5 bg-slate-800 border-slate-700 rounded-xl flex flex-col justify-between h-28 md:h-32 w-full lg:w-40">
                <TrendingUp className="h-4 md:h-5 w-4 md:w-5 text-blue-400 mb-2" />
                <div>
                  <p className="text-xl md:text-2xl font-bold text-white">{items.length}</p>
                  <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-wide">Live Listings</p>
                </div>
              </Card>
              <Card className="p-4 md:p-5 bg-slate-800 border-slate-700 rounded-xl flex flex-col justify-between h-28 md:h-32 w-full lg:w-40">
                <ShieldCheck className="h-4 md:h-5 w-4 md:w-5 text-emerald-400 mb-2" />
                <div>
                  <p className="text-xl md:text-2xl font-bold text-white">100%</p>
                  <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-wide">Verified</p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* --- Global Command Bar --- */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center p-3 md:p-4 bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-slate-400" />
            <Input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 md:pl-11 h-10 md:h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-2 text-sm md:text-base"
            />
          </div>
          <div className="flex gap-2 md:gap-3 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none h-10 md:h-12 rounded-lg px-4 md:px-6 gap-2 border-slate-200 dark:border-slate-700 text-sm">
              <Filter className="h-4 w-4" /> <span className="font-semibold">Filters</span>
            </Button>
            <Button variant="outline" className="h-10 md:h-12 w-10 md:w-12 rounded-lg border-slate-200 dark:border-slate-700" onClick={() => fetchItems()}>
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-nowrap overflow-x-auto pb-2 md:pb-0 md:flex-wrap gap-2 -mx-1 px-1 scrollbar-hide">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "secondary"}
              className={`cursor-pointer px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${selectedCategory === category
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 md:h-80 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                id={item.id}
                name={item.title}
                price={item.price}
                seller={item.profiles?.full_name || item.seller?.full_name || "Campus Member"}
                category={item.category}
                condition={item.condition}
                onContact={() => {
                  if (item.profiles?.email) {
                    window.location.href = `mailto:${item.profiles.email}?subject=Inquiry about ${item.title}`;
                  } else {
                    toast({ variant: "destructive", title: "Email Unavailable", description: "The seller has not provided a public email." });
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 md:p-20 border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            <PackageCheck className="h-12 md:h-16 w-12 md:w-16 text-slate-400 mb-4" />
            <h3 className="text-lg md:text-xl font-bold text-slate-700 dark:text-slate-300">No listings found</h3>
            <p className="text-sm md:text-base text-slate-500 text-center max-w-sm mt-2 px-4">
              {searchQuery ? `No matches for "${searchQuery}". Try a different keyword.` : "The marketplace is quiet right now. Be the first to list an item!"}
            </p>
            {searchQuery && (
              <Button variant="secondary" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }} className="mt-6 rounded-lg font-medium">
                Clear Search
              </Button>
            )}
          </Card>
        )}

        {/* --- Global Notice --- */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-center gap-4 md:gap-6">
          <div className="bg-blue-600 p-2 md:p-3 rounded-xl shrink-0">
            <Info className="h-5 md:h-6 w-5 md:w-6 text-white" />
          </div>
          <div className="flex-1 space-y-1 text-center md:text-left">
            <h4 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100">Trade Safely on Campus</h4>
            <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm">Coordinate trades in public spots like the student lounge. Verify item condition in person before completing any payment.</p>
          </div>
          <Button variant="outline" className="rounded-lg border-blue-200 dark:border-blue-800 font-semibold w-full md:w-auto h-10 md:h-11">
            Trading Tips
          </Button>
        </Card>

      </div>
    </DashboardLayout>
  );
}