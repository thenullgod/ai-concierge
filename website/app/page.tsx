import { ChatBox } from "@/components/chat-box"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">The Concierge</h1>
        <ChatBox />
      </div>
    </main>
  )
}

