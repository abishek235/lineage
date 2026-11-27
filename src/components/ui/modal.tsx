import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay animate-fade fixed inset-0" />
        <Dialog.Content
          data-lineage-dialog=""
          className="modal-panel silk-card fixed border border-line bg-surface outline-none"
        >
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-2xl tracking-tight text-ink">{title}</Dialog.Title>
            <Dialog.Close
              className="grid size-11 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-accent-soft hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className={description ? "mt-2 text-sm text-pretty text-muted" : "sr-only"}>
            {description ?? title}
          </Dialog.Description>
          <div className="modal-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={body}>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
