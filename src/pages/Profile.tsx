import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Mail, MapPin, Calendar, LogOut, Settings, Edit, ShoppingBag, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  full_name: string;
  email: string;
  avatar_url: string;
  university: string;
  major: string;
  year: string;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  status: string;
  image_url: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    // Fetch Profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error(profileError);
    } else {
      setProfile(profileData || {
        full_name: user.email?.split('@')[0] || "User",
        email: user.email || "",
        avatar_url: "",
        university: "Campus Connect University",
        major: "Undeclared",
        year: "Freshman"
      });
    }

    // Fetch My Listings
    const { data: listings, error: listingsError } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('seller_id', user.id);

    if (!listingsError) {
      setMyListings(listings || []);
    }

    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Card */}
        <Card className="border-border/50 shadow-card overflow-hidden animate-fade-in">
          {/* Banner */}
          <div className="h-32 gradient-hero" />

          <CardContent className="relative pt-0 pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-6">
              <Avatar className="h-32 w-32 border-4 border-card shadow-lg">
                <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                <AvatarFallback className="text-2xl">{profile?.full_name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mb-12 pt-4">
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{profile?.full_name || "Student"}</h1>
                <p className="text-muted-foreground">{profile?.major || "Major"} • {profile?.year || "Year"}</p>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span>{profile?.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile?.university || "University"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {new Date().getFullYear()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Listings */}
        <Card className="border-border/50 shadow-card animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              My Listings
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/marketplace">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myListings.length > 0 ? myListings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      <img src={listing.image_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop"} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{listing.title}</p>
                      <p className="text-sm text-muted-foreground">${listing.price}</p>
                    </div>
                  </div>
                  <Badge variant={listing.status === "active" ? "success" : "secondary"}>
                    {listing.status === "active" ? "Active" : "Sold"}
                  </Badge>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-4">You haven't listed any items yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <Separator className="my-6" />
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
