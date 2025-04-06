import { NextResponse } from "next/server"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import os from "os"

// Global variable to track the running process
let runningProcess: any = null

export async function POST(request: Request) {
  try {
    // If a process is already running, return an error
    if (runningProcess) {
      return NextResponse.json(
        {
          status: "error",
          message: "A script is already running. Please stop it first.",
        },
        { status: 200 },
      )
    }

    const body = await request.json()
    const { autoRestart } = body

    // Create a temporary directory for the script if it doesn't exist
    const scriptDir = path.join(os.tmpdir(), "email-parser")
    if (!fs.existsSync(scriptDir)) {
      fs.mkdirSync(scriptDir, { recursive: true })
    }

    // Path to the script
    const scriptPath = path.join(scriptDir, "email_parser.py")

    // Check if the script exists, if not, create it
    if (!fs.existsSync(scriptPath)) {
      // Get the script content from the embedded script
      const scriptContent = fs.readFileSync(path.join(process.cwd(), "python-service", "email_parser.py"), "utf8")
      fs.writeFileSync(scriptPath, scriptContent)
    }

    // Create a log file for the script output
    const logPath = path.join(scriptDir, "email_parser.log")
    const logStream = fs.createWriteStream(logPath, { flags: "a" })

    // Determine the Python executable
    const pythonExecutable = process.platform === "win32" ? "python" : "python3"

    // Run the script
    runningProcess = spawn(pythonExecutable, [scriptPath, autoRestart ? "--auto-restart" : ""])

    // Capture output
    let output = ""

    runningProcess.stdout.on("data", (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      logStream.write(chunk)
    })

    runningProcess.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      logStream.write(chunk)
    })

    // Handle process exit
    runningProcess.on("close", (code: number) => {
      logStream.end()
      runningProcess = null

      if (code !== 0) {
        console.error(`Script exited with code ${code}`)
      }
    })

    // Return success response
    return NextResponse.json({
      status: "success",
      message: "Script started successfully",
      output: "Script started. Output will be updated as it becomes available.",
    })
  } catch (error) {
    console.error("Error running script:", error)
    return NextResponse.json(
      {
        status: "error",
        message: `Failed to run script: ${error.message || "Unknown error"}`,
      },
      { status: 200 },
    )
  }
}

