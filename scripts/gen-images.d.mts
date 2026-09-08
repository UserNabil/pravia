export type DeviceKind =
  // Accessoires de telephone : le perimetre de la boutique.
  | "phoneCase" | "screenProtector" | "charger" | "cable" | "powerBank" | "phoneHolder"
  | "earbuds" | "headphones" | "speaker" | "watch" | "tvBox"
  // Formes heritees, conservees pour les visuels d'illustration.
  | "phone" | "phoneBack" | "foldable" | "tablet" | "laptop" | "monitor"
  | "camera" | "gamepad" | "gpu" | "keyboard" | "drone";

export type ScreenPalette =
  | "aurora" | "ember" | "jade" | "violet" | "rose" | "cyan" | "gold" | "slate" | "emerald";

export declare const SCREENS: Record<ScreenPalette, [string, string, string]>;

export declare function renderDevice(
  name: string, kind: DeviceKind, frame: string, screen: ScreenPalette,
  opts?: { notch?: "island" | "punch"; cameras?: number }
): string;

/** Ecrit public/products/<name>.svg et retourne son URL publique. */
export declare function writeDevice(
  name: string, kind: DeviceKind, frame: string, screen: ScreenPalette,
  opts?: { notch?: "island" | "punch"; cameras?: number }
): string;
