/**
 * Event Handler Registry
 * 预注册的事件 ID → handler 函数映射
 * 基于 PRD 4.5.5 GENUI-H4
 */

type EventHandler = (...args: any[]) => void

const handlers = new Map<string, EventHandler>()

/** 注册 event handler */
export function registerEventHandler(eventId: string, handler: EventHandler) {
  handlers.set(eventId, handler)
}

/** 获取 event handler */
export function getEventHandler(eventId: string): EventHandler | undefined {
  return handlers.get(eventId)
}

/** 批量注册 */
export function registerHandlers(map: Record<string, EventHandler>) {
  for (const [id, fn] of Object.entries(map)) {
    handlers.set(id, fn)
  }
}
