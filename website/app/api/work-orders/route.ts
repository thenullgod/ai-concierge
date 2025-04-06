import { NextResponse } from "next/server"
import { getPythonServiceUrl } from "@/app/config"

export async function GET() {
  try {
    // Get the Python service URL from our config
    const PYTHON_SERVICE_URL = getPythonServiceUrl()

    // Add timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    const response = await fetch(`${PYTHON_SERVICE_URL}/work-orders`, {
      signal: controller.signal,
    }).catch((error) => {
      // Handle network errors explicitly
      console.error("Network error when fetching work orders:", error)
      return null
    })

    clearTimeout(timeoutId)

    // If fetch failed or returned null
    if (!response) {
      // Return sample data when service is unavailable
      return NextResponse.json([
        {
          id: 1,
          title: "Fix Leaking Roof",
          priority: "HIGH",
          description: "Customer reported water damage from roof leak in master bedroom",
          due_date: "2025-04-10",
          customer: "John Smith",
          location: "123 Main St, Anytown, USA",
          trade: "Roofing",
          created_at: "2025-04-03T12:30:00",
          summary: "Urgent roof repair needed due to water damage in master bedroom.",
          action_items: "1. Inspect roof\n2. Repair damaged shingles\n3. Check for interior water damage",
        },
        {
          id: 2,
          title: "HVAC Maintenance",
          priority: "NORMAL",
          description: "Annual HVAC system check and filter replacement",
          due_date: "2025-04-15",
          customer: "Jane Doe",
          location: "456 Oak Ave, Somewhere, USA",
          trade: "HVAC",
          created_at: "2025-04-02T09:15:00",
          summary: "Routine annual HVAC maintenance and filter replacement.",
          action_items: "1. Replace air filters\n2. Clean condenser coils\n3. Check refrigerant levels",
        },
      ])
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch work orders: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching work orders:", error)

    // Return sample data on error
    return NextResponse.json([
      {
        id: 1,
        title: "Fix Leaking Roof",
        priority: "HIGH",
        description: "Customer reported water damage from roof leak in master bedroom",
        due_date: "2025-04-10",
        customer: "John Smith",
        location: "123 Main St, Anytown, USA",
        trade: "Roofing",
        created_at: "2025-04-03T12:30:00",
        summary: "Urgent roof repair needed due to water damage in master bedroom.",
        action_items: "1. Inspect roof\n2. Repair damaged shingles\n3. Check for interior water damage",
      },
      {
        id: 2,
        title: "HVAC Maintenance",
        priority: "NORMAL",
        description: "Annual HVAC system check and filter replacement",
        due_date: "2025-04-15",
        customer: "Jane Doe",
        location: "456 Oak Ave, Somewhere, USA",
        trade: "HVAC",
        created_at: "2025-04-02T09:15:00",
        summary: "Routine annual HVAC maintenance and filter replacement.",
        action_items: "1. Replace air filters\n2. Clean condenser coils\n3. Check refrigerant levels",
      },
    ])
  }
}

