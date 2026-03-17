import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // reads ANTHROPIC_API_KEY from env

export const MODELS = {
  OPUS:   'claude-opus-4-6',
  SONNET: 'claude-sonnet-4-6',
}

const CALL_ROUTES = {
  // OPUS — premium, low frequency
  FULL_PREDICTION_REPORT:    MODELS.OPUS,
  DEER_PROGRESSION_REPORT:   MODELS.OPUS,
  PROPERTY_HEALTH_REPORT:    MODELS.OPUS,
  CALIBRATION_ANALYSIS:      MODELS.OPUS,
  STAND_BURNOUT_ANALYSIS:    MODELS.OPUS,
  GHOST_BUCK_PREDICTION:     MODELS.OPUS,

  // SONNET — high-volume, background
  PHOTO_ANALYSIS:            MODELS.SONNET,
  DEER_ID_SIMILARITY:        MODELS.SONNET,
  WEEKLY_BRIEFING:           MODELS.SONNET,
  SIGN_ACTIVITY_SUMMARY:     MODELS.SONNET,
  SEASONAL_SNAPSHOT_SUMMARY: MODELS.SONNET,
  SEMANTIC_SEARCH_SUMMARY:   MODELS.SONNET,
}

/**
 * Streaming narrative response
 */
export async function claudeStream(callType, systemPrompt, messages, opts = {}) {
  const model = CALL_ROUTES[callType] ?? MODELS.SONNET
  const { maxTokens = 4096, tools, onToken } = opts

  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    ...(tools ? { tools } : {}),
  })

  let fullText = ''
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text
      onToken?.(chunk.delta.text)
    }
  }
  return { text: fullText, model, callType }
}

/**
 * Structured JSON response via tool_use
 */
export async function claudeStructured(callType, systemPrompt, messages, outputSchema) {
  const model = CALL_ROUTES[callType] ?? MODELS.SONNET

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages,
    tools: [{
      name: 'structured_output',
      description: 'Return the structured result',
      input_schema: outputSchema,
    }],
    tool_choice: { type: 'tool', name: 'structured_output' },
  })

  const toolBlock = response.content.find(b => b.type === 'tool_use')
  return { data: toolBlock?.input ?? {}, model, callType }
}

/**
 * Vision call — photo analysis (always Sonnet)
 */
export async function claudeVision(base64Image, prompt, mediaType = 'image/jpeg') {
  const response = await client.messages.create({
    model: MODELS.SONNET,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
        { type: 'text', text: prompt },
      ],
    }],
  })
  return response.content[0]?.text ?? ''
}
