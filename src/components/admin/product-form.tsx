"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2, Plus, X } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { CONDITIONS, CONDITION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/format";

export type ProductFormValues = {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  condition: string;
  minOrder: string;
  warrantyMonths: string;
  categoryId: string;
  brandId: string;
  storage: string;
  color: string;
  carrier: string;
  imageUrl: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  noIndex: boolean;
  tradeAssurance: boolean;
  readyToShip: boolean;
  featured: boolean;
  active: boolean;
  specs: { label: string; value: string }[];
};

export function ProductForm({
  action,
  values,
  categories,
  brands,
  submitLabel,
  slug,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  values: ProductFormValues;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  submitLabel: string;
  slug?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [specs, setSpecs] = useState(
    values.specs.length ? values.specs : [{ label: "", value: "" }]
  );
  const [preview, setPreview] = useState(values.imageUrl);

  return (
    <form action={formAction} className="grid gap-5 xl:grid-cols-[1fr_20rem] xl:items-start">
      <div className="space-y-5">
        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Informations generales</h2>

          <div className="mt-4 grid gap-4">
            <Field label="Titre" name="title" defaultValue={values.title} required />
            <Field
              label="Sous-titre"
              name="subtitle"
              defaultValue={values.subtitle}
              placeholder="Ecran 6.8 pouces, S Pen integre"
            />
            <div>
              <label htmlFor="description" className="label">
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={values.description}
                required
                rows={6}
                className="input resize-y"
                placeholder="Decrivez le produit, ses points forts et ses usages."
              />
            </div>
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Prix et stock</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Prix de vente (EUR)"
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={values.price}
              required
            />
            <Field
              label="Prix barre (EUR)"
              name="compareAtPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={values.compareAtPrice}
              hint="Laisser vide si aucune promotion"
            />
            <Field label="Stock" name="stock" type="number" min="0" defaultValue={values.stock} required />
            <Field label="Reference (SKU)" name="sku" defaultValue={values.sku} required />
            <Field
              label="Quantite minimum"
              name="minOrder"
              type="number"
              min="1"
              defaultValue={values.minOrder}
            />
            <Field
              label="Garantie (mois)"
              name="warrantyMonths"
              type="number"
              min="0"
              defaultValue={values.warrantyMonths}
            />
          </div>
        </section>

        <section className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Caracteristiques</h2>
            <button
              type="button"
              onClick={() => setSpecs((rows) => [...rows, { label: "", value: "" }])}
              className="btn btn-secondary px-2.5 py-1 text-xs"
            >
              <Plus className="size-3.5" />
              Ajouter
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {specs.map((spec, index) => (
              <div key={index} className="flex gap-2">
                <input
                  name="specLabel"
                  defaultValue={spec.label}
                  placeholder="Ecran"
                  className="input w-2/5"
                  aria-label={`Intitule ${index + 1}`}
                />
                <input
                  name="specValue"
                  defaultValue={spec.value}
                  placeholder="6.8 pouces AMOLED 120 Hz"
                  className="input flex-1"
                  aria-label={`Valeur ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => setSpecs((rows) => rows.filter((_, i) => i !== index))}
                  aria-label="Retirer la ligne"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-2 transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-2">
            Les lignes vides sont ignorees a l&apos;enregistrement.
          </p>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Referencement</h2>
          <p className="mt-1 text-xs text-muted-2">
            Laissez vide pour generer automatiquement a partir du titre et de la description.
          </p>

          <div className="mt-4 space-y-4">
            <SeoCounted
              label="Titre SEO"
              name="metaTitle"
              defaultValue={values.metaTitle}
              max={60}
              placeholder={values.title || "Titre affiche dans les resultats Google"}
            />
            <SeoCounted
              label="Meta description"
              name="metaDescription"
              defaultValue={values.metaDescription}
              max={158}
              textarea
              placeholder="Resume vendeur affiche sous le titre dans les resultats de recherche."
            />
            <Field
              label="Image de partage"
              name="ogImage"
              defaultValue={values.ogImage}
              placeholder="Laisser vide : une image est generee automatiquement"
            />
            <Checkbox
              name="noIndex"
              label="Exclure cette fiche des moteurs de recherche"
              defaultChecked={values.noIndex}
            />
          </div>
        </section>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-24">
        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Publication</h2>

          <div className="mt-4 space-y-3">
            <Checkbox name="active" label="Produit en ligne" defaultChecked={values.active} />
            <Checkbox name="featured" label="Mettre en avant" defaultChecked={values.featured} />
            <Checkbox
              name="tradeAssurance"
              label="Trade Assurance"
              defaultChecked={values.tradeAssurance}
            />
            <Checkbox
              name="readyToShip"
              label="Expedition immediate"
              defaultChecked={values.readyToShip}
            />
          </div>

          {state.error && (
            <p className="mt-4 rounded-lg bg-danger/10 p-2.5 text-xs text-danger">{state.error}</p>
          )}
          {state.success && (
            <p className="mt-4 flex items-center gap-1.5 rounded-lg bg-success/10 p-2.5 text-xs text-success">
              <Check className="size-3.5" />
              {state.success}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn btn-primary mt-4 w-full py-2.5">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {submitLabel}
          </button>

          {slug && (
            <Link href={`/produits/${slug}`} className="btn btn-secondary mt-2 w-full">
              Voir sur la boutique
            </Link>
          )}
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Classement</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="categoryId" className="label">
                Categorie <span className="text-danger">*</span>
              </label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={values.categoryId}
                required
                className="input"
              >
                <option value="">Selectionner...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="brandId" className="label">
                Marque <span className="text-danger">*</span>
              </label>
              <select id="brandId" name="brandId" defaultValue={values.brandId} required className="input">
                <option value="">Selectionner...</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="condition" className="label">
                Etat
              </label>
              <select
                id="condition"
                name="condition"
                defaultValue={values.condition}
                className="input"
              >
                {CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {CONDITION_LABELS[condition]}
                  </option>
                ))}
              </select>
            </div>

            <Field label="Stockage" name="storage" defaultValue={values.storage} placeholder="256GB" />
            <Field label="Coloris" name="color" defaultValue={values.color} placeholder="Vert" />
            <Field
              label="Operateur / variante"
              name="carrier"
              defaultValue={values.carrier}
              placeholder="T-Mobile"
            />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Visuel principal</h2>

          <div className="mt-4 aspect-square rounded-xl bg-surface-2 p-4">
            {preview ? (
              <Image
                src={preview}
                alt="Apercu"
                width={280}
                height={280}
                className="size-full object-contain"
                unoptimized
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted-2">
                Aucun visuel
              </div>
            )}
          </div>

          <div className="mt-3">
            <label htmlFor="imageUrl" className="label">
              URL de l&apos;image
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              defaultValue={values.imageUrl}
              onChange={(event) => setPreview(event.target.value)}
              placeholder="/products/mon-produit.svg"
              className="input"
            />
            <p className="mt-1.5 text-xs text-muted-2">
              Chemin local (dossier <code>public</code>) ou URL absolue.
            </p>
          </div>
        </section>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  hint,
  step,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="input"
      />
      {hint && <p className="mt-1 text-xs text-muted-2">{hint}</p>}
    </div>
  );
}

function SeoCounted({
  label,
  name,
  defaultValue,
  max,
  textarea = false,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  max: number;
  textarea?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const tone =
    value.length === 0
      ? "text-muted-2"
      : value.length > max
        ? "text-danger"
        : value.length < max * 0.5
          ? "text-warning"
          : "text-success";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={name} className="label">
          {label}
        </label>
        <span className={cn("text-xs tabular-nums", tone)}>
          {value.length} / {max}
        </span>
      </div>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          className="input resize-y"
        />
      ) : (
        <input
          id={name}
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          className="input"
        />
      )}
    </div>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-border accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}
