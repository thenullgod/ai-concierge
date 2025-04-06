import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get the Python service URL from environment variable or localStorage (via window object)
    const PYTHON_SERVICE_URL =
      typeof window !== "undefined" && (window as any).PYTHON_SERVICE_URL
        ? (window as any).PYTHON_SERVICE_URL
        : process.env.PYTHON_SERVICE_URL || "http://localhost:5000"

    // Default configuration
    const DEFAULT_CONFIG = {
      imap: {
        server: "localhost",
        port: 993,
        username: "",
        password: "",
        folder: "INBOX",
      },
      xampp_mysql: {
        host: "localhost",
        user: "root",
        password: "",
        database: "work_orders",
        port: 3306,
      },
      crm: {
        base_url: "http://localhost/espocrm",
        username: "",
        password: "",
        import_endpoint: "/api/v1/Import",
      },
      model_path: "meta-llama/Llama-3.2-1B",
      csv_path: "/var/data/work_orders.csv",
      temp_dir: "/tmp/email_attachments",
      db_path: "/var/data/processing_logs.db",
    }

    // Add timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    const response = await fetch(`${PYTHON_SERVICE_URL}/config`, {
      signal: controller.signal,
    }).catch((error) => {
      // Handle network errors explicitly
      console.error("Network error when fetching configuration:", error)
      return null
    })

    clearTimeout(timeoutId)

    // If fetch failed or returned null
    if (!response) {
      console.log("Using default configuration because service is unavailable")
      return NextResponse.json(DEFAULT_CONFIG)
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch configuration: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching configuration:", error)
    return NextResponse.json({
      imap: {
        server: "localhost",
        port: 993,
        username: "",
        password: "",
        folder: "INBOX",
      },
      xampp_mysql: {
        host: "localhost",
        user: "root",
        password: "",
        database: "work_orders",
        port: 3306,
      },
      crm: {
        base_url: "http://localhost/espocrm",
        username: "",
        password: "",
        import_endpoint: "/api/v1/Import",
      },
      model_path: "meta-llama/Llama-3.2-1B",
      csv_path: "/var/data/work_orders.csv",
      temp_dir: "/tmp/email_attachments",
      db_path: "/var/data/processing_logs.db",
    })
  }
}

export async function POST(request: Request) {
  try {
    // Get the Python service URL from environment variable or localStorage (via window object)
    const PYTHON_SERVICE_URL =
      typeof window !== "undefined" && (window as any).PYTHON_SERVICE_URL
        ? (window as any).PYTHON_SERVICE_URL
        : process.env.PYTHON_SERVICE_URL || "http://localhost:5000"

    const body = await request.json()

    // Add timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    const response = await fetch(`${PYTHON_SERVICE_URL}/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).catch((error) => {
      // Handle network errors explicitly
      console.error("Network error when updating configuration:", error)
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
      throw new Error(`Failed to update configuration: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating configuration:", error)
    return NextResponse.json(
      {
        status: "error",
        message: `Failed to update configuration: ${error.message || "Unknown error"}`,
      },
      { status: 200 },
    ) // Return 200 to avoid breaking the UI
  }
}

