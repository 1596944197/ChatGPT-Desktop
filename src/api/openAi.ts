import type { MessageData } from '@/types'
import {
  fetchEventSource,
  type EventSourceMessage
} from '@microsoft/fetch-event-source'

/**
 * 获取 openai 对话消息
 * @param messages 消息列表
 */
export const getOpenAIResultApi = async (value?: string) => {
  const apiKey = getOpenAIKey()
  if (!apiKey) return

  const { isThinking, sessionDataList } = storeToRefs(useSessionStore())
  const { updateSessionData, addSessionData } = useSessionStore()

  try {
    const messages: MessageData[] = []

    if (!value) {
      // 重复上一次提问
      const { sessionDataList } = useSessionStore()

      const lastQuestion = sessionDataList.filter((item) => item.is_ask).at(-1)
      if (!lastQuestion) return

      const deleteSql = `DELETE FROM session_data WHERE session_id = '${lastQuestion?.session_id}' AND id >= ${lastQuestion?.id};`
      await executeSQL(deleteSql)

      messages.push(lastQuestion.message)
    } else {
      messages.push({
        role: 'user',
        content: value
      })
    }

    isThinking.value = true

    await addSessionData({
      isAsk: true,
      data: messages.at(-1)!
    })

    // 官方参数 https://platform.openai.com/docs/api-reference/images/create
    const RequestConfig = {
      prompt: value,
      n: 1,
      size: '256x256',
      response_format: 'url', // 'url' | 'b64_json 我电脑使用b64会导致死机
      user: ''
    }

    const {
      proxy: { bypass, url: proxyURL }
    } = useSettingsStore()

    let url = '/v1/images/generations'

    if (bypass && proxyURL) {
      url = proxyURL + url
    } else {
      url = HOST_URL.OPENAI + url
    }

    const response: {
      created: number
      data: {
        b64_json: string
        url: string
      }[]
    } = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(RequestConfig),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      }
    }).then((res) => res.json())

    let content = ''
    if (response.data instanceof Array) {
      response.data.forEach(({ url }) => {
        content += `![图片](${url}) \n\n`
      })
    }

    await addSessionData({
      isAsk: false,
      data: {
        role: 'assistant',
        content
      }
    })
  } catch ({ message }: any) {
    sessionDataList.value.at(-1)!.message.content = message as any
  } finally {
    updateSessionData(sessionDataList.value.at(-1)!)

    isThinking.value = false
  }
}

/**
 * 获取 openai 对话消息(流)
 * @param messages 消息列表
 */
export const getOpenAIResultStreamApi = async (messages: MessageData[]) => {
  if (!messages.length) return

  const apiKey = getOpenAIKey()
  if (!apiKey) return

  const { updateSessionData } = useSessionStore()
  const { sessionDataList, chatController } = storeToRefs(useSessionStore())
  const {
    proxy: { bypass, url: proxyURL },
    modalParams: { temperature, max_tokens }
  } = useSettingsStore()

  let url = '/v1/chat/completions'

  if (bypass && proxyURL) {
    url = proxyURL + url
  } else {
    url = HOST_URL.OPENAI + url
  }

  // 创建一个新的 AbortController
  const abortController = new AbortController()
  chatController.value = abortController

  await fetchEventSource(url, {
    method: 'POST',
    body: JSON.stringify({
      model: OPEN_AI_MODEL,
      messages,
      temperature,
      max_tokens,
      stream: true
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    signal: abortController.signal,
    async onopen(response) {
      if (response.ok) return

      if (response.status === 429) {
        throw new Error('请求的 key 超出限制')
      } else if (response.status === 401) {
        throw new Error('请求的 API KEY 无效')
      } else {
        throw new Error('请求出错')
      }
    },
    onmessage(msg: EventSourceMessage) {
      if (msg.data !== '[DONE]') {
        const { choices } = JSON.parse(msg.data)

        if (!choices[0].delta.content) return

        sessionDataList.value.at(-1)!.message.content +=
          choices[0].delta.content
      }
    },
    onclose() {
      updateSessionData(sessionDataList.value.at(-1)!)
    },
    onerror({ message }: any) {
      throw new Error(message)
    }
  })
}

/**
 * 获取账号余额信息
 */
export const getOpenAICreditApi = async () => {
  try {
    const apiKey = getOpenAIKey()
    if (!apiKey) return

    const result = await request('/dashboard/billing/credit_grants', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        HostUrl: HOST_URL.OPENAI
      }
    })

    return result
  } catch ({ message }: any) {
    const { isThinking } = useSessionStore()

    if (isThinking) {
      return '请求的 API KEY 无效'
    }
  }
}
