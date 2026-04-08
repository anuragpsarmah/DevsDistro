import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChangeEvent, useState, KeyboardEvent, FocusEvent } from "react";

interface ProjectPriceSelectionProps {
  price: number;
  setPrice: (curr: number) => void;
  allowPaymentsInSol: boolean;
  setAllowPaymentsInSol: (curr: boolean) => void;
}

export default function ProjectPriceSelection({
  price,
  setPrice,
  allowPaymentsInSol,
  setAllowPaymentsInSol,
}: ProjectPriceSelectionProps) {
  const [inputValue, setInputValue] = useState<string>(price.toFixed(2));

  const isValidNumber = (val: string) => {
    return /^(\d+(\.\d{0,2})?)?$/.test(val);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || isValidNumber(val)) {
      setInputValue(val);
    }
  };

  const commitValue = (val: string) => {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      const rounded = Math.round(parsed * 100) / 100;
      setPrice(rounded);
      setInputValue(rounded.toFixed(2));
    } else {
      setInputValue(price.toFixed(2));
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    commitValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitValue(inputValue);
    }
  };

  const incrementPrice = () => {
    const newPrice = Math.round((price + 1) * 100) / 100;
    setPrice(newPrice);
    setInputValue(newPrice.toFixed(2));
  };

  const decrementPrice = () => {
    const newPrice = Math.max(0, Math.round((price - 1) * 100) / 100);
    setPrice(newPrice);
    setInputValue(newPrice.toFixed(2));
  };

  return (
    <div className="border-t-2 border-black/10 dark:border-white/10 pt-10 mt-10">
      <Label
        htmlFor="price"
        className="font-space text-[10px] uppercase font-bold tracking-[0.2em] text-gray-600 dark:text-gray-400 mb-6 block text-center"
      >
        Project Price (USD)
      </Label>
      <div className="relative flex flex-col items-center gap-4 mt-2">
        <div className="lg:w-1/3 md:w-1/3 w-1/2 relative bg-transparent border-2 border-black/20 dark:border-white/20 transition-colors duration-300">
          <span className="absolute top-1/2 left-4 transform -translate-y-1/2 flex items-center font-space font-black text-3xl md:text-4xl text-black dark:text-white leading-none">
            $
          </span>
          <Input
            id="price"
            type="text"
            inputMode="decimal"
            pattern="^\d+(\.\d{0,2})?$"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-0 text-black dark:text-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none transition-colors duration-300 font-space text-3xl md:text-4xl font-black text-center appearance-none py-8 pl-12 pr-12 h-auto"
            placeholder="0.00"
            required
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2">
            <button
              type="button"
              onClick={incrementPrice}
              className="text-black dark:text-white hover:text-red-500 dark:hover:text-red-500 transition-colors duration-200"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="square"
                strokeLinejoin="miter"
              >
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={decrementPrice}
              className="text-black dark:text-white hover:text-red-500 dark:hover:text-red-500 transition-colors duration-200"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="square"
                strokeLinejoin="miter"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAllowPaymentsInSol(!allowPaymentsInSol)}
          className={`group lg:w-1/3 md:w-1/3 w-1/2 p-5 flex items-center gap-4 text-left transition-colors duration-300 border-2 ${
            allowPaymentsInSol
              ? "border-red-500 bg-red-500/[0.02]"
              : "border-black/10 dark:border-white/10 hover:border-black/40 dark:hover:border-white/40"
          }`}
        >
          <div
            className={`flex items-center justify-center w-5 h-5 border-2 transition-colors duration-300 shrink-0 ${
              allowPaymentsInSol
                ? "border-red-500 bg-red-500 text-white"
                : "border-black/30 dark:border-white/30 text-transparent group-hover:border-black/60 dark:group-hover:border-white/60"
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="square"
              strokeLinejoin="miter"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <div className="flex flex-col gap-1">
            <p
              className={`font-space font-bold uppercase tracking-[0.2em] text-[10px] transition-colors duration-300 ${
                allowPaymentsInSol
                  ? "text-red-500"
                  : "text-black dark:text-white"
              }`}
            >
              Allow Payments In SOL
            </p>
            <p className="font-space text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Buyers will pay in USDC by default. Turn this on to also let them
              choose native SOL at checkout.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
