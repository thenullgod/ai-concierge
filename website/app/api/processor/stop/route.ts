import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Get the Python service URL from environment variable or localStorage (via window object)
    const PYTHON_SERVICE_URL =
      typeof window !== "undefined" && (window as any).PYTHON_SERVICE_URL
        ? (window as any).PYTHON_SERVICE_URL
        : process.env.PYTHON_SERVICE_URL || "http://localhost:5000"

    // Add timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    const response = await fetch(`${PYTHON_SERVICE_URL}/stop-processor`, {
      method: "POST",
      signal: controller.signal,
    }).catch((error) => {
      // Handle network errors explicitly
      console.error("Network error when stopping processor:", error)
      return null
    })

    clearTimeout(timeoutId)

    // If fetch failed or returned null
    if (!response) {
      return NextResponse.json(
        {
          status: "error",
          message: "Cannot connect to the email processor service. Make sure it's running.",
        },
        { status: 200 },
      ) // Return 200 to avoid breaking the UI
    }

    if (!response.ok) {
      throw new Error(`Failed to stop processor: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error stopping processor:", error)
    return NextResponse.json(
      {
        status: "error",
        message: `Failed to stop the email processor: ${error.message || "Unknown error"}`,
      },
      { status: 200 },
    ) // Return 200 to avoid breaking the UI
  }
}

