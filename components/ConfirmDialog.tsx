import React from "react";
import { Button } from "./ui/button";
import CustomBtn from "./CustomBtn";

interface ConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center rounded-xl z-50">
      <div className="bg-card border border-border rounded-md p-4 w-[90%] max-w-sm shadow-md space-y-2 text-xs">
        <h3 className="text-[18px] font-semibold text-foreground">End Chat?</h3>
        <p className="text-muted-foreground text-[12px] sm:text-[14px]">
          Are you sure you want to end this conversation? This will clear all messages.
        </p>
        <div className="flex justify-end gap-2">
          <CustomBtn onClick={onCancel} className="text-muted-foreground text-xs cursor-pointer">
            Cancel
          </CustomBtn>
          <Button variant="destructive" className="text-xs cursor-pointer" onClick={onConfirm}>
            End Chat
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
