import React, { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { AlertOctagon } from "lucide-react";

interface DeleteAccountModalProps {
    deleteDialogOpen: boolean;
    setDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
    deleteDialogOpen,
    setDeleteDialogOpen,
}) => {
    const [confirmationText, setConfirmationText] = useState("");

    const handleDeleteConfirm = () => {
        // API logic to be implemented
        console.log("Delete account triggered");
        setDeleteDialogOpen(false);
        setConfirmationText("");
    };

    const isConfirmed = confirmationText === "I CONFIRM";

    return (
        <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
                // Reset text when closing
                setTimeout(() => setConfirmationText(""), 300);
            }
        }}>
            <AlertDialogContent className="bg-white dark:bg-[#050505] p-8 border-2 border-red-500 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)] w-full max-w-2xl mx-auto rounded-none overflow-hidden transition-colors duration-300">
                <AlertDialogHeader className="relative z-10 m-0 p-0">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 border-2 border-red-500 flex items-center justify-center transition-colors duration-300 shrink-0 bg-red-500/10">
                            <AlertOctagon className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="text-left">
                            <AlertDialogTitle className="font-syne text-xl font-bold uppercase tracking-wider text-red-500 transition-colors duration-300 text-left">
                                Delete Account
                            </AlertDialogTitle>
                        </div>
                    </div>
                </AlertDialogHeader>

                <div className="mb-8 space-y-6">
                    <AlertDialogDescription className="font-space text-xs uppercase font-bold tracking-widest text-gray-600 dark:text-gray-400 transition-colors duration-300 text-left leading-relaxed">
                        This action <span className="text-red-500">cannot</span> be undone. This will permanently delete your account, remove all listed projects, and wipe your data from our servers.
                    </AlertDialogDescription>

                    <div className="space-y-3">
                        <label className="font-space text-[10px] md:text-xs font-bold uppercase tracking-widest text-black dark:text-white block group-focus-within:text-red-500 transition-colors duration-300">
                            Please type <span className="text-red-500 select-all">I CONFIRM</span> to verify.
                        </label>
                        <Input
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder="I CONFIRM"
                            className="bg-transparent border-2 border-black/20 dark:border-white/20 text-black dark:text-white hover:border-black dark:hover:border-white focus:border-red-500 focus:ring-0 rounded-none transition-colors duration-300 p-4 font-space h-auto"
                        />
                    </div>
                </div>

                <AlertDialogFooter className="relative z-10 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                    <AlertDialogCancel className="bg-transparent border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black w-full sm:w-auto transition-all duration-300 rounded-none font-space uppercase tracking-widest font-bold text-xs py-3 px-6 h-auto m-0">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={!isConfirmed}
                        className="bg-red-500 text-white border-2 border-red-500 hover:bg-red-600 hover:border-red-600 w-full sm:w-auto transition-all duration-300 rounded-none font-space uppercase tracking-widest font-bold text-xs py-3 px-6 h-auto m-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500 disabled:hover:border-red-500"
                        onClick={handleDeleteConfirm}
                    >
                        Permanently Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
