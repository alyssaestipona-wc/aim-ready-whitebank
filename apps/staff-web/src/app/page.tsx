import {
  AppStrip,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  EmptyState,
  Input,
  Label,
  NativeSelect,
  PageHeader,
  Separator,
  Table,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@aim-ready/ui"

export default function Home() {
  return (
    <main>
      <AppStrip name="WhiteBank Lending" full />
      <PageHeader title="Kit check" />
      <Card>
        <CardContent>
          <Button variant="accent">Accent</Button>
          <p className="text-danger">Inline error</p>
          <Badge variant="info">Info</Badge>
          <Label htmlFor="x">X</Label>
          <Input id="x" />
          <Textarea />
          <NativeSelect />
          <Checkbox />
          <Separator />
          <Table />
          <Tabs>
            <TabsList>
              <TabsTrigger value="a">A</TabsTrigger>
            </TabsList>
          </Tabs>
          <EmptyState title="Nothing" />
        </CardContent>
      </Card>
    </main>
  )
}
