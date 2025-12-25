"use client"

import { useEffect, useState } from "react"
import { ref, onValue } from "firebase/database"
import { database } from "@/lib/firestore"

export function UserStatus({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"online" | "offline" | "unknown">("unknown")

  useEffect(() => {
    const userStatusRef = ref(database, `/status/${userId}`)
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setStatus(data.state === "online" ? "online" : "offline")
      } else {
        setStatus("unknown")
      }
    })
    return () => unsubscribe()
  }, [userId])

  return (
    <div
      className={`h-3 w-3 rounded-full ${
        status === "online"
          ? "bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"
          : status === "offline"
            ? "bg-gray-400"
            : "bg-amber-400 animate-pulse"
      }`}
    />
  )
}
