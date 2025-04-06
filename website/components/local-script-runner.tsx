"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Play, Square, AlertCircle, CheckCircle, Download, Terminal, RefreshCw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { getPythonServiceUrl } from "@/app/config"

type ScriptStatus = "idle" | "running" | "success" | "error"

export function LocalScriptRunner() {
  const [status, setStatus] = useState<ScriptStatus>("idle")
  const [output, setOutput] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [autoRestart, setAutoRestart] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [port, setPort] = useState("5000")
  const [serverUrl, setServerUrl] = useState("http://localhost:5000")
  const [isConnected, setIsConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [envVars, setEnvVars] = useState({
    PYTHON_SERVICE_URL: "",
    NEXT_PUBLIC_PYTHON_SERVICE_URL: "",
  })

  // Check if the Flask server is running
  const checkServerConnection = async () => {
    setIsChecking(true)
    setError(null)

    try {
      const response = await fetch(`${serverUrl}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        setIsConnected(true)
        setOutput("Connected to local Flask server successfully.")

        // Update the PYTHON_SERVICE_URL in localStorage
        localStorage.setItem("PYTHON_SERVICE_URL", serverUrl)

        // Check if the processor is running
        const statusResponse = await fetch(`${serverUrl}/processor-status`)
        if (statusResponse.ok) {
          const data = await statusResponse.json()
          setStatus(data.running ? "running" : "idle")
        }
      } else {
        setIsConnected(false)
        setError("Could not connect to the Flask server. Make sure it's running.")
      }
    } catch (error) {
      console.error("Error checking server connection:", error)
      setIsConnected(false)
      setError(`Failed to connect to the Flask server: ${error.message || "Unknown error"}`)
    } finally {
      setIsChecking(false)
    }
  }

  // Run the script
  const runScript = async () => {
    setStatus("running")
    setOutput("Starting local email processor...")
    setError(null)

    try {
      const response = await fetch(`${serverUrl}/start-processor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ autoRestart }),
      })

      if (!response.ok) {
        throw new Error(`Failed to start processor: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status === "error") {
        setStatus("error")
        setError(data.message)
      } else {
        setStatus("running")
        setOutput((prev) => prev + "\nProcessor started successfully.")
      }
    } catch (error) {
      console.error("Error running script:", error)
      setStatus("error")
      setError(`Failed to start processor: ${error.message || "Unknown error"}`)
    }
  }

  // Stop the script
  const stopScript = async () => {
    try {
      const response = await fetch(`${serverUrl}/stop-processor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to stop processor: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status === "error") {
        setError(data.message)
      } else {
        setStatus("idle")
        setOutput((prev) => prev + "\nProcessor stopped successfully.")
      }
    } catch (error) {
      console.error("Error stopping script:", error)
      setError(`Failed to stop processor: ${error.message || "Unknown error"}`)
    }
  }

  // Download the script
  const downloadScript = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch("/api/script/download")

      if (!response.ok) {
        throw new Error(`Failed to download script: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "email_parser.py"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setIsDownloading(false)
      setOutput((prev) => prev + "\nScript downloaded successfully. Run it with: python email_parser.py")
    } catch (error) {
      console.error("Error downloading script:", error)
      setError(`Failed to download script: ${error.message || "Unknown error"}`)
      setIsDownloading(false)
    }
  }

  // Update server URL when port changes
  useEffect(() => {
    setServerUrl(`http://localhost:${port}`)
  }, [port])

  // Check for saved URL in localStorage on component mount
  useEffect(() => {
    // Get environment variables
    setEnvVars({
      PYTHON_SERVICE_URL: getPythonServiceUrl(),
      NEXT_PUBLIC_PYTHON_SERVICE_URL: process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || "",
    })

    const savedUrl = localStorage.getItem("PYTHON_SERVICE_URL")
    if (savedUrl) {
      setServerUrl(savedUrl)

      // Extract port from URL if possible
      try {
        const url = new URL(savedUrl)
        setPort(url.port || "5000")
      } catch (e) {
        // If URL parsing fails, keep default port
      }
    }

    // Initial connection check
    checkServerConnection()
  }, [])

  const getStatusBadge = () => {
    switch (status) {
      case "running":
        return <Badge className="bg-blue-500">Running</Badge>
      case "success":
        return <Badge className="bg-green-500">Success</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Idle</Badge>
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Local Script Runner</span>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>Run the email parser script directly on your local machine</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-sm font-medium mb-2">Environment Configuration</h3>
          <div className="text-xs space-y-1">
            <div>
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">PYTHON_SERVICE_URL</span>:{" "}
              {envVars.PYTHON_SERVICE_URL || "Not set"}
            </div>
            <div>
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">NEXT_PUBLIC_PYTHON_SERVICE_URL</span>:{" "}
              {envVars.NEXT_PUBLIC_PYTHON_SERVICE_URL || "Not set"}
            </div>
            <div className="mt-2 text-gray-500">These values are used to connect to your Python service.</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="auto-restart"
            checked={autoRestart}
            onCheckedChange={setAutoRestart}
            disabled={status === "running"}
          />
          <Label htmlFor="auto-restart">Auto-restart on failure</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="server-port">Local Server Port</Label>
          <div className="flex space-x-2">
            <Input
              id="server-port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="5000"
              className="w-24"
            />
            <Button variant="outline" onClick={checkServerConnection} disabled={isChecking}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
              {isChecking ? "Checking..." : "Check Connection"}
            </Button>
            <Button variant="outline" onClick={downloadScript} disabled={isDownloading}>
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download Script"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Server URL: {serverUrl}
            {isConnected && <span className="text-green-500 ml-2">✓ Connected</span>}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConnected && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Connected</AlertTitle>
            <AlertDescription className="text-green-700">
              Successfully connected to the local Flask server. You can now start the email processor.
            </AlertDescription>
          </Alert>
        )}

        {output && (
          <div className="mt-4">
            <div className="flex items-center mb-2">
              <Terminal className="h-4 w-4 mr-2" />
              <h3 className="text-sm font-medium">Script Output</h3>
            </div>
            <Textarea readOnly value={output} className="font-mono text-xs h-[200px] bg-gray-50" />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm">
          {!isConnected ? (
            <span className="text-yellow-600">
              To use this feature, download and run the script on your local machine.
            </span>
          ) : (
            <span className="text-green-600">Local server is running. You can start/stop the email processor.</span>
          )}
        </div>

        {isConnected &&
          (status === "running" ? (
            <Button variant="destructive" onClick={stopScript}>
              <Square className="h-4 w-4 mr-2" />
              Stop Processor
            </Button>
          ) : (
            <Button variant="default" onClick={runScript}>
              <Play className="h-4 w-4 mr-2" />
              Start Processor
            </Button>
          ))}
      </CardFooter>
    </Card>
  )
}

