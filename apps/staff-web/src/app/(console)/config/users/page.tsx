"use client"

import { Avatar, Card, ListView, PageHeader, StatusPill, type ListFilterDef } from "@aim-ready/ui"

import { directoryUsers, type DirectoryUser } from "@/mock"

/** Read-only: identity comes from the backoffice identity service. */
export default function UsersPage() {
  const list = directoryUsers()
  const filters: ListFilterDef<DirectoryUser>[] = [{ key: "role", label: "Role", options: [...new Set(list.map((u) => u.title))].sort().map((v) => [v, v] as const), test: (u, v) => u.title === v }]
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Users and roles" description="Staff identity, roles and MFA come from the WhiteBank backoffice identity service. Lending keeps no passwords of its own; this view is read-only." />
      <Card>
        <ListView
          label="Users and roles"
          items={list}
          filters={filters}
          searchPlaceholder="Search name, role or scope"
          searchText={(u) => `${u.name} ${u.title} ${u.unit} ${u.id}`}
          rowKey={(u) => u.id}
          emptyMessage="No users"
          columns={[
            {
              header: "Person",
              cell: (u) => (
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.name} />
                  <b className="font-semibold text-strong">{u.name}</b>
                </div>
              ),
            },
            { header: "Role", cell: (u) => u.title },
            { header: "Scope", cell: (u) => <small>{u.unit}</small> },
            { header: "MFA", cell: () => <StatusPill tone="ok">Enabled</StatusPill> },
            { header: "Email or employee ID", cell: (u) => <span className="mono">{u.id}</span> },
          ]}
        />
      </Card>
    </>
  )
}
