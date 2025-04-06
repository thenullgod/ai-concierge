import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    // Path to the script
    const scriptPath = path.join(process.cwd(), "python-service", "email_parser.py")

    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Script file not found",
        },
        { status: 404 },
      )
    }

    // Read the script content
    const scriptContent = fs.readFileSync(scriptPath, "utf8")

    // Return the script as a downloadable file
    return new NextResponse(scriptContent, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": "attachment; filename=email_parser.py",
      },
    })
  } catch (error) {
    console.error("Error downloading script:", error)
    return NextResponse.json(
      {
        status: "error",
        message: `Failed to download script: ${error.message || "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}

