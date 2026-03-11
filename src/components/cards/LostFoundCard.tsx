import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MapPin, Calendar, MessageCircle, Mail, User, Package, Copy, CheckCircle2, AlertCircle } from "lucide-react";

interface LostFoundCardProps {
  id: string;
  name: string;
  description: string;
  location: string;
  date: string;
  type: "lost" | "found";
  reporter: string;
  reporterEmail?: string | null;
  reporterId?: string;
  currentUserId?: string | null;
  onMarkAsFound?: () => void;
}

export function LostFoundCard({
  name,
  description,
  location,
  date,
  type,
  reporter,
  reporterEmail,
  reporterId,
  currentUserId,
  onMarkAsFound,
}: LostFoundCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    if (!reporterEmail) return;
    navigator.clipboard.writeText(reporterEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Card className="overflow-hidden border-border/50 bg-card shadow-card hover:shadow-card-hover transition-all duration-300">
        <div className="flex flex-col sm:flex-row">
          {/* Icon Placeholder instead of Image */}
          <div className={`relative w-full sm:w-40 h-40 flex-shrink-0 flex items-center justify-center ${type === "lost" ? "bg-red-50 dark:bg-red-950/20" : "bg-emerald-50 dark:bg-emerald-950/20"}`}>
            {type === "lost" ? (
              <AlertCircle className="w-12 h-12 text-destructive" />
            ) : (
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            )}
            <Badge
              variant={type === "lost" ? "destructive" : "success"}
              className="absolute top-2 left-2"
            >
              {type === "lost" ? "Lost" : "Found"}
            </Badge>
          </div>
          <CardContent className="flex-1 p-4">
            <h3 className="font-semibold text-foreground text-lg mb-1">{name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{date}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reported by {reporter}</span>
              <div className="flex items-center gap-2">
                {currentUserId && currentUserId === reporterId && onMarkAsFound && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300"
                    onClick={onMarkAsFound}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as Found
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setOpen(true)}
                >
                  <MessageCircle className="h-4 w-4" />
                  Contact
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── Contact Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 shadow-2xl p-8">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Contact Reporter
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              Reach out to the person who {type === "found" ? "found" : "lost"} this item.
            </DialogDescription>
          </DialogHeader>

          {/* Item Summary Icon */}
          <div className="mt-4 p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${type === "lost" ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
              {type === "lost" ? (
                <AlertCircle className="w-8 h-8 text-destructive" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-900 dark:text-white truncate">{name}</p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <Package className="w-3.5 h-3.5" />
                <span className="truncate">{location}</span>
              </div>
              <Badge
                variant={type === "lost" ? "destructive" : "success"}
                className="mt-2 text-[10px] font-black uppercase tracking-wider"
              >
                {type === "lost" ? "Lost" : "Found"}
              </Badge>
            </div>
          </div>

          {/* Reporter Info */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Name</p>
                <p className="font-bold text-slate-900 dark:text-white truncate">{reporter}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Email</p>
                {reporterEmail ? (
                  <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{reporterEmail}</p>
                ) : (
                  <p className="text-slate-400 italic text-sm">Not provided</p>
                )}
              </div>
              {reporterEmail && (
                <button
                  onClick={handleCopyEmail}
                  className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                  title="Copy email"
                >
                  {copied
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <Copy className="w-4 h-4 text-slate-400" />
                  }
                </button>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-6 flex flex-col gap-3">
            {reporterEmail && (
              <a
                href={`mailto:${reporterEmail}?subject=Regarding your ${type} item: ${name}&body=Hi ${reporter},%0A%0AI saw your post about "${name}" on College Connect and would like to get in touch.%0A%0ARegards`}
                className="w-full py-4 rounded-[1.5rem] font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center gap-3 hover:opacity-90 transition-opacity active:scale-95 text-sm"
              >
                <Mail className="w-4 h-4" />
                SEND EMAIL
              </a>
            )}
            <Button
              variant="outline"
              className="w-full py-4 h-auto rounded-[1.5rem] font-black text-sm border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}