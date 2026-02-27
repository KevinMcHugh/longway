import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const meta = {
  title: 'Design/Kit',
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

export function MobileCard() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Setlist Warmup</CardTitle>
          <CardDescription>
            Tune the loadout before the next route.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-border bg-muted/25 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Instrument</p>
            <p className="text-lg font-semibold">Lead Guitar</p>
          </div>
          <div className="rounded-md border border-border bg-muted/25 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Route</p>
            <p className="text-lg font-semibold">Act 2, Row 3</p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button className="flex-1">Start</Button>
          <Button className="flex-1" variant="outline">Re-roll</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export function DialogPreview() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-background p-8">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Open New Run Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new run</DialogTitle>
            <DialogDescription>
              Select instrument and circle level before loading the route map.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Launch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
