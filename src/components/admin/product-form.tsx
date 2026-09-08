"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loader2, Plus, X } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { CONDITIONS, WARRANTY_UNITS } from "@/lib/constants";
import { cn } from "@/lib/format";
import { FormFeedback } from "./form-feedback";
import { TranslationFields, type TranslationValues } from "./translation-fields";
import { VariantRows, type LigneVariante } from "./variant-rows";

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
  warrantyValue: string;
  warrantyUnit: string;
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
  variants: LigneVariante[];
  translations: TranslationValues;
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
  const t = useTranslations("admin.productForm");
  const tCondition = useTranslations("condition");
  const tWarranty = useTranslations("warrantyUnit");
  const [state, formAction, pending] = useActionState(action, {});
  const [specs, setSpecs] = useState(
    values.specs.length ? values.specs : [{ label: "", value: "" }]
  );
  const [preview, setPreview] = useState(values.imageUrl);
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);

  /**
   * Depose le fichier puis renseigne le champ d'adresse. Le visuel est stocke
   * hors du dossier deploye : il survit aux mises a jour, contrairement a un
   * fichier depose dans public/ que l'installation ecraserait.
   */
  async function televerser(fichier: File) {
    setErreurEnvoi(null);
    setEnvoi(true);
    try {
      const corps = new FormData();
      corps.append("fichier", fichier);
      const reponse = await fetch("/api/admin/media", { method: "POST", body: corps });
      const donnees = await reponse.json();

      if (!reponse.ok) {
        setErreurEnvoi(t(`upload_${donnees.erreur ?? "illisible"}`));
        return;
      }

      // Le champ d'adresse est controle : le mettre a jour suffit, il se
      // remplit et sera soumis avec le formulaire.
      setPreview(donnees.url);
    } catch {
      setErreurEnvoi(t("upload_illisible"));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form action={formAction} className="grid gap-5 xl:grid-cols-[1fr_20rem] xl:items-start">
      <div className="space-y-5">
        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("general")}</h2>

          <div className="mt-4 grid gap-4">
            <Field label={t("title")} name="title" defaultValue={values.title} required />
            <Field
              label={t("subtitle")}
              name="subtitle"
              defaultValue={values.subtitle}
              placeholder={t("subtitlePlaceholder")}
            />
            <div>
              <label htmlFor="description" className="label">
                {t("description")} <span className="text-danger">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={values.description}
                required
                rows={6}
                className="input resize-y"
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
          </div>
        </section>

        <TranslationFields
          values={values.translations}
          fields={[
            { name: "title", label: t("title") },
            { name: "subtitle", label: t("subtitle") },
            { name: "description", label: t("description"), rows: 6 },
            { name: "metaTitle", label: t("metaTitle") },
            { name: "metaDescription", label: t("metaDescription"), rows: 3 },
          ]}
        />

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("priceStock")}</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={t("price")}
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={values.price}
              required
            />
            <Field
              label={t("compareAtPrice")}
              name="compareAtPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={values.compareAtPrice}
              hint={t("compareAtPriceHint")}
            />
            <Field
              label={t("stock")}
              name="stock"
              type="number"
              min="0"
              defaultValue={values.stock}
              required
            />
            <Field label={t("sku")} name="sku" defaultValue={values.sku} required />
            <Field
              label={t("minOrder")}
              name="minOrder"
              type="number"
              min="1"
              defaultValue={values.minOrder}
            />
            <div>
              <label htmlFor="warrantyValue" className="label">
                {t("warranty")}
              </label>
              {/* Valeur et unite cote a cote : certains accessoires sont
                  garantis quelques jours, d'autres plusieurs annees. */}
              <div className="flex gap-2">
                <input
                  id="warrantyValue"
                  name="warrantyValue"
                  type="number"
                  min={0}
                  defaultValue={values.warrantyValue}
                  className="input w-24"
                />
                <select name="warrantyUnit" defaultValue={values.warrantyUnit} className="input flex-1">
                  {WARRANTY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {tWarranty(u)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold">{t("specs")}</h2>
            <button
              type="button"
              onClick={() => setSpecs((rows) => [...rows, { label: "", value: "" }])}
              className="btn btn-secondary px-2.5 py-1 text-xs"
            >
              <Plus className="size-3.5" />
              {t("addSpec")}
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {specs.map((spec, index) => (
              <div key={index} className="flex gap-2">
                <input
                  name="specLabel"
                  defaultValue={spec.label}
                  placeholder={t("specLabelPlaceholder")}
                  className="input w-2/5"
                  aria-label={t("specLabelAria", { index: index + 1 })}
                />
                <input
                  name="specValue"
                  defaultValue={spec.value}
                  placeholder={t("specValuePlaceholder")}
                  className="input flex-1"
                  aria-label={t("specValueAria", { index: index + 1 })}
                />
                <button
                  type="button"
                  onClick={() => setSpecs((rows) => rows.filter((_, i) => i !== index))}
                  aria-label={t("removeRow")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-2 transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-2">{t("emptyRowsIgnored")}</p>
        </section>

        <VariantRows initiales={values.variants} />

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("seo")}</h2>
          <p className="mt-1 text-xs text-muted-2">{t("seoHint")}</p>

          <div className="mt-4 space-y-4">
            <SeoCounted
              label={t("metaTitle")}
              name="metaTitle"
              defaultValue={values.metaTitle}
              max={60}
              placeholder={values.title || t("metaTitlePlaceholder")}
            />
            <SeoCounted
              label={t("metaDescription")}
              name="metaDescription"
              defaultValue={values.metaDescription}
              max={158}
              textarea
              placeholder={t("metaDescriptionPlaceholder")}
            />
            <Field
              label={t("ogImage")}
              name="ogImage"
              defaultValue={values.ogImage}
              placeholder={t("ogImagePlaceholder")}
            />
            <Checkbox name="noIndex" label={t("noIndex")} defaultChecked={values.noIndex} />
          </div>
        </section>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-24">
        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("publication")}</h2>

          <div className="mt-4 space-y-3">
            <Checkbox name="active" label={t("online")} defaultChecked={values.active} />
            <Checkbox name="featured" label={t("featured")} defaultChecked={values.featured} />
            <Checkbox
              name="tradeAssurance"
              label={t("tradeAssurance")}
              defaultChecked={values.tradeAssurance}
            />
            <Checkbox
              name="readyToShip"
              label={t("readyToShip")}
              defaultChecked={values.readyToShip}
            />
          </div>

          <div className="mt-4">
            <FormFeedback state={state} size="xs" />
          </div>

          <button type="submit" disabled={pending} className="btn btn-primary mt-4 w-full py-2.5">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {submitLabel}
          </button>

          {slug && (
            <Link href={`/produits/${slug}`} className="btn btn-secondary mt-2 w-full">
              {t("viewOnShop")}
            </Link>
          )}
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("classification")}</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="categoryId" className="label">
                {t("category")} <span className="text-danger">*</span>
              </label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={values.categoryId}
                required
                className="input"
              >
                <option value="">{t("select")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="brandId" className="label">
                {t("brand")} <span className="text-danger">*</span>
              </label>
              <select
                id="brandId"
                name="brandId"
                defaultValue={values.brandId}
                required
                className="input"
              >
                <option value="">{t("select")}</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="condition" className="label">
                {t("condition")}
              </label>
              <select
                id="condition"
                name="condition"
                defaultValue={values.condition}
                className="input"
              >
                {CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {tCondition(condition)}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label={t("storage")}
              name="storage"
              defaultValue={values.storage}
              placeholder={t("storagePlaceholder")}
            />
            <Field
              label={t("colour")}
              name="color"
              defaultValue={values.color}
              placeholder={t("colourPlaceholder")}
            />
            <Field
              label={t("carrier")}
              name="carrier"
              defaultValue={values.carrier}
              placeholder={t("carrierPlaceholder")}
            />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("mainImage")}</h2>

          <div className="mt-4 aspect-square rounded-xl bg-surface-2 p-4">
            {preview ? (
              <Image
                src={preview}
                alt={t("preview")}
                width={280}
                height={280}
                className="size-full object-contain"
                unoptimized
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted-2">
                {t("noImage")}
              </div>
            )}
          </div>

          <div className="mt-3">
            <label htmlFor="fichierImage" className="label">
              {t("uploadLabel")}
            </label>
            <input
              id="fichierImage"
              type="file"
              accept="image/webp,image/avif,image/jpeg,image/png,image/svg+xml"
              disabled={envoi}
              onChange={(event) => {
                const fichier = event.target.files?.[0];
                if (fichier) void televerser(fichier);
                event.target.value = "";
              }}
              className="input file:me-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-3 file:py-1 file:text-xs"
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-2">
              {envoi && <Loader2 className="size-3 animate-spin" />}
              {envoi ? t("uploadPending") : t("uploadHint")}
            </p>
            {erreurEnvoi && <p className="mt-1 text-xs text-danger">{erreurEnvoi}</p>}
          </div>

          <div className="mt-3">
            <label htmlFor="imageUrl" className="label">
              {t("imageUrl")}
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              value={preview}
              onChange={(event) => setPreview(event.target.value)}
              placeholder={t("imageUrlPlaceholder")}
              className="input"
              dir="ltr"
            />
            <p className="mt-1.5 text-xs text-muted-2">{t("imageUrlHint")}</p>
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
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={name} className="label">
          {label}
        </label>
        <span className={cn("text-xs tabular-nums", tone)} dir="ltr">
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
