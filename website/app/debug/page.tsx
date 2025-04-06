"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { getPythonServiceUrl, getEnvironmentInfo } from "@/app/config"

export default function DebugPage() {
  const [envInfo, setEnvInfo] = useState<any>({})
  const [pythonServiceStatus, setPythonServiceStatus] = useState<"checking" | "available" | "unavailable">("checking")
  const [statusMessage, setStatusMessage] = useState("")
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    // Get environment information
    setEnvInfo(getEnvironmentInfo())

    // Check Python service status
    checkPythonService()
  }, [])

  const checkPythonService = async () => {
    setIsChecking(true)
    setPythonServiceStatus("checking")

    const url = getPythonServiceUrl(true)
    if (!url) {
      setPythonServiceStatus("unavailable")
      setStatusMessage("Python service URL is not configured")
      setIsChecking(false)
      return
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        setPythonServiceStatus("available")
        setStatusMessage(`Service is available at ${url}`)
      } else {
        setPythonServiceStatus("unavailable")
        setStatusMessage(`Service returned status: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      setPythonServiceStatus("unavailable")
      setStatusMessage(`Error connecting to service: ${error.message}`)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Environment Debug Page</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Current environment configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Node Environment:</strong> {envInfo.nodeEnv}
              </div>
              <div>
                <strong>Vercel Environment:</strong> {envInfo.vercelEnv}
              </div>
              <div>
                <strong>PYTHON_SERVICE_URL:</strong> {envInfo.pythonServiceUrl || "Not set"}
              </div>
              <div>
                <strong>NEXT_PUBLIC_PYTHON_SERVICE_URL:</strong> {envInfo.publicPythonServiceUrl || "Not set"}
              </div>
              <div>
                <strong>Client-side URL:</strong> {getPythonServiceUrl(true) || "Not available"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Python Service Status</CardTitle>
            <CardDescription>Check if the Python service is accessible</CardDescription>
          </CardHeader>
          <CardContent>
            {pythonServiceStatus === "checking" ? (
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking service status...
              </div>
            ) : pythonServiceStatus === "available" ? (
              <Alert className="bg-green-50 border-green-200">
                <div className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Service Available</AlertTitle>
                <AlertDescription className="text-green-700">{statusMessage}</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Service Unavailable</AlertTitle>
                <AlertDescription>{statusMessage}</AlertDescription>
              </Alert>
            )}

            <Button onClick={checkPythonService} disabled={isChecking} className="mt-4">
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
              {isChecking ? "Checking..." : "Check Service Status"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deployment Instructions</CardTitle>
            <CardDescription>How to properly deploy the Python service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                To fix the "Python not found 404" error, you need to deploy your Python service to a publicly accessible
                URL:
              </p>

              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Deploy your Python Flask server to a hosting service like:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Heroku</li>
                    <li>PythonAnywhere</li>
                    <li>DigitalOcean</li>
                    <li>AWS Lambda with API Gateway</li>
                    <li>Google Cloud Run</li>
                    <li>Render.com</li>
                  </ul>
                </li>
                <li>Make sure your Python service has CORS enabled to accept requests from your Vercel domain</li>
                <li>
                  Set the following environment variables in your Vercel project settings:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>
                      <code className="bg-gray-100 px-1 py-0.5 rounded">PYTHON_SERVICE_URL</code>: The URL of your
                      deployed Python service
                    </li>
                    <li>
                      <code className="bg-gray-100 px-1 py-0.5 rounded">NEXT_PUBLIC_PYTHON_SERVICE_URL</code>: The same
                      URL, but made available to the client
                    </li>
                  </ul>
                </li>
                <li>Redeploy your Vercel project after setting the environment variables</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

