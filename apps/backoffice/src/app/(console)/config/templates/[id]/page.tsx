import { TemplateView } from "@/components/admin/template-view"
import { baseCfg } from "@/mock/seed"

/** Every seeded template, so all five detail pages prerender. */
export function generateStaticParams() {
  return baseCfg().templates.map((t) => ({ id: t.id }))
}

export default async function TemplatePage({ params }: PageProps<"/config/templates/[id]">) {
  const { id } = await params
  return <TemplateView id={id} />
}
