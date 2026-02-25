import OpenAI from 'openai'

const globalForOpenAI = globalThis

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return null
  }

  if (!globalForOpenAI.__openaiClient) {
    globalForOpenAI.__openaiClient = new OpenAI({ apiKey })
  }

  return globalForOpenAI.__openaiClient
}
