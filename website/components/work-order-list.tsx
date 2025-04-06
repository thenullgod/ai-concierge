"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkOrderDetail } from "@/components/work-order-detail"

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

export function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchWorkOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/work-orders")

      if (!response.ok) {
        throw new Error(`Failed to fetch work orders: ${response.statusText}`)
      }

      const data = await response.json()
      setWorkOrders(data)
    } catch (error) {
      console.error("Error fetching work orders:", error)
      setError("Failed to load work orders. The Python service might not be running.")
      // The API route now returns sample data on error, so we don't need to set it here
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder)
    setDetailOpen(true)
  }

  const handleCloseDetails = () => {
    setDetailOpen(false)
  }

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Work Orders</h2>
        <Button variant="outline" size="sm" onClick={fetchWorkOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-4 border-yellow-200 bg-yellow-50">
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium flex items-center text-yellow-800">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-sm text-yellow-700">{error}</CardContent>
        </Card>
      )}

      <div className="overflow-y-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {loading ? "Loading work orders..." : "No work orders found"}
                </TableCell>
              </TableRow>
            ) : (
              workOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.title}</TableCell>
                  <TableCell>
                    <Badge variant={order.priority === "HIGH" ? "destructive" : "secondary"}>{order.priority}</Badge>
                  </TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{new Date(order.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>{order.trade}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WorkOrderDetail workOrder={selectedWorkOrder} open={detailOpen} onClose={handleCloseDetails} />
    </div>
  )
}

