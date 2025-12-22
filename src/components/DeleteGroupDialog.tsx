import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useDeleteGroup } from "@/hooks/useGroups";
import { DatabaseGroup } from "@/types";

interface DeleteGroupDialogProps {
  group: DatabaseGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteGroupDialog({ group, open, onOpenChange }: DeleteGroupDialogProps) {
  const deleteGroupMutation = useDeleteGroup();

  const handleDelete = async () => {
    if (!group) return;

    try {
      await deleteGroupMutation.mutateAsync(group.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  if (!group) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar agrupación?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar la agrupación <strong>"{group.name}"</strong>.
            <br /><br />
            Esta acción no se puede deshacer. Las bases de datos no se eliminarán, solo la agrupación.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteGroupMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteGroupMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteGroupMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}