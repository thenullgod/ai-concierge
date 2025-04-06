"use client"

import { useState, useEffect } from "react"
import { Bot } from "lucide-react"

export function WelcomeMessage() {
  const [opacity, setOpacity] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Fade in
    setTimeout(() => setOpacity(1), 100)

    // Start fade out after 3 seconds
    const fadeOutTimer = setTimeout(() => {
      setOpacity(0)
    }, 3000)

    // Remove from DOM after fade out completes
    const removeTimer = setTimeout(() => {
      setVisible(false)
    }, 4000)

    return () => {
      clearTimeout(fadeOutTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10 transition-opacity duration-1000"
      style={{ opacity }}
    >
      <div className="flex flex-col items-center">
        <Bot className="h-12 w-12 text-gray-800 mb-4" />
        <h2 className="text-2xl font-medium text-gray-800">Hello, I am the Concierge</h2>
        <p className="text-gray-600 mt-2">Powered by Llama 3.2</p>
      </div>
    </div>
  )
}

