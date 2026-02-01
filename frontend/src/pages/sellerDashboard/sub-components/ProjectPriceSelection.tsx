import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SolanaLogo } from "@/components/ui/solanaLogo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChangeEvent,
  useState,
  KeyboardEvent,
  FocusEvent,
  useEffect,
  useRef,
} from "react";
import { useRecoilValue } from "recoil";
import { userCurrency } from "@/utils/atom";
import axios, { AxiosResponse } from "axios";
import { tryCatch } from "@/utils/tryCatch.util";

interface ProjectPriceSelectionProps {
  price: number;
  setPrice: (curr: number) => void;
}

export default function ProjectPriceSelection({
  price,
  setPrice,
}: ProjectPriceSelectionProps) {
  const [inputValue, setInputValue] = useState<string>(price.toFixed(2));
  const currency = useRecoilValue(userCurrency);

  const [convertedValue, setConvertedValue] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
    const newPrice = Math.round((price + 0.01) * 100) / 100;
    setPrice(newPrice);
    setInputValue(newPrice.toFixed(2));
  };

  const decrementPrice = () => {
    const newPrice = Math.max(0, Math.round((price - 0.01) * 100) / 100);
    setPrice(newPrice);
    setInputValue(newPrice.toFixed(2));
  };

  useEffect(() => {
    if (!currency) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const [response, error] = await tryCatch<AxiosResponse>(() =>
        axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
          params: {
            ids: "solana",
            vs_currencies: currency.toLowerCase(),
          },
        })
      );

      if (error || !response) {
        setConvertedValue(null);
        return;
      }

      const value = response.data?.solana?.[currency.toLowerCase()];
      if (value) {
        const total = (value * price).toFixed(2);
        setConvertedValue(`${total} ${currency}`);
      } else {
        setConvertedValue(null);
      }
    }, 600);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [price, currency]);

  return (
    <div className="border-t border-white/10 pt-6">
      <Label htmlFor="price" className="text-gray-300 mb-3 block">
        Project Price (SOL)
      </Label>
      <div className="relative flex justify-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="lg:w-1/3 md:w-1/3 w-1/2 relative">
                <span className="absolute top-1/2 left-3 transform -translate-y-1/2 text-3xl font-bold text-blue-400">
                  <SolanaLogo className="w-6 h-6" />
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
                  className="bg-white/5 border-white/10 text-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-indigo-500/50 transition-colors duration-200 text-2xl font-bold text-center appearance-none pl-10 pr-12"
                  placeholder="e.g., 10000"
                  required
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-1">
                  <button
                    type="button"
                    onClick={incrementPrice}
                    className="text-gray-300 hover:text-blue-400 transition-colors text-[0.6rem] leading-tight"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={decrementPrice}
                    className="text-gray-300 hover:text-blue-400 transition-colors text-[0.6rem] leading-tight"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </TooltipTrigger>
            {convertedValue && (
              <TooltipContent side="top">≈ {convertedValue}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
