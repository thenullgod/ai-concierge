// Environment variables with fallbacks
export const config = {
  // Use the environment variable if available, otherwise fall back to a default
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || "http://localhost:5000",

  // For client-side usage, we need to use NEXT_PUBLIC_ prefixed variables
  publicPythonServiceUrl: process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || "",

  // Determine if we're in development or production
  isDevelopment: process.env.NODE_ENV === "development",
}

// Helper function to get the appropriate Python service URL based on context
export function getPythonServiceUrl(isClientSide = false): string {
  // If we're on the client side, use the public URL
  if (isClientSide) {
    // First try localStorage (for user overrides)
    if (typeof window !== "undefined") {
      const localStorageUrl = localStorage.getItem("PYTHON_SERVICE_URL")
      if (localStorageUrl) {
        console.log("Using Python service URL from localStorage:", localStorageUrl)
        return localStorageUrl
      }
    }

    // Then try the public environment variable
    if (config.publicPythonServiceUrl) {
      console.log("Using Python service URL from NEXT_PUBLIC_PYTHON_SERVICE_URL:", config.publicPythonServiceUrl)
      return config.publicPythonServiceUrl
    }

    // If we're in development, use a default
    if (config.isDevelopment) {
      console.log("Using default Python service URL (development mode):", "http://localhost:5000")
      return "http://localhost:5000"
    }

    console.warn("No Python service URL configured for client-side use")
    return ""
  }

  // Otherwise use the server-side URL
  console.log("Using Python service URL from PYTHON_SERVICE_URL:", config.pythonServiceUrl)
  return config.pythonServiceUrl
}

// Helper function to check if we're in a production environment
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

// Helper function to get environment information
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || "unknown",
    vercelEnv: process.env.VERCEL_ENV || "unknown",
    pythonServiceUrl: config.pythonServiceUrl,
    publicPythonServiceUrl: config.publicPythonServiceUrl,
  }
}

