import { UploadOverlayProps } from "../utils/types";
import { Upload } from "lucide-react";

export default function UploadOverlay({ uploadProgress }: UploadOverlayProps) {
  return (
    <div className="fixed inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm">
        <div className="relative bg-white dark:bg-[#050505] p-8 border-2 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] transition-colors duration-300">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 border-2 border-black dark:border-white flex items-center justify-center transition-colors duration-300">
                <Upload className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-syne text-xl font-bold uppercase tracking-wider text-black dark:text-white transition-colors duration-300">
                  Uploading Project
                </h3>
                <p className="font-space text-xs uppercase font-bold tracking-widest text-gray-500 transition-colors duration-300">
                  Please wait...
                </p>
              </div>
            </div>

            <div className="w-full bg-black/5 dark:bg-white/5 border-2 border-black dark:border-white h-6 mb-4 overflow-hidden relative transition-colors duration-300">
              <div
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="font-space text-xs uppercase font-bold tracking-widest text-gray-500">
                Progress
              </p>
              <p className="font-space text-sm uppercase font-bold tracking-widest text-black dark:text-white">
                {uploadProgress.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
