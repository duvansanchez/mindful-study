import { DatabaseGroup, Database } from "@/types";
import { Folder, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface GroupCardProps {
  group: DatabaseGroup;
  databases: Database[];
  onClick: () => void;
  onEdit?: (group: DatabaseGroup) => void;
  onDelete?: (group: DatabaseGroup) => void;
}

export function GroupCard({ group, databases, onClick, onEdit, onDelete }: GroupCardProps) {
  const totalCards = databases.reduce((acc, db) => acc + db.cardCount, 0);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(group);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(group);
  };

  return (
    <button
      onClick={onClick}
      className="group w-full text-left p-4 rounded-lg bg-card border border-border hover:border-muted-foreground/20 transition-all duration-200 animate-fade-in"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${group.color}20` }}
          >
            <Folder className="w-5 h-5" style={{ color: group.color }} />
          </div>
          <div>
            <h3 className="font-medium text-foreground group-hover:text-foreground/90">
              {group.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {databases.length} bases · {totalCards} tarjetas
            </p>
          </div>
        </div>
        
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onEdit && (
                <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mt-3 flex gap-1">
        {databases.slice(0, 4).map((db) => (
          <span key={db.id} className="text-sm">
            {db.icon}
          </span>
        ))}
        {databases.length > 4 && (
          <span className="text-xs text-muted-foreground ml-1">
            +{databases.length - 4}
          </span>
        )}
      </div>
    </button>
  );
}
