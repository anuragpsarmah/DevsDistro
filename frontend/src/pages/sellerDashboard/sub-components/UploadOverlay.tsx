import { UploadOverlayProps } from "../utils/types";
import { Upload } from "lucide-react";

export default function UploadOverlay({ uploadProgress }: UploadOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-2xl rounded-3xl pointer-events-none" />
        <div className="relative bg-gray-900/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10 w-80">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none rounded-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Upload className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Uploading Project
                </h3>
                <p className="text-xs text-gray-500">Please wait...</p>
              </div>
            </div>
            
            <div className="w-full bg-white/5 rounded-full h-3 mb-3 border border-white/10 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300 shadow-lg shadow-purple-500/30"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-gray-400 text-sm text-center">
              {uploadProgress.toFixed(0)}% Complete
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

