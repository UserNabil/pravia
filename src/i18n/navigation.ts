import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Remplacants de Link, redirect et consorts, qui ajoutent d'eux-memes le
 * prefixe de langue. Les composants n'ont donc jamais a le manipuler.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
