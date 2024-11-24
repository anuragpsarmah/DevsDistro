import { UploadOverlayProps } from "../utils/types";

export default function UploadOverlay({ uploadProgress }: UploadOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center lg:ml-[255.33px]">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-80">
        <h3 className="text-lg font-semibold text-white mb-4">
          Uploading Project...
        </h3>
        <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
          <div
            className="bg-gradient-to-r from-blue-400 to-purple-500 h-4 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <p className="text-gray-300 text-sm text-center">
          {uploadProgress.toFixed(0)}% Complete
        </p>
      </div>
    </div>
  );
}
