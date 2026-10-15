import { useId } from "react";
import { TbAlertTriangle, TbCheck } from "react-icons/tb";
import { useAnnounce } from "../../../utils/hooks/useAccessibility";
import { OVERLAY_Z_PAGE_MODAL } from "../../popovers/overlayZIndex";
import { Modal } from "../../floating/Modal";

type ConfirmVariant = "danger" | "warning" | "info" | "success";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
}

const VARIANT_STYLES: Record<ConfirmVariant, { icon: string; confirm: string }> = {
  danger: { icon: "bg-red-100 text-red-600", confirm: "bg-red-600 hover:bg-red-700" },
  warning: { icon: "bg-yellow-100 text-yellow-600", confirm: "bg-yellow-600 hover:bg-yellow-700" },
  info: { icon: "bg-blue-100 text-blue-600", confirm: "bg-blue-600 hover:bg-blue-700" },
  success: { icon: "bg-green-100 text-green-600", confirm: "bg-green-600 hover:bg-green-700" },
};

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
  const announce = useAnnounce();
  const titleId = useId();
  const styles = VARIANT_STYLES[variant];
  const displayIcon =
    icon ||
    (variant === "success" ? (
      <TbCheck className="text-2xl" />
    ) : (
      <TbAlertTriangle className="text-2xl" />
    ));

  const handleConfirm = () => {
    onConfirm();
    onClose();
    announce(`${title} confirmed`, "assertive");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy={titleId}
      zIndex={OVERLAY_Z_PAGE_MODAL}
      surface={false}
      className="border-base-300 bg-base-100 w-full max-w-md overflow-hidden rounded-xl border shadow-xl"
    >
      <div className="p-6">
        <div className="mb-4 flex items-start gap-4">
          <div className={`${styles.icon} shrink-0 rounded-full p-3`}>{displayIcon}</div>
          <div className="flex-1">
            <h3 id={titleId} className="text-base-content mb-2 text-lg font-semibold">
              {title}
            </h3>
            <p className="text-neutral-content text-sm">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-base-300 text-neutral-content hover:bg-neutral hover:text-base-content rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white ${styles.confirm} rounded-lg transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
