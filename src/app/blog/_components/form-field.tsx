import { Label } from "@/components/ui/label";
import { ReactNode } from "react";

interface FormFieldProps {
  name: string;
  error: string;
  children: ReactNode;
}

export default function FormField({ name, error, children }: FormFieldProps) {
  return (
    <div className="flex lg:gap-8 gap-3 lg:items-center flex-col lg:flex-row lg:justify-end">
      <Label htmlFor={name} className="lg:w-3/12">
        {name}
      </Label>
      <div className="lg:w-9/12">{children}</div>
      {error && (
        <p className="pt-1 text-xs font-semibold text-red-400">{error}</p>
      )}
    </div>
  );
}
