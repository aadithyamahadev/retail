import OpenAI from 'openai'

const globalForOpenAI = globalThis

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required')
  }

  if (!globalForOpenAI.__openaiClient) {
    globalForOpenAI.__openaiClient = new OpenAI({ apiKey })
  }

  return globalForOpenAI.__openaiClient
}
