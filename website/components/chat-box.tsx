"use client"

import { useState, useEffect, useRef } from "react"
import { Send, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WelcomeMessage } from "@/components/welcome-message"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkOrderList } from "@/components/work-order-list"
import { ConfigPanel } from "@/components/config-panel"
import { ProcessorControl } from "@/components/processor-control"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getPythonServiceUrl } from "@/app/config"

type Message = {
  id: string
  content: string
  sender: "user" | "ai"
}

export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [showWelcome, setShowWelcome] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [modelStatus, setModelStatus] = useState<{
    model_loaded: boolean
    model_path: string
    transformers_available: boolean
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [serviceUrl, setServiceUrl] = useState<string>("")
  const [serviceConnected, setServiceConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error" | "not-configured">(
    "checking",
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize the service URL
  useEffect(() => {
    const url = getPythonServiceUrl(true)
    console.log("Using Python service URL:", url)

    if (!url) {
      setConnectionStatus("not-configured")
      return
    }

    setServiceUrl(url)

    // Set it in window for API routes to use
    if (typeof window !== "undefined") {
      window.PYTHON_SERVICE_URL = url
    }

    // Check if the service is available
    checkServiceAvailability(url)
  }, [])

  useEffect(() => {
    // Hide welcome message after it's shown
    const timer = setTimeout(() => {
      setShowWelcome(false)
    }, 4000) // 4 seconds total (3s display + 1s fade)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Check if the service is available
  const checkServiceAvailability = async (serverUrl: string) => {
    setConnectionStatus("checking")
    try {
      console.log("Checking service availability at:", serverUrl)

      // First check if the base endpoint is available
      const response = await fetch(`${serverUrl}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        // Add a timeout
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        setServiceConnected(true)
        setConnectionStatus("connected")
        console.log("Service is available")

        // Now try to check the model status
        checkModelStatus(serverUrl)
      } else {
        setServiceConnected(false)
        setConnectionStatus("error")
        setError(`Python service returned status: ${response.status} ${response.statusText}`)
        console.error(`Service returned status: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error("Error checking service availability:", error)
      setServiceConnected(false)
      setConnectionStatus("error")

      // Provide more specific error message for common errors
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        setError(
          `Cannot connect to Python service at ${serverUrl}. The service might not be running or is not accessible from your current location.`,
        )
      } else if (error.message.includes("404")) {
        setError(
          `Python service not found (404) at ${serverUrl}. Please check if the URL is correct and the service is deployed.`,
        )
      } else if (error.message.includes("timeout")) {
        setError(
          `Connection to Python service at ${serverUrl} timed out. The service might be overloaded or unreachable.`,
        )
      } else {
        setError(`Cannot connect to Python service at ${serverUrl}. ${error.message}`)
      }
    }
  }

  // Check if the model is loaded
  const checkModelStatus = async (serverUrl: string) => {
    try {
      console.log("Checking model status at:", serverUrl)

      const response = await fetch(`${serverUrl}/model-status`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        // Add a timeout
        signal: AbortSignal.timeout(5000),
      })

      // Check if the response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Model status endpoint did not return JSON:", contentType)
        // Don't set an error, just log it - the service is still available
        return
      }

      if (response.ok) {
        const data = await response.json()
        setModelStatus(data)

        if (!data.model_loaded) {
          console.warn("Model not loaded:", data)
          // Don't set an error, just show a warning in the UI
        }
      } else {
        console.error("Model status endpoint returned error:", response.status, response.statusText)
        // Don't set an error, just log it - the service is still available
      }
    } catch (error) {
      console.error("Error checking model status:", error)
      // Don't set an error, just log it - the service is still available
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !serviceConnected) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    // Create a placeholder for the AI response
    const aiMessageId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        content: "",
        sender: "ai",
      },
    ])

    try {
      // Use the service URL from state
      if (!serviceUrl) {
        throw new Error("Python service URL is not configured")
      }

      console.log("Sending chat request to:", serviceUrl)

      // Create an AbortController for the fetch request
      abortControllerRef.current = new AbortController()

      // Send the message to the Llama model
      const response = await fetch(`${serviceUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream, text/plain, application/json",
        },
        body: JSON.stringify({ message: input }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Failed to get response: ${response.status} ${response.statusText}`)
      }

      // Check if the response is text/event-stream or application/json
      const contentType = response.headers.get("content-type")
      if (
        !contentType ||
        (!contentType.includes("text/event-stream") &&
          !contentType.includes("application/json") &&
          !contentType.includes("text/plain"))
      ) {
        throw new Error(`Unexpected content type: ${contentType}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Response body is not readable")
      }

      let aiResponse = ""

      // Read the stream
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Decode the chunk and append to the AI response
        const chunk = new TextDecoder().decode(value)
        aiResponse += chunk

        // Update the AI message with the current response
        setMessages((prev) => prev.map((msg) => (msg.id === aiMessageId ? { ...msg, content: aiResponse } : msg)))
      }
    } catch (error) {
      console.error("Error getting AI response:", error)

      // If it's not an abort error, show an error message
      if (error.name !== "AbortError") {
        // Provide more specific error message for common errors
        if (error.message.includes("404")) {
          setError(
            `Python service endpoint not found (404). The /chat endpoint might not be implemented or the service URL is incorrect.`,
          )
        } else {
          setError(`Failed to get a response: ${error.message}`)
        }

        // Provide a fallback response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  content:
                    "I'm sorry, I'm having trouble connecting to my language model. Please check if the Python service is running and accessible.",
                }
              : msg,
          ),
        )
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  // Cancel the ongoing request
  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }

  // Retry connection to the Python service
  const handleRetryConnection = () => {
    if (serviceUrl) {
      checkServiceAvailability(serviceUrl)
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {showWelcome && <WelcomeMessage />}

      <Tabs defaultValue="chat" className="flex flex-col h-full">
        <TabsList className="grid grid-cols-3 mx-4 mt-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Chat Tab - Push input to bottom */}
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {connectionStatus === "not-configured" && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                  Python service URL is not configured. Please set the NEXT_PUBLIC_PYTHON_SERVICE_URL environment
                  variable in your Vercel project settings.
                </AlertDescription>
              </Alert>
            )}

            {connectionStatus === "checking" && (
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <AlertTitle className="text-blue-600">Connecting...</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Attempting to connect to the Python service...
                </AlertDescription>
              </Alert>
            )}

            {connectionStatus === "error" && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{error || `Cannot connect to the Python service at ${serviceUrl}.`}</p>
                  <div className="flex flex-col space-y-2 mt-2">
                    <p className="font-semibold">Possible solutions:</p>
                    <ol className="list-decimal list-inside text-sm space-y-1">
                      <li>Make sure the Python service is running and accessible</li>
                      <li>Check if the URL is correct in your environment variables</li>
                      <li>Ensure your Python service allows CORS from your Vercel domain</li>
                      <li>Check if there are any network restrictions blocking the connection</li>
                    </ol>
                    <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={handleRetryConnection}>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Retry Connection
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {modelStatus && !modelStatus.model_loaded && connectionStatus === "connected" && (
              <Alert variant="warning" className="mb-4 bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-600">Model Not Loaded</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  The language model ({modelStatus.model_path}) is not loaded. Chat responses will be limited. Make sure
                  you have the transformers package installed and the model is accessible.
                </AlertDescription>
              </Alert>
            )}

            {error && connectionStatus === "connected" && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {messages.length === 0 && (
              <div className="h-full flex items-end justify-center pb-8">
                <p className="text-gray-400 text-center">Type a message to start the conversation</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    message.sender === "user"
                      ? "bg-gray-800 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-800 rounded-bl-none"
                  }`}
                >
                  {message.content || (
                    <span className="flex items-center text-gray-500">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Thinking...
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Fixed input at bottom */}
          <div className="border-t border-gray-200 p-4 mt-auto">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  connectionStatus === "connected"
                    ? "Type your message..."
                    : connectionStatus === "checking"
                      ? "Connecting to Python service..."
                      : "Python service not connected"
                }
                className="flex-1"
                disabled={isLoading || connectionStatus !== "connected"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              {isLoading ? (
                <Button onClick={handleCancelRequest} variant="destructive" size="icon">
                  <AlertCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  disabled={!input.trim() || connectionStatus !== "connected"}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Work Orders Tab - Full height */}
        <TabsContent value="work-orders" className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-y-auto">
            <ProcessorControl />
            <div className="h-4"></div>
            <WorkOrderList />
          </div>
        </TabsContent>

        {/* Config Tab - Full height */}
        <TabsContent value="config" className="flex-1 overflow-hidden p-0 h-full">
          <ConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

