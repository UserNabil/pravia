import {
  Camera,
  Cpu,
  Gamepad2,
  Headphones,
  Laptop,
  Monitor,
  Package,
  Smartphone,
  Tablet,
  Watch,
} from "lucide-react";

const ICONS = {
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  headphones: Headphones,
  watch: Watch,
  "gamepad-2": Gamepad2,
  camera: Camera,
  cpu: Cpu,
  monitor: Monitor,
  package: Package,
} as const;

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

/** Resout le nom d'icone stocke en base vers un composant lucide. */
export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Package;
  return <Icon className={className} strokeWidth={1.9} />;
}
