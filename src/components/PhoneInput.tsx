import { forwardRef } from "react";
import PhoneInputWithCountry from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, placeholder, disabled, className }, ref) => {
    return (
      <PhoneInputWithCountry
        international
        defaultCountry="FR"
        value={value}
        onChange={(val) => onChange(val || "")}
        disabled={disabled}
        className={cn("flex", className)}
        numberInputProps={{
          className: "flex-1"
        }}
        inputComponent={Input as any}
        countrySelectProps={{
          className: "border-r border-input bg-background"
        }}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";
