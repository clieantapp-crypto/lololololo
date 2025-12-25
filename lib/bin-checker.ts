interface BinCheckResult {
    success: boolean
    data?: {
      BIN: {
        valid: boolean
        number: number
        length: number
        scheme: string
        brand: string
      }
      country: {
        A2: string
        A3: string
        N3: string
        ISD: string
        name: string
        cont: string
      }
      bank: {
        name: string
        website: string
        phone: string
      }
      type: string
      level: string
      prepaid: boolean
    }
    error?: string
  }
  
  export async function checkBIN(cardNumber: string): Promise<BinCheckResult> {
    try {
      // Extract first 6 digits (BIN)
      const bin = cardNumber.replace(/\s/g, "").substring(0, 6)
  
      if (bin.length < 6) {
        return {
          success: false,
          error: "Invalid card number - needs at least 6 digits",
        }
      }
  
      const url = `https://bin-ip-checker.p.rapidapi.com/?bin=${bin}`
      const options = {
        method: "GET",
        headers: {
          "x-rapidapi-key": "e367ccd301mshf84b571123e23b0p178fafjsn8c72bcc63cbc",
          "x-rapidapi-host": "bin-ip-checker.p.rapidapi.com",
        },
      }
  
      const response = await fetch(url, options)
  
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
  
      const result = await response.json()
  
      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error("[v0] BIN checker error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
  