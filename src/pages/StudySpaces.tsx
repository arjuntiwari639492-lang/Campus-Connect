import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  User,
  CheckCircle2,
  Loader2,
  BellRing,
  Timer,
  Search,
  Info,
  Zap,
  Armchair,
  History,
  ShieldCheck,
  Map as MapIcon,
  LogOut
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interface for Seat Data
interface Seat {
  id: string;
  status?: string | null;
  vacant_at?: string | null;
  type?: string | null;
  parent?: string | null;
  booked_by?: string | null;
  [key: string]: unknown;
}

export default function StudySpaces() {
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [bookingDuration, setBookingDuration] = useState([120]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const [notifyList, setNotifyList] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('notifySeats');
      return raw ? JSON.parse(raw) as string[] : [];
    } catch { return []; }
  });

  // Detect if this user already has an active booking
  const userActiveBooking = useMemo(
    () => seats.find(s => s.booked_by === userId && s.status === 'Occupied') ?? null,
    [seats, userId]
  );

  // Calculate Statistics
  const stats = useMemo(() => {
    const total = seats.length || 1;
    const occupied = seats.filter(s => s.status === 'Occupied').length;
    return {
      total,
      occupied,
      available: total - occupied,
      percent: Math.round((occupied / total) * 100)
    };
  }, [seats]);

  // Filter seats based on search
  const filteredSeats = useMemo(() => {
    if (!searchQuery) return seats;
    return seats.filter(s => s.id.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [seats, searchQuery]);

  useEffect(() => {
    const initializeData = async () => {
      // 1. Get User Session for DB Authorization
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      // 2. Fetch Initial Seats
      const { data, error } = await supabase.from('lrc_seats').select('*');
      if (error) {
        toast({ variant: "destructive", title: "Sync Error", description: error.message });
      } else {
        setSeats((data as Seat[]) || []);
      }
      setLoading(false);
    };

    initializeData();

    // 3. Real-time Subscription with cleanup
    const channel = supabase
      .channel('lrc_realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lrc_seats' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updatedSeat = payload.new as Seat;
          setSeats((current) => current.map((s) => s.id === updatedSeat.id ? updatedSeat : s));

          // Notification Logic
          if (updatedSeat.status === 'Available') {
            setNotifyList((prev) => {
              if (prev.includes(updatedSeat.id)) {
                toast({ title: 'Seat Free!', description: `The resource ${updatedSeat.id} is now available for booking.` });
                const next = prev.filter((id) => id !== updatedSeat.id);
                localStorage.setItem('notifySeats', JSON.stringify(next));
                return next;
              }
              return prev;
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [toast]);

  const handleBooking = async () => {
    if (!selectedSeat || selectedSeat.status === 'Occupied' || !userId) {
      if (!userId) toast({ variant: "destructive", title: "Access Denied", description: "Please log in to book seats." });
      return;
    }

    // One seat per user — block if they already have an active booking
    if (userActiveBooking) {
      toast({
        variant: "destructive",
        title: "Booking Limit Reached",
        description: `You already have seat ${userActiveBooking.id} booked. Please vacate it before booking another.`,
      });
      return;
    }

    const vacantAt = new Date(Date.now() + bookingDuration[0] * 60 * 1000).toISOString();

    // Optimistic UI update: mark seat as occupied locally immediately
    const prevSeats = seats;
    const optimistic: Seat = { ...selectedSeat, status: 'Occupied', vacant_at: vacantAt, booked_by: userId };
    setSeats((prev) => {
      const exists = prev.some(s => s.id === selectedSeat.id);
      if (exists) return prev.map(s => s.id === selectedSeat.id ? optimistic : s);
      return [...prev, optimistic];
    });

    // Persist to server and request the updated row back
    const { data, error } = await supabase
      .from('lrc_seats')
      .update({ status: 'Occupied', vacant_at: vacantAt, booked_by: userId })
      .eq('id', selectedSeat.id)
      .select()
      .single();

    if (error) {
      // rollback optimistic change
      setSeats(prevSeats);
      toast({ variant: 'destructive', title: 'Transaction Failed', description: error.message });
    } else {
      // replace with server-canonical row
      setSeats((prev) => prev.map((s) => s.id === (data as Seat).id ? (data as Seat) : s));
      toast({ title: 'Booking Confirmed!', description: `Seat ${selectedSeat.id} is yours for ${bookingDuration[0]} minutes.` });
      setSelectedSeat(null);
    }
  };

  const handleVacate = async () => {
    if (!selectedSeat || selectedSeat.booked_by !== userId) return;

    const { error } = await supabase
      .from('lrc_seats')
      .update({ status: 'Available', vacant_at: null, booked_by: null })
      .eq('id', selectedSeat.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } else {
      toast({ title: 'Seat Vacated', description: `You have successfully released seat ${selectedSeat.id}.` });
      setSelectedSeat(null);
    }
  };

  const handleNotifyMe = () => {
    if (!selectedSeat) return;
    const id = selectedSeat.id;
    setNotifyList((prev) => {
      if (prev.includes(id)) {
        toast({ title: 'Alert Active', description: "You're already on the list for this seat." });
        return prev;
      }
      const next = [...prev, id];
      localStorage.setItem('notifySeats', JSON.stringify(next));
      toast({ title: 'Notification Set', description: `We'll ping you as soon as ${id} is free.` });
      return next;
    });
  };

  const getSeatData = (id: string) => seats.find(s => s.id === id) ?? ({ status: 'Available' } as Seat);

  /**
   * 3D CHAIR COMPONENT
   */
  const Chair = ({ id, type }: { id: string, type: string }) => {
    const data = getSeatData(id);
    const isOccupied = data.status === 'Occupied';
    const isSelected = selectedSeat?.id === id;
    const isMyBooking = data.booked_by === userId && isOccupied;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative group flex flex-col items-center">
              <button
                onClick={() => {
                  setSelectedSeat({ id, type, ...data });
                  if (!isOccupied) setBookingDuration([120]);
                }}
                className={`
                  relative w-8 h-8 transition-all duration-300 transform
                  ${isSelected ? '-translate-y-2 scale-110' : 'hover:-translate-y-1'}
                  ${isOccupied ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {/* Visual Heatmap Pulse for busy seats */}
                {isOccupied && !isMyBooking && (
                  <div className="absolute inset-0 bg-red-400 rounded-lg animate-ping opacity-20" />
                )}

                {/* Chair Backrest */}
                <div className={`
                  absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 rounded-t-md
                  ${isMyBooking ? 'bg-blue-700' : isOccupied ? 'bg-red-800' : 'bg-emerald-800'}
                `} />

                {/* Chair Cushion */}
                <div className={`
                  w-full h-full rounded-lg shadow-[0_5px_0_0_rgba(0,0,0,0.15)]
                  flex items-center justify-center border-b-4
                  ${isMyBooking
                    ? 'bg-blue-500 border-blue-700 shadow-blue-900/20'
                    : isOccupied
                      ? 'bg-red-600 border-red-800 shadow-red-900/20'
                      : 'bg-emerald-500 border-emerald-700 shadow-emerald-900/20'}
                  ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
                `}>
                  {isMyBooking ? (
                    <ShieldCheck className="w-4 h-4 text-white" />
                  ) : (
                    <User className={`w-3.5 h-3.5 ${isOccupied ? 'text-white/40' : 'text-white/60'}`} />
                  )}
                </div>
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-bold text-xs">{id} - {data.status}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  /**
   * 3D SOFA COMPONENT
   */
  const Sofa = ({ id }: { id: string }) => {
    const data = getSeatData(id);
    const isOccupied = data.status === 'Occupied';
    const isSelected = selectedSeat?.id === id;

    return (
      <button
        onClick={() => setSelectedSeat({ id, type: 'Premium Sofa', ...data })}
        className={`
          relative w-32 h-16 transition-all duration-500
          rounded-2xl border-b-[8px] flex flex-col items-center justify-center
          ${isOccupied
            ? 'bg-slate-200 border-slate-300 text-slate-400 grayscale'
            : 'bg-gradient-to-b from-amber-50 to-amber-100 border-amber-300 text-amber-800 hover:scale-105'}
          ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-4 -translate-y-2' : ''}
          shadow-md
        `}
      >
        <Armchair className={`w-6 h-6 mb-1 ${isOccupied ? 'opacity-20' : 'opacity-70'}`} />
        <span className="text-[9px] font-black tracking-widest">PREMIUM</span>
      </button>
    );
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="relative">
        <Loader2 className="animate-spin h-16 w-16 text-blue-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
        </div>
      </div>
      <p className="mt-4 text-slate-500 font-bold tracking-widest text-xs uppercase animate-pulse">Syncing Floor Plan</p>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-[1700px] mx-auto space-y-6 pb-10 px-2 sm:px-4">

        {/* Advanced Header */}
        <header className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 sm:gap-6 bg-white p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border shadow-xl border-slate-100">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
              <MapIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              LRC Ground Floor
            </h1>
            <p className="text-slate-400 font-medium text-xs sm:text-sm">Level 2 • North Wing Seating</p>
          </div>

          <div className="flex justify-center gap-4 sm:gap-8 border-y md:border-y-0 md:border-x border-slate-100 py-4 md:py-0">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-black text-emerald-600">{stats.available}</p>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-black text-slate-300">{stats.total}</p>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Units</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
            <Input
              placeholder="Find seat (e.g. I-12)..."
              className="pl-10 sm:pl-12 h-12 sm:h-14 bg-slate-50 border-none rounded-xl sm:rounded-2xl font-medium focus-visible:ring-blue-600 text-sm sm:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Interactive Floor Plan Map */}
          <Card className="lg:col-span-9 bg-[#fcfdfe] border-none relative h-[600px] sm:h-[900px] overflow-x-auto overflow-y-hidden shadow-2xl rounded-[1.5rem] sm:rounded-[3rem] p-4 sm:p-12">

            {/* Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{ backgroundImage: `linear-gradient(#000 1.5px, transparent 1.5px), linear-gradient(90deg, #000 1.5px, transparent 1.5px)`, backgroundSize: '40px 40px' }} />

            <div className="relative w-[1200px] lg:w-full h-full">

              {/* Premium Lounge Area */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-white/40 rounded-3xl border border-slate-100 backdrop-blur-sm flex items-center justify-around px-10">
                <div className="absolute -top-3 left-10 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">LOUNGE ZONE</div>
                {[...Array(6)].map((_, i) => <Sofa key={i} id={`Sofa-${i + 1}`} />)}
              </div>

              {/* Collaborative Pods - Left */}
              <div className="absolute left-0 top-44 bottom-28 flex flex-col justify-between w-64">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative group transition-all hover:shadow-xl">
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-emerald-400 rounded-full" />
                    <span className="text-[9px] font-black text-slate-300 mb-4 block tracking-[0.2em]">POD ALPHA {i + 1}</span>
                    <div className="grid grid-cols-4 gap-4">
                      {[...Array(8)].map((_, j) => <Chair key={j} id={`GT-L${i + 1}-S${j + 1}`} type="Collaborative Seat" />)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Collaborative Pods - Right */}
              <div className="absolute right-0 top-44 bottom-28 flex flex-col justify-between w-64">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative group transition-all hover:shadow-xl text-right">
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-400 rounded-full" />
                    <span className="text-[9px] font-black text-slate-300 mb-4 block tracking-[0.2em]">POD BETA {i + 1}</span>
                    <div className="grid grid-cols-4 gap-4">
                      {[...Array(8)].map((_, j) => <Chair key={j} id={`GT-R${i + 1}-S${j + 1}`} type="Collaborative Seat" />)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Deep Focus Central Zone */}
              <div className="absolute inset-x-72 top-44 bottom-32 bg-gradient-to-tr from-white to-slate-50/50 rounded-[4rem] border-2 border-slate-100 shadow-inner p-10 flex flex-col items-center">
                <div className="flex items-center gap-4 bg-slate-900 text-white px-6 py-2 rounded-full mb-12 shadow-2xl">
                  <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                  <span className="text-xs font-black tracking-[0.3em] uppercase">Deep Focus Silent Zone</span>
                </div>
                <div className="grid grid-cols-8 gap-x-10 gap-y-12">
                  {[...Array(40)].map((_, i) => <Chair key={i} id={`I-${i + 1}`} type="Silent Desk" />)}
                </div>
              </div>

              {/* Entry Portal Decoration */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-10 flex flex-col items-center">
                <div className="w-full h-1 bg-slate-200 rounded-full blur-[1px]" />
                <span className="mt-4 text-[10px] font-black text-slate-300 tracking-[0.6em]">SECURITY CHECKPOINT</span>
              </div>
            </div>
          </Card>

          {/* Detailed Control Panel */}
          <aside className="lg:col-span-3 space-y-6">
            {/* Color Legend */}
            <Card className="p-4 sm:p-6 border-none shadow-xl rounded-[1.5rem] sm:rounded-[2rem] bg-white space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Floor Map Legend</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-emerald-500 rounded border-b-2 border-emerald-700" />
                  <span className="text-xs font-bold text-slate-600">Vacant Seat</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded border-b-2 border-blue-700" />
                  <span className="text-xs font-bold text-slate-600">Your Reservation</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-600 rounded border-b-2 border-red-800" />
                  <span className="text-xs font-bold text-slate-600">Occupied by Other</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 sm:p-8 border-none shadow-2xl rounded-[1.5rem] sm:rounded-[3rem] bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                <History className="w-20 h-20 sm:w-32 sm:h-32" />
              </div>

              <h3 className="text-lg sm:text-xl font-black mb-6 sm:mb-8 flex items-center gap-3 text-slate-800">
                <div className="w-2 h-6 bg-blue-600 rounded-full" />
                Resource Terminal
              </h3>

              {selectedSeat ? (
                <div className="space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-300">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter">{selectedSeat.id}</p>
                        <Badge variant="outline" className="mt-2 border-slate-200 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">
                          {selectedSeat.type}
                        </Badge>
                      </div>
                      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center ${selectedSeat.status === 'Occupied' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {selectedSeat.status === 'Occupied' ? <Clock className="w-5 h-5 sm:w-6 sm:h-6" /> : <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 transition-colors ${selectedSeat.status === 'Occupied'
                    ? 'bg-red-50/50 border-red-100 text-red-800'
                    : 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
                    }`}>
                    <p className="font-black text-[10px] uppercase tracking-widest mb-1">Status</p>
                    <p className="text-lg sm:text-xl font-bold">{selectedSeat.booked_by === userId ? "Your Reserved Seat" : selectedSeat.status}</p>

                    {selectedSeat.vacant_at && (
                      <div className="mt-4 pt-4 border-t border-red-100/50 flex items-center gap-3 text-xs sm:text-sm font-bold">
                        <Timer className="w-4 h-4" />
                        Free at: {new Date(selectedSeat.vacant_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  {selectedSeat.status === 'Available' ? (
                    <div className="space-y-6">
                      {/* Warning banner when user already has an active booking */}
                      {userActiveBooking && (
                        <div className="p-4 rounded-[1.25rem] sm:rounded-[1.5rem] bg-amber-50 border-2 border-amber-200 text-amber-800 flex items-start gap-3">
                          <Info className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 text-amber-500" />
                          <div>
                            <p className="font-black text-[10px] uppercase tracking-widest">Seat Limit Reached</p>
                            <p className="text-[10px] sm:text-xs mt-1 font-medium">
                              You have <span className="font-black">{userActiveBooking.id}</span> already booked. Vacate it first.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black uppercase text-slate-400">Duration (Mins)</p>
                          <span className="text-base sm:text-lg font-black text-blue-600">{bookingDuration[0]}</span>
                        </div>
                        <Slider
                          defaultValue={[120]}
                          max={240}
                          min={30}
                          step={30}
                          onValueChange={(val) => setBookingDuration(val)}
                          className="py-4"
                        />
                      </div>

                      <button
                        onClick={handleBooking}
                        disabled={!!userActiveBooking}
                        className={`group w-full py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] font-black transition-all duration-300 shadow-xl flex items-center justify-center gap-3 active:scale-95 text-sm sm:text-base
                          ${userActiveBooking
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-slate-900 text-white hover:bg-blue-600'}`}
                      >
                        CONFIRM RESERVATION
                        <Zap className="w-4 h-4 group-hover:text-yellow-400 transition-colors" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedSeat.booked_by === userId ? (
                        <button
                          onClick={handleVacate}
                          className="w-full py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] font-black bg-red-600 text-white flex items-center justify-center gap-3 hover:bg-red-700 transition-all duration-300 active:scale-95 shadow-lg text-sm sm:text-base"
                        >
                          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" /> LEAVE SEAT NOW
                        </button>
                      ) : (
                        <button
                          onClick={handleNotifyMe}
                          className="w-full py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] font-black border-2 border-slate-900 text-slate-900 flex items-center justify-center gap-3 hover:bg-slate-900 hover:text-white transition-all duration-300 active:scale-95 shadow-lg text-sm sm:text-base"
                        >
                          <BellRing className="w-4 h-4 sm:w-5 sm:h-5" /> NOTIFY ME WHEN FREE
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 sm:py-20 text-center space-y-4 sm:space-y-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mx-auto text-slate-200">
                    <MapIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] leading-relaxed">
                    Interactive Map Active.<br />Select a terminal to initiate booking.
                  </p>
                </div>
              )}
            </Card>

            {/* Global Stats Dashboard Widget */}
            <Card className="p-6 sm:p-8 bg-slate-900 rounded-[1.5rem] sm:rounded-[3rem] text-white border-none shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-blue-600/20 blur-[60px] group-hover:bg-blue-600/40 transition-all" />
              <p className="text-[8px] sm:text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 sm:mb-6">Real-time Occupancy</p>
              <div className="flex items-end justify-between mb-4">
                <span className="text-4xl sm:text-5xl font-black italic">{stats.percent}%</span>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Live Density</p>
                  <p className="text-[8px] sm:text-[10px] font-medium text-emerald-400">Peak Hours</p>
                </div>
              </div>
              <div className="w-full h-2 sm:h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-1000 ease-out"
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
              <div className="mt-4 sm:mt-6 flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase">Stable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase">Syncing...</span>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}