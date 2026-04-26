import { useEffect } from "react";
import ReactDOM from "react-dom";
import { TbAlertTriangle, TbCheck } from "react-icons/tb";
import { useFocusTrap, useAnnounce } from "../../../utils/hooks/useAccessibility";

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
  const focusTrapRef = useFocusTrap(isOpen);
  const announce = useAnnounce();

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

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
    announce(`${title} confirmed`, "assertive");
  };

  return ReactDOM.createPortal(
    <div
      className="pagehub-sdk-root ph-modal-backdrop ph-modal-backdrop--center"
      style={{ zIndex: 2147483000 }}
      onClick={onClose}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="pagehub-sdk-root ph-modal-surface w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icon and Title */}
          <div className="mb-4 flex items-start gap-4">
            <div className={`${styles.iconBg} ${styles.iconColor} shrink-0 rounded-full p-3`}>
              {displayIcon}
            </div>
            <div className="flex-1">
              <h3
                id="confirm-dialog-title"
                className="text-base-content mb-2 text-lg font-semibold"
              >
                {title}
              </h3>
              <p className="text-neutral-content text-sm">{message}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="border-base-300 text-neutral-content hover:bg-neutral hover:text-base-content rounded-md border px-4 py-2 text-sm font-medium transition-colors"
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
      </div>
    </div>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
