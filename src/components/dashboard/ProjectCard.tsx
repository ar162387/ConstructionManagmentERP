import { Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, DollarSign, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusStyles = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export function ProjectCard({ project, onClick, showActions, onEdit, onDelete }: ProjectCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50',
        'group'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
              {project.name}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {project.description || '—'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge className={cn(statusStyles[project.status])}>
              {project.status.replace('_', ' ')}
            </Badge>
            {showActions && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  {onEdit && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Project
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Independent KPIs - no derived metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Allocated Budget</p>
            <p className="font-medium">Rs {project.budget.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Utilized Budget</p>
            <p className="font-medium">Rs {project.spent.toLocaleString()}</p>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(project.startDate, 'MMM yyyy')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>Allocated: Rs {(project.budget / 10000000).toFixed(1)}Cr</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
