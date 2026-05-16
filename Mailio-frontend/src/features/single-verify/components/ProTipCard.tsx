import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ProTipCard() {
  return (
    <Card className="border-amber-100 bg-amber-50/60">
      <CardContent className="pt-2 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={15} className="text-amber-500" />
          <span className="text-sm font-semibold text-amber-800">Pro Tip</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          Need to verify hundreds or thousands of emails at once? Use Bulk Verify to upload a CSV or TXT file and get results in minutes.
        </p>
      </CardContent>
    </Card>
  );
}
