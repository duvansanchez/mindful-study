import { cn } from "@/lib/utils";
import { KnowledgeState } from "@/types";

interface StateBadgeProps {
  state: KnowledgeState;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  active?: boolean;
  showLabel?: boolean;
  disabled?: boolean;
}

const stateLabels: Record<KnowledgeState, string> = {
  tocado: 'Tocado',
  verde: 'Verde',
  solido: 'Sólido',
};

const stateDescriptions: Record<KnowledgeState, string> = {
  tocado: 'Requiere repaso frecuente',
  verde: 'Requiere repaso ocasional',
  solido: 'No requiere repaso activo',
};

export function StateBadge({ state, size = 'md', onClick, active = true, showLabel = true, disabled = false }: StateBadgeProps) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick || disabled}
      className={cn(
        "rounded-md font-medium transition-all duration-200",
        sizeClasses[size],
        state === 'tocado' && "bg-state-tocado-bg text-state-tocado",
        state === 'verde' && "bg-state-verde-bg text-state-verde",
        state === 'solido' && "bg-state-solido-bg text-state-solido",
        onClick && !disabled && "cursor-pointer hover:opacity-80",
        (!onClick || disabled) && "cursor-default",
        !active && "opacity-40",
        disabled && "opacity-50"
      )}
      title={stateDescriptions[state]}
    >
      {showLabel && stateLabels[state]}
    </button>
  );
}

export { stateLabels, stateDescriptions };
