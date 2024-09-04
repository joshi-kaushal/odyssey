import { Label } from "@/components/ui/label";
import { ReactNode } from "react";

interface FormFieldProps {
  name: string;
  error?: string;
  children: ReactNode;
}

export default function FormField({ name, error, children }: FormFieldProps) {
  console.log(JSON.stringify(error));
  return (
    <div className="flex lg:gap-8 gap-3 lg:items-center flex-col lg:flex-row lg:justify-end bg-white shadow-sm rounded-lg p-4">
      <Label htmlFor={name} className="lg:w-3/12 text-gray-700 font-semibold">
        {name}
      </Label>
      <div className="flex flex-col gap-2 lg:w-9/12">
        {children}
        {error && (
          <p className="pt-1 text-sm font-medium text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
