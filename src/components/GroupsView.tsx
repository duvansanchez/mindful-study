import React from 'react';
import { DatabaseGroup } from '@/types';
import { GroupCard } from './GroupCard';
import { CreateGroupDialog } from './CreateGroupDialog';
import { Folder, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GroupsViewProps {
  groups: DatabaseGroup[];
  groupsLoading: boolean;
  onGroupClick: (group: DatabaseGroup) => void;
  onEditGroup: (group: DatabaseGroup) => void;
  onDeleteGroup: (group: DatabaseGroup) => void;
  onShowGeneralInfo: () => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  groups,
  groupsLoading,
  onGroupClick,
  onEditGroup,
  onDeleteGroup,
  onShowGeneralInfo
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agrupaciones de estudio</h1>
          <p className="text-muted-foreground mt-1">
            Organiza tus bases de datos de Notion por temas o proyectos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onShowGeneralInfo}>
            Información general agrupaciones
          </Button>
          <CreateGroupDialog />
        </div>
      </div>
      
      {/* Content */}
      {groupsLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Cargando agrupaciones...</span>
        </div>
      ) : groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              databases={[]}
              onClick={() => onGroupClick(group)}
              onEdit={onEditGroup}
              onDelete={onDeleteGroup}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card border border-border rounded-lg">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
              <Folder className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Crea tu primera agrupación
            </h3>
            <p className="text-muted-foreground mb-6">
              Las agrupaciones te ayudan a organizar tus bases de datos de Notion 
              por temas, proyectos o cualquier criterio que prefieras.
            </p>
            <CreateGroupDialog>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                <Plus className="w-4 h-4" />
                Crear agrupación
              </button>
            </CreateGroupDialog>
          </div>
        </div>
      )}
    </div>
  );
};