import { NextResponse } from "next/server"

// Reference to the running process from the run route
let runningProcess: any = null

export async function POST() {
  try {
    if (!runningProcess) {
      return NextResponse.json({
        status: "info",
        message: "No script is currently running.",
      })
    }

    // Kill the process
    if (process.platform === "win32") {
      // On Windows, we need to use taskkill to kill the process tree
      const { spawn } = require("child_process")
      spawn("taskkill", ["/pid", runningProcess.pid, "/f", "/t"])
    } else {
      // On Unix-like systems, we can kill the process group
      process.kill(-runningProcess.pid, "SIGTERM")
    }

    // Reset the running process
    runningProcess = null

    return NextResponse.json({
      status: "success",
      message: "Script stopped successfully",
    })
  } catch (error) {
    console.error("Error stopping script:", error)
    return NextResponse.json(
      {
        status: "error",
        message: `Failed to stop script: ${error.message || "Unknown error"}`,
      },
      { status: 200 },
    )
  }
}

