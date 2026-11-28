import { TemplateView } from "@/components/admin/template-view"
import { seed } from "@/mock/seed"

export function generateStaticParams() {
  return seed().cfg.templates.map((t) => ({ id: t.id }))
}

export default async function TemplatePage({ params }: PageProps<"/config/templates/[id]">) {
  const { id } = await params
  return <TemplateView id={id} />
}
