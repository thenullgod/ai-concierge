"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Square, RefreshCw, AlertCircle, CheckCircle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

type ProcessorStatus = {
  running: boolean
  last_check: string | null
  emails_processed: number
  logs: Array<{
    timestamp: string
    message: string
    status: "success" | "error" | "info"
  }>
}

export function ProcessorControl() {
  const [status, setStatus] = useState<ProcessorStatus>({
    running: false,
    last_check: null,
    emails_processed: 0,
    logs: [],
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Update the fetchStatus function in the ProcessorControl component
  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/processor/status")

      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.statusText}`)
      }

      const data = await response.json()
      setStatus(data)

      // Only clear error if we have a successful response
      setError(null)
    } catch (error) {
      console.error("Error fetching processor status:", error)
      setError("Failed to connect to the email processor service. Check if the Python service is running.")

      // Set default status values when there's an error
      setStatus((prev) => ({
        ...prev,
        running: false,
        logs: [
          {
            timestamp: new Date().toISOString(),
            message: `Connection error: ${error.message || "Failed to fetch"}`,
            status: "error",
          },
          ...(prev.logs || []),
        ],
      }))
    } finally {
      setLoading(false)
    }
  }

  // Update the startProcessor function
  const startProcessor = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/processor/start", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to start processor: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status === "error") {
        setError(data.message)
      } else {
        await fetchStatus()

        // Set up refresh interval
        if (refreshInterval === null) {
          const interval = setInterval(fetchStatus, 5000)
          setRefreshInterval(interval)
        }
      }
    } catch (error) {
      console.error("Error starting processor:", error)
      setError("Failed to start the email processor. Check if the Python service is running.")
    } finally {
      setLoading(false)
    }
  }

  // Update the stopProcessor function
  const stopProcessor = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/processor/stop", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to stop processor: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status === "error") {
        setError(data.message)
      } else {
        await fetchStatus()

        // Clear refresh interval
        if (refreshInterval !== null) {
          clearInterval(refreshInterval)
          setRefreshInterval(null)
        }
      }
    } catch (error) {
      console.error("Error stopping processor:", error)
      setError("Failed to stop the email processor. Check if the Python service is running.")
    } finally {
      setLoading(false)
    }
  }

  // Update the useEffect hook
  useEffect(() => {
    // Initial fetch with error handling
    fetchStatus().catch((err) => {
      console.error("Initial status fetch failed:", err)
      // Don't set error here as fetchStatus already handles it
    })

    // Set up refresh interval if processor is running
    if (status.running && refreshInterval === null) {
      const interval = setInterval(() => {
        fetchStatus().catch((err) => {
          console.error("Interval status fetch failed:", err)
          // Don't set error here as fetchStatus already handles it
        })
      }, 5000)
      setRefreshInterval(interval)
    }

    return () => {
      if (refreshInterval !== null) {
        clearInterval(refreshInterval)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Email Processor</span>
            <Badge variant={status.running ? "success" : "secondary"}>{status.running ? "Running" : "Stopped"}</Badge>
          </CardTitle>
          <CardDescription>Automatically process incoming emails and extract work orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Last Check</span>
              <span className="font-medium">
                {status.last_check ? new Date(status.last_check).toLocaleString() : "Never"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Emails Processed</span>
              <span className="font-medium">{status.emails_processed}</span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
              <h3 className="text-sm font-medium">Processing Logs</h3>
              <div className="flex items-center space-x-2 text-xs">
                <span className="flex items-center">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                  Success
                </span>
                <span className="flex items-center">
                  <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                  Error
                </span>
                <span className="flex items-center">
                  <Info className="h-3 w-3 text-blue-500 mr-1" />
                  Info
                </span>
              </div>
            </div>
            <div className="max-h-[200px] overflow-y-auto p-2">
              {status.logs.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">No logs available</div>
              ) : (
                <div className="space-y-2">
                  {status.logs.map((log, index) => (
                    <div key={index} className="text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-start">
                        {log.status === "success" && (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        )}
                        {log.status === "error" && (
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        )}
                        {log.status === "info" && <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />}
                        <div>
                          <div className="font-medium">{log.message}</div>
                          <div className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {status.running ? (
            <Button variant="destructive" onClick={stopProcessor} disabled={loading}>
              <Square className="h-4 w-4 mr-2" />
              Stop Processor
            </Button>
          ) : (
            <Button variant="default" onClick={startProcessor} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              Start Processor
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

