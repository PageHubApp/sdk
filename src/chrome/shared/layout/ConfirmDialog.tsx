// @ts-nocheck
import { AnimatePresence, motion } from "framer-motion";
import ReactDOM from "react-dom";
import { TbAlertTriangle, TbCheck } from "react-icons/tb";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  icon?: React.ReactNode;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  icon,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
          confirmBg: "bg-red-600 hover:bg-red-700",
          confirmText: "text-white",
        };
      case "warning":
        return {
          iconBg: "bg-yellow-100",
          iconColor: "text-yellow-600",
          confirmBg: "bg-yellow-600 hover:bg-yellow-700",
          confirmText: "text-white",
        };
      case "info":
        return {
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          confirmBg: "bg-blue-600 hover:bg-blue-700",
          confirmText: "text-white",
        };
      case "success":
        return {
          iconBg: "bg-green-100",
          iconColor: "text-green-600",
          confirmBg: "bg-green-600 hover:bg-green-700",
          confirmText: "text-white",
        };
      default:
        return {
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
          confirmBg: "bg-red-600 hover:bg-red-700",
          confirmText: "text-white",
        };
    }
  };

  const getDefaultIcon = () => {
    switch (variant) {
      case "danger":
        return <TbAlertTriangle className="text-2xl" />;
      case "warning":
        return <TbAlertTriangle className="text-2xl" />;
      case "info":
        return <TbAlertTriangle className="text-2xl" />;
      case "success":
        return <TbCheck className="text-2xl" />;
      default:
        return <TbAlertTriangle className="text-2xl" />;
    }
  };

  const styles = getVariantStyles();
  const displayIcon = icon || getDefaultIcon();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-9997 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Dialog */}
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md border border-border bg-background shadow-xl"
          style={{ borderRadius: "12px", overflow: "hidden" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Icon and Title */}
            <div className="mb-4 flex items-start gap-4">
              <div className={`${styles.iconBg} ${styles.iconColor} shrink-0 rounded-full p-3`}>
                {displayIcon}
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium ${styles.confirmBg} ${styles.confirmText} rounded-lg transition-colors`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
