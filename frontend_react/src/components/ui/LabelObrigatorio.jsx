import * as React from "react";
import { Label } from "@/components/ui/label";

const LabelObrigatorio = React.forwardRef(({ htmlFor, children, obrigatorio, className }, ref) => {
  return (
    <Label htmlFor={htmlFor} className={`text-sm font-medium text-white flex items-center gap-1 ${className || ''}`} ref={ref}>
      <span className="whitespace-pre-line">{children}</span>{obrigatorio && <span className="text-red-500">*</span>}
    </Label>
  );
})

LabelObrigatorio.displayName = "LabelObrigatorio";

export default LabelObrigatorio; 