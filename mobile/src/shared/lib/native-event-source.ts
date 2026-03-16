/**
 * Лёгкий SSE-клиент для React Native.
 *
 * Пакет `eventsource` (npm) — Node.js-реализация, использующая глобальные
 * `Event` и `ErrorEvent`, которых нет в Hermes/JSC. Эта реализация работает
 * поверх `XMLHttpRequest`, который стабильно поддерживает streaming в RN.
 *
 * Поддерживает:
 * - Заголовки (для Bearer-токена)
 * - `onmessage` / `onopen` / `onerror` callbacks
 * - `close()` для отключения
 */

type SSEHandler = (event: { data: string }) => void

interface NativeSSEOptions {
  headers?: Record<string, string>
}

export class NativeEventSource {
  private xhr: XMLHttpRequest | null = null
  private lastIndex = 0
  private _url: string
  private _options: NativeSSEOptions

  onopen: (() => void) | null = null
  onmessage: SSEHandler | null = null
  onerror: (() => void) | null = null

  readyState: number = 0 // 0=CONNECTING, 1=OPEN, 2=CLOSED

  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2

  constructor(url: string, options?: NativeSSEOptions) {
    this._url = url
    this._options = options ?? {}
    this.connect()
  }

  private connect() {
    this.lastIndex = 0
    this.readyState = NativeEventSource.CONNECTING

    const xhr = new XMLHttpRequest()
    this.xhr = xhr

    xhr.open('GET', this._url, true)
    xhr.setRequestHeader('Accept', 'text/event-stream')
    xhr.setRequestHeader('Cache-Control', 'no-cache')

    // Применяем кастомные заголовки (напр. Authorization)
    if (this._options.headers) {
      for (const [key, value] of Object.entries(this._options.headers)) {
        xhr.setRequestHeader(key, value)
      }
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        // Данные поступают (3) или завершены (4)
        if (xhr.status === 200) {
          if (this.readyState === NativeEventSource.CONNECTING) {
            this.readyState = NativeEventSource.OPEN
            this.onopen?.()
          }
          this.processBuffer(xhr.responseText)
        }

        if (xhr.readyState === 4) {
          // Соединение закрыто сервером
          if (this.readyState !== NativeEventSource.CLOSED) {
            this.readyState = NativeEventSource.CLOSED
            this.onerror?.()
          }
        }
      }
    }

    xhr.onerror = () => {
      if (this.readyState !== NativeEventSource.CLOSED) {
        this.readyState = NativeEventSource.CLOSED
        this.onerror?.()
      }
    }

    xhr.send()
  }

  private processBuffer(responseText: string) {
    // Обрабатываем только новые данные с позиции lastIndex
    const newText = responseText.substring(this.lastIndex)
    this.lastIndex = responseText.length

    if (!newText) return

    // Разбиваем на блоки по двойному переводу строки (SSE-спецификация)
    const chunks = newText.split('\n\n')

    for (const chunk of chunks) {
      if (!chunk.trim()) continue

      const lines = chunk.split('\n')
      let data = ''

      for (const line of lines) {
        // Пропускаем комментарии (keepalive)
        if (line.startsWith(':')) continue

        if (line.startsWith('data:')) {
          // "data: {...}" или "data:{...}"
          data += line.substring(line.startsWith('data: ') ? 6 : 5)
        }
      }

      if (data) {
        this.onmessage?.({ data })
      }
    }
  }

  close() {
    this.readyState = NativeEventSource.CLOSED
    if (this.xhr) {
      this.xhr.abort()
      this.xhr = null
    }
  }
}
