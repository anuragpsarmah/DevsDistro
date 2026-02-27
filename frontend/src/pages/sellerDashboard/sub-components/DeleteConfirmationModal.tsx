import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface DeleteConfirmationModalProps {
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteConfirm: () => Promise<void>;
}

export const DeleteConfirmationModal: React.FC<
  DeleteConfirmationModalProps
> = ({ deleteDialogOpen, setDeleteDialogOpen, handleDeleteConfirm }) => {
  return (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent className="bg-white dark:bg-[#050505] p-8 border-2 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] w-full max-w-lg mx-auto rounded-none overflow-hidden transition-colors duration-300">
        <AlertDialogHeader className="relative z-10 m-0 p-0">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 border-2 border-black dark:border-white flex items-center justify-center transition-colors duration-300 shrink-0 bg-transparent">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-left">
              <AlertDialogTitle className="font-syne text-xl font-bold uppercase tracking-wider text-black dark:text-white transition-colors duration-300 text-left">
                Confirm Deletion
              </AlertDialogTitle>
            </div>
          </div>
        </AlertDialogHeader>
        <div className="mb-8">
          <AlertDialogDescription className="font-space text-xs uppercase font-bold tracking-widest text-gray-500 transition-colors duration-300 text-left leading-relaxed">
            Are you sure you want to delete this project? This action cannot be undone.
          </AlertDialogDescription>
        </div>
        <AlertDialogFooter className="relative z-10 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
          <AlertDialogCancel className="bg-transparent border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black w-full sm:w-auto transition-all duration-300 rounded-none font-space uppercase tracking-widest font-bold text-xs py-3 px-6 h-auto m-0">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 text-white border-2 border-red-500 hover:bg-red-600 hover:border-red-600 w-full sm:w-auto transition-all duration-300 rounded-none font-space uppercase tracking-widest font-bold text-xs py-3 px-6 h-auto m-0"
            onClick={handleDeleteConfirm}
          >
            Delete Project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


