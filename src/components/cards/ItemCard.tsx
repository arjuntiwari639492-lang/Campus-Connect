import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Laptop, Armchair,
  Shirt, Box, User, ArrowRight, Tag
} from "lucide-react";

// Function to return appropriate icon based on category
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Textbooks": return { icon: <BookOpen className="h-10 w-10" />, color: "bg-blue-100 text-blue-600" };
    case "Electronics": return { icon: <Laptop className="h-10 w-10" />, color: "bg-indigo-100 text-indigo-600" };
    case "Furniture": return { icon: <Armchair className="h-10 w-10" />, color: "bg-amber-100 text-amber-600" };
    case "Clothing": return { icon: <Shirt className="h-10 w-10" />, color: "bg-rose-100 text-rose-600" };
    default: return { icon: <Box className="h-10 w-10" />, color: "bg-slate-100 text-slate-600" };
  }
};

export function ItemCard({ name, price, seller, category, condition, onContact }: any) {
  const { icon, color } = getCategoryIcon(category);

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
      {/* Category Icon Header (Replaces Image) */}
      <div className={`h-40 ${color} flex items-center justify-center transition-colors group-hover:brightness-95`}>
        <div className="p-5 rounded-full bg-white/50 backdrop-blur-sm shadow-sm group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <Badge className="absolute top-4 right-4 bg-white/90 text-slate-900 border-none font-bold">
          {condition}
        </Badge>
      </div>

      <CardContent className="p-6">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">{category}</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">{name}</h3>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{seller}</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            ₹{price.toLocaleString()}
          </p>
        </div>

        <Button
          onClick={onContact}
          className="w-full h-11 rounded-lg bg-slate-900 hover:bg-blue-600 text-white font-bold transition-all shadow-sm"
        >
          Contact Seller <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}