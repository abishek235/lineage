import { ConfirmDialog } from "@/components/ui/modal";
import { useEditor } from "@/lib/family/editor";
import { useFamilyStore } from "@/lib/family/store";

export function RestoreDialog() {
  const open = useEditor((state) => state.restoreOpen);
  const close = useEditor((state) => state.closeRestore);
  const restoreSample = useFamilyStore((state) => state.restoreSample);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title="Restore the sample family?"
      body="This replaces everyone currently in the record on this device with the sample Iyer and Menon family."
      confirmLabel="Restore sample"
      onConfirm={() => {
        restoreSample();
        close();
      }}
    />
  );
}
