import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { FolderKanban } from 'lucide-react';

export function ProjectSelector() {
  const { user } = useAuth();
  const {
    selectedProjectId,
    setSelectedProjectId,
    availableProjects,
    canViewAllProjects,
  } = useProject();

  if (!user) return null;

  // Only show for users who have project-scoped views (everyone has projects; company-level pages ignore selection)
  const showAllOption = canViewAllProjects;
  const options = availableProjects;

  if (options.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-3">
        <FolderKanban className="h-4 w-4" />
        <span>No projects assigned</span>
      </div>
    );
  }

  return (
    <Select
      value={selectedProjectId ?? (showAllOption ? '__all__' : options[0]?.id ?? '')}
      onValueChange={(value) =>
        setSelectedProjectId(value === '__all__' ? null : value)
      }
    >
      <SelectTrigger className="w-[220px] h-9">
        <FolderKanban className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Select project" />
      </SelectTrigger>
      <SelectContent className="bg-popover">
        {showAllOption && (
          <SelectItem value="__all__">All projects</SelectItem>
        )}
        {options.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
