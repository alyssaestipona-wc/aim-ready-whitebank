import { ProductView } from "@/components/admin/product-view"

/** The tenant's product codes, so both detail pages prerender. */
export function generateStaticParams() {
  return [{ code: "PL" }, { code: "SL" }]
}

export default async function ProductPage({ params }: PageProps<"/config/products/[code]">) {
  const { code } = await params
  return <ProductView code={code} />
}
