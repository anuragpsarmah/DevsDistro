import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChangeEvent } from "react";

interface ProjectPriceSelectionProps {
  price: number;
  setPrice: (curr: number) => void;
}

export default function ProjectPriceSelection({
  price,
  setPrice,
}: ProjectPriceSelectionProps) {
  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPrice(parseInt(e.target.value));
  };

  return (
    <div className="border-t border-gray-600 pt-4">
      <Label htmlFor="price" className="text-gray-300 mb-3 block">
        Project Price (INR)
      </Label>
      <div className="relative flex justify-center">
        <div className="lg:w-1/3 md:w-1/3 w-1/2 relative">
          <span className="absolute top-1/2 left-3 transform -translate-y-1/2 text-3xl font-bold text-blue-400">
            ₹
          </span>
          <Input
            id="price"
            type="number"
            value={price}
            onChange={handlePriceChange}
            className="bg-gray-700 border-gray-600 text-gray-300 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 text-center appearance-none pl-10 pr-12"
            placeholder="e.g., 10000"
            required
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-1">
            <button
              type="button"
              onClick={() =>
                handlePriceChange({
                  target: { value: (price + 1).toString() },
                } as ChangeEvent<HTMLInputElement>)
              }
              className="text-gray-300 hover:text-blue-400 transition-colors text-[0.6rem] leading-tight"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() =>
                handlePriceChange({
                  target: { value: (price - 1).toString() },
                } as ChangeEvent<HTMLInputElement>)
              }
              className="text-gray-300 hover:text-blue-400 transition-colors text-[0.6rem] leading-tight"
            >
              ▼
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
