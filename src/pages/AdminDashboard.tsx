import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Types
interface MarketplaceItem {
    id: string;
    title: string;
    price: number;
    status: string;
    category: string;
}

interface LostFoundItem {
    id: string;
    title: string;
    location: string;
    type: string;
}

interface SeatItem {
    id: string;
    status: string;
    booked_by: string | null;
}

export default function AdminDashboard() {
    const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
    const [lostFoundItems, setLostFoundItems] = useState<LostFoundItem[]>([]);
    const [lrcSeats, setLrcSeats] = useState<SeatItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Auth Guard
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || user.email !== "admin@campusconnect.com") {
                toast({ variant: "destructive", title: "Access Denied", description: "You are not an administrator." });
                navigate("/dashboard");
                return;
            }

            // Fetch Marketplace
            const { data: mkData, error: mkError } = await supabase
                .from('marketplace_items')
                .select('id, title, price, status, category');

            if (mkError) throw mkError;
            setMarketplaceItems(mkData || []);

            // Fetch Lost & Found
            const { data: lfData, error: lfError } = await supabase
                .from('lost_found_items')
                .select('id, title, location, type');

            if (lfError) throw lfError;
            setLostFoundItems(lfData || []);

            // Fetch LRC Seats
            const { data: lrcData, error: lrcError } = await supabase
                .from('lrc_seats')
                .select('id, status, booked_by')
                .eq('status', 'Occupied');

            if (lrcError) throw lrcError;
            setLrcSeats(lrcData || []);

        } catch (error: any) {
            console.error("Fetch error:", error.message);
            toast({ variant: "destructive", title: "Error Fetching Data", description: error.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteMarketplaceItem = async (id: string) => {
        try {
            const { error } = await supabase.from('marketplace_items').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Deleted item", description: "Marketplace item was successfully deleted." });
            setMarketplaceItems(prev => prev.filter(item => item.id !== id));
        } catch (err: any) {
            toast({ variant: "destructive", title: "Delete Failed", description: err.message });
        }
    };

    const handleDeleteLostFoundItem = async (id: string) => {
        try {
            const { error } = await supabase.from('lost_found_items').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Deleted item", description: "Lost & Found item was successfully deleted." });
            setLostFoundItems(prev => prev.filter(item => item.id !== id));
        } catch (err: any) {
            toast({ variant: "destructive", title: "Delete Failed", description: err.message });
        }
    };

    const handleVacateSeat = async (id: string) => {
        try {
            const { error } = await supabase
                .from('lrc_seats')
                .update({ status: 'Available', vacant_at: null, booked_by: null })
                .eq('id', id);
            if (error) throw error;
            toast({ title: "Vacated Seat", description: `Seat ${id} was successfully vacated.` });
            setLrcSeats(prev => prev.filter(item => item.id !== id));
        } catch (err: any) {
            toast({ variant: "destructive", title: "Update Failed", description: err.message });
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="h-[80vh] flex items-center justify-center">
                    <Loader2 className="animate-spin h-10 w-10 text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black md:text-4xl text-foreground tracking-tight">Admin Dashboard</h1>
                        <p className="text-muted-foreground font-medium">Manage and moderate campus resources globally.</p>
                    </div>
                </div>

                <Tabs defaultValue="marketplace" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1 rounded-xl h-auto">
                        <TabsTrigger value="marketplace" className="py-3 text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            Marketplace
                        </TabsTrigger>
                        <TabsTrigger value="lostfound" className="py-3 text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            Lost & Found
                        </TabsTrigger>
                        <TabsTrigger value="lrcseats" className="py-3 text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            LRC Seats
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="marketplace">
                        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b border-border/50">
                                <CardTitle className="text-xl">Marketplace Moderation</CardTitle>
                                <CardDescription>Delete inappropriate or outdated listings.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {marketplaceItems.length > 0 ? (
                                    <div className="divide-y divide-border/50">
                                        {marketplaceItems.map(item => (
                                            <div key={item.id} className="flex justify-between items-center p-4 hover:bg-muted/10 transition-colors">
                                                <div>
                                                    <p className="font-bold text-foreground text-sm md:text-base">{item.title}</p>
                                                    <p className="text-xs md:text-sm text-muted-foreground">ID: {item.id} • Rs. {item.price}</p>
                                                </div>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteMarketplaceItem(item.id)} className="rounded-lg gap-2">
                                                    <Trash2 className="w-4 h-4" /> <span className="hidden md:inline">Delete</span>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">No marketplace items found.</div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="lostfound">
                        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b border-border/50">
                                <CardTitle className="text-xl">Lost & Found Moderation</CardTitle>
                                <CardDescription>Remove invalid or fulfilled reports.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {lostFoundItems.length > 0 ? (
                                    <div className="divide-y divide-border/50">
                                        {lostFoundItems.map(item => (
                                            <div key={item.id} className="flex justify-between items-center p-4 hover:bg-muted/10 transition-colors">
                                                <div>
                                                    <p className="font-bold text-foreground text-sm md:text-base">{item.title} ({item.type.toUpperCase()})</p>
                                                    <p className="text-xs md:text-sm text-muted-foreground">ID: {item.id} • Loc: {item.location}</p>
                                                </div>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteLostFoundItem(item.id)} className="rounded-lg gap-2">
                                                    <Trash2 className="w-4 h-4" /> <span className="hidden md:inline">Delete</span>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">No lost and found items found.</div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="lrcseats">
                        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b border-border/50">
                                <CardTitle className="text-xl">LRC Seat Administration</CardTitle>
                                <CardDescription>Force vacate currently occupied seats.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {lrcSeats.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                        {lrcSeats.map(seat => (
                                            <div key={seat.id} className="border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 rounded-xl flex flex-col justify-between items-center text-center gap-4">
                                                <div>
                                                    <p className="font-black text-2xl text-red-600 dark:text-red-400">{seat.id}</p>
                                                    <p className="text-xs text-red-500/80 font-semibold mt-1">Status: {seat.status}</p>
                                                </div>
                                                <Button variant="destructive" onClick={() => handleVacateSeat(seat.id)} className="w-full rounded-lg font-bold gap-2">
                                                    <LogOut className="w-4 h-4" /> Force Vacate
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">No occupied seats found in LRC.</div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>
        </DashboardLayout>
    );
}
