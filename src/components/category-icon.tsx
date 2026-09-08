import {
  AudioLines,
  BatteryCharging,
  Cable,
  Headphones,
  Package,
  PlugZap,
  ShieldCheck,
  Smartphone,
  SmartphoneCharging,
  Tv,
  Watch,
} from "lucide-react";

/**
 * Icones des categories.
 *
 * La boutique ne vend que des accessoires de telephone : la liste suit ce
 * perimetre, et non l'assortiment generaliste d'origine. Ajouter une categorie
 * demande d'ajouter son icone ici, faute de quoi elle retombe sur le carton.
 */
const ICONS = {
  smartphone: Smartphone,
  shield: ShieldCheck,
  plug: PlugZap,
  cable: Cable,
  battery: BatteryCharging,
  airpods: AudioLines,
  headphones: Headphones,
  watch: Watch,
  tv: Tv,
  stand: SmartphoneCharging,
  package: Package,
} as const;

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

/** Resout le nom d'icone stocke en base vers un composant lucide. */
export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Package;
  return <Icon className={className} strokeWidth={1.9} />;
}
