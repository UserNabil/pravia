/**
 * Next impose un layout a la racine. Le vrai document, avec ses attributs
 * lang et dir, est produit par src/app/[locale]/layout.tsx : lui seul connait
 * la langue demandee.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
