import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get the Python service URL from environment variable or localStorage (via window object)
    const PYTHON_SERVICE_URL =
      typeof window !== "undefined" && (window as any).PYTHON_SERVICE_URL
        ? (window as any).PYTHON_SERVICE_URL
        : process.env.PYTHON_SERVICE_URL || "http://localhost:5000"

    // Add timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    const response = await fetch(`${PYTHON_SERVICE_URL}/processor-status`, {
      signal: controller.signal,
    }).catch((error) => {
      // Handle network errors explicitly
      console.error("Network error when fetching processor status:", error)
      return null
    })

    clearTimeout(timeoutId)

    // If fetch failed or returned null
    if (!response) {
      return NextResponse.json({
        running: false,
        last_check: null,
        emails_processed: 0,
        logs: [
          {
            timestamp: new Date().toISOString(),
            message: "Cannot connect to the email processor service. Make sure it's running.",
            status: "error",
          },
        ],
      })
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch processor status: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching processor status:", error)

    // Return a valid response with error information
    return NextResponse.json({
      running: false,
      last_check: null,
      emails_processed: 0,
      logs: [
        {
          timestamp: new Date().toISOString(),
          message: `Failed to connect to the email processor service: ${error.message || "Unknown error"}`,
          status: "error",
        },
      ],
    })
  }
}

