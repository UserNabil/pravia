"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { EmptyRow, TableShell, Td, Th } from "./ui";
import { ConfirmButton } from "./actions-ui";
import { EditTrigger, TaxonomyForm } from "./taxonomy-form";
import { CategoryIcon } from "@/components/category-icon";

export type TaxonomyRow = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  accent?: string;
  description?: string | null;
  sortOrder?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  noIndex?: boolean;
  productCount: number;
};

export function TaxonomyManager({
  kind,
  rows,
  saveAction,
  deleteAction,
}: {
  kind: "category" | "brand";
  rows: TaxonomyRow[];
  saveAction: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="order-2 lg:order-1">
        <TableShell>
          <thead>
            <tr>
              <Th>{kind === "category" ? "Categorie" : "Marque"}</Th>
              <Th>Identifiant</Th>
              <Th>Produits</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={4}>Aucune entree pour le moment.</EmptyRow>}

            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-surface-2">
                <Td>
                  <div className="flex items-center gap-3">
                    {kind === "category" ? (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <CategoryIcon name={row.icon ?? "package"} className="size-4" />
                      </span>
                    ) : (
                      <span
                        className="size-8 shrink-0 rounded-lg"
                        style={{ backgroundColor: row.accent ?? "#64748b" }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.name}</p>
                      {row.description && (
                        <p className="truncate text-xs text-muted-2">{row.description}</p>
                      )}
                    </div>
                  </div>
                </Td>
                <Td className="text-xs text-muted-2">{row.slug}</Td>
                <Td>
                  <Link
                    href={
                      kind === "category"
                        ? `/admin/produits?categorie=${row.slug}`
                        : `/produits?marque=${row.slug}`
                    }
                    className="tabular-nums text-primary hover:underline"
                  >
                    {row.productCount}
                  </Link>
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <EditTrigger onSelect={() => setEditing(row)} />
                    {row.productCount === 0 ? (
                      <ConfirmButton
                        action={() => deleteAction(row.id)}
                        confirmLabel="Supprimer"
                        successMessage="Entree supprimee."
                        className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </ConfirmButton>
                    ) : (
                      <span
                        title="Suppression impossible : des produits y sont rattaches"
                        className="flex size-8 cursor-not-allowed items-center justify-center rounded-lg text-muted-2 opacity-40"
                      >
                        <Trash2 className="size-3.5" />
                      </span>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      <div className="order-1 lg:order-2 lg:sticky lg:top-24">
        <TaxonomyForm
          key={editing?.id ?? "new"}
          kind={kind}
          action={saveAction}
          editing={editing}
          onCancel={() => setEditing(null)}
        />
      </div>
    </div>
  );
}
