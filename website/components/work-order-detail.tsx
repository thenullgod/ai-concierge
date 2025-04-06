"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type WorkOrder = {
  id: number
  title: string
  priority: "HIGH" | "NORMAL"
  description: string
  due_date: string
  customer: string
  location: string
  trade: string
  created_at: string
  summary: string
  action_items: string
}

interface WorkOrderDetailProps {
  workOrder: WorkOrder | null
  open: boolean
  onClose: () => void
}

export function WorkOrderDetail({ workOrder, open, onClose }: WorkOrderDetailProps) {
  if (!workOrder) return null

  const actionItems = workOrder.action_items
    ? workOrder.action_items.split("\n").filter((item) => item.trim().length > 0)
    : []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{workOrder.title}</span>
            <Badge variant={workOrder.priority === "HIGH" ? "destructive" : "secondary"}>{workOrder.priority}</Badge>
          </DialogTitle>
          <DialogDescription>Created on {new Date(workOrder.created_at).toLocaleDateString()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {workOrder.summary && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Summary</h3>
              <p className="mt-1">{workOrder.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Customer</h3>
              <p className="mt-1">{workOrder.customer}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Trade</h3>
              <p className="mt-1">{workOrder.trade}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
              <p className="mt-1">{new Date(workOrder.due_date).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Location</h3>
              <p className="mt-1">{workOrder.location}</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1 whitespace-pre-wrap">{workOrder.description}</p>
          </div>

          {actionItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Action Items</h3>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                {actionItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

