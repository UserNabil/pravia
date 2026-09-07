# Polices des images sociales

Satori, qui produit les images OpenGraph, ne dispose d'aucune police systeme :
sans fichier fourni, l'arabe s'afficherait en carres. Ces deux fichiers sont
donc lus a l'execution par `src/lib/og-fonts.ts`.

| Fichier | Usage | Licence |
| --- | --- | --- |
| `inter-700.ttf` | francais et anglais | SIL Open Font License 1.1 |
| `noto-sans-arabic-700.ttf` | arabe | SIL Open Font License 1.1 |

Les deux sont redistribuables sous OFL 1.1, y compris embarquees dans un
produit commercial, a condition de ne pas les vendre seules et de conserver
la mention de licence — c'est l'objet de ce fichier.

- Inter : <https://github.com/rsms/inter> (Rasmus Andersson)
- Noto Sans Arabic : <https://fonts.google.com/noto/specimen/Noto+Sans+Arabic> (Google)

Texte integral de la licence : <https://openfontlicense.org/>
