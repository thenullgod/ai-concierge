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

    const response = await fetch(`${PYTHON_SERVICE_URL}/start-processor`, {
      method: "POST",
      signal: controller.signal,
    }).catch((error) => {
      // Handle network errors explicitly
      console.error("Network error when starting processor:", error)
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
      throw new Error(`Failed to start processor: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error starting processor:", error)
    return NextResponse.json(
      {
        status: "error",
        message: `Failed to start the email processor: ${error.message || "Unknown error"}`,
      },
      { status: 200 },
    ) // Return 200 to avoid breaking the UI
  }
}

