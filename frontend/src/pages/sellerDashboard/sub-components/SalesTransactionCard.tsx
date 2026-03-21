import { ExternalLink } from "lucide-react";
import { SalesTransactionCardProps } from "../utils/types";

const truncateTx = (signature: string) =>
  `${signature.slice(0, 8)}...${signature.slice(-8)}`;

export default function SalesTransactionCard({
  transaction,
  clusterParam,
}: SalesTransactionCardProps) {
  const title =
    transaction.projectId?.title ?? transaction.project_snapshot.title;
  const projectType =
    transaction.projectId?.project_type ??
    transaction.project_snapshot.project_type;

  return (
    <div className="border-2 border-black dark:border-white bg-white dark:bg-[#050505] transition-colors duration-300 hover:border-red-500 dark:hover:border-red-500">
      <div className="p-6 lg:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 w-full xl:w-auto flex-1">
          <div className="flex flex-col">
            <span className="font-space text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b-2 border-black/10 dark:border-white/10 pb-1">
              Sold Asset
            </span>
            <h3 className="font-space font-bold text-base text-black dark:text-white uppercase tracking-widest break-words hyphens-auto mt-1 line-clamp-2">
              {title}
            </h3>
            {title !== transaction.project_snapshot.title && (
              <span
                className="font-space text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 line-clamp-1"
                title={transaction.project_snapshot.title}
              >
                At sale: {transaction.project_snapshot.title}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="font-space text-[10px] bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 px-2 py-1 text-black dark:text-white uppercase tracking-widest transition-colors duration-300">
                {projectType}
              </span>
              {transaction.is_unlisted && (
                <span className="font-space text-[10px] font-bold text-white uppercase tracking-widest bg-red-500 px-2 py-1">
                  Unlisted
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-space text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b-2 border-black/10 dark:border-white/10 pb-1">
              Buyer
            </span>
            <div className="mt-1 space-y-1">
              <span className="block font-space font-bold text-sm text-black dark:text-white uppercase tracking-widest truncate">
                @{transaction.buyer_username || "unknown"}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-space text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b-2 border-black/10 dark:border-white/10 pb-1">
              Settlement Value
            </span>
            <div className="mt-1 flex items-end gap-3">
              <span className="font-syne font-black text-2xl lg:text-3xl text-black dark:text-white leading-none tracking-widest">
                ${transaction.price_usd.toFixed(2)}
              </span>
              <span className="font-space text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                {transaction.price_sol_total.toFixed(4)} SOL
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-space text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b-2 border-black/10 dark:border-white/10 pb-1">
              Timestamp
            </span>
            <div className="mt-1 flex flex-col justify-center h-full pb-3">
              <span className="block font-space font-bold text-sm text-black dark:text-white uppercase tracking-widest">
                {new Date(transaction.createdAt)
                  .toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })
                  .replace(/,/g, "")}
              </span>
              <span className="block font-space text-[10px] text-red-500 uppercase tracking-widest mt-1">
                {new Date(transaction.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "UTC",
                })}{" "}
                UTC
              </span>
            </div>
          </div>
        </div>

        <div className="pt-6 xl:pt-0 border-t-2 xl:border-t-0 xl:border-l-2 border-black/10 dark:border-white/10 xl:pl-8 flex w-full xl:w-auto shrink-0 transition-colors duration-300">
          <a
            href={`https://solscan.io/tx/${transaction.tx_signature}${clusterParam}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn relative w-full xl:w-auto inline-flex items-center justify-center gap-3 bg-black dark:bg-white text-white dark:text-black px-6 lg:px-8 py-4 font-space font-bold uppercase tracking-widest text-xs transition-colors duration-300 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2 group-hover/btn:text-white transition-colors">
              <span className="hidden sm:inline">Inspect TX</span>
              <span className="sm:hidden">
                TX: {truncateTx(transaction.tx_signature)}
              </span>
              <ExternalLink className="w-4 h-4" />
            </span>
            <div className="absolute inset-0 bg-red-500 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
          </a>
        </div>
      </div>
    </div>
  );
}
