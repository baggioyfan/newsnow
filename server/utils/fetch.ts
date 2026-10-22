import { $fetch } from "ofetch"
import { ProxyAgent } from "undici"

// 只有这些域名（及其子域）的请求走代理，其余源保持直连。
// 命中的原因：大陆网络下 zaochenbao.com 连接被重置、store.steampowered.com 不稳、
// fastbull.com 对大陆 IP 直接 302 到 /accessDenied（于是解析出 0 条，表现为空内容）。
const PROXY_HOSTS = [
  "zaochenbao.com",
  "fastbull.com",
  "store.steampowered.com",
]

const proxyURL = process.env.NEWSNOW_PROXY?.trim()
let proxyAgent: ProxyAgent | undefined

function proxyDispatcherFor(url: string) {
  if (!proxyURL) return undefined
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return undefined
  }
  const matched = PROXY_HOSTS.some(h => host === h || host.endsWith(`.${h}`))
  if (!matched) return undefined
  proxyAgent ??= new ProxyAgent(proxyURL)
  return proxyAgent
}

export const myFetch = $fetch.create({
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  },
  timeout: 10000,
  retry: 3,
  onRequest({ request, options }) {
    const url = typeof request === "string"
      ? request
      : request instanceof URL
        ? request.href
        : (request as Request).url
    const dispatcher = proxyDispatcherFor(url)
    if (dispatcher) (options as Record<string, unknown>).dispatcher = dispatcher
  },
})
