import { register, unregisterAll } from '@tauri-apps/api/globalShortcut'
import { appWindow } from '@tauri-apps/api/window'
import { hide, show } from '@tauri-apps/api/app'
import { enable, disable } from 'tauri-plugin-autostart-api'

export const useSettingsStore = defineStore(
  'settingsStore',
  () => {
    // 主题
    const themeMode = ref(THEME.light)

    // 用户的唯一值
    const uuid = ref('')

    // 是否固定窗口
    const isFix = ref(true)

    // 窗口获取焦点状态
    const windowFocused = ref(true)

    // openAI api key
    const apiKey = ref('')

    // 全局快捷键
    const prevShortcutKeys = ref<string[]>([])
    const shortcutKeys = ref<string[]>([])
    const isBinding = ref(false)

    // 开机自启动
    const autoStart = ref(false)

    // 记忆对话
    const isMemory = ref(false)

    // 是否记住上次位置
    const isRememberPosition = ref(false)

    // 切换主题
    const toggleTheme = () => {
      themeMode.value =
        themeMode.value === THEME.light ? THEME.dark : THEME.light
    }

    // 绑定快捷键
    const registerKey = async () => {
      await unregisterAll()

      register(shortcutKeys.value.join('+'), () => {
        // 如果窗口已经显示，就隐藏
        if (!windowFocused.value) {
          // 窗口打开时居中还是上次位置
          if (!isRememberPosition.value) {
            appWindow.center()
          }

          appWindow.unminimize()
          show() // macos 显示程序专用
          appWindow.show()
          appWindow.setFocus()
        } else {
          hide() // macos 隐藏程序专用
          appWindow.hide()
        }
      })
    }

    // 获取 uuid
    onMounted(() => {
      if (uuid.value) return

      uuid.value = crypto.randomUUID()
    })

    // 监听主题
    watchEffect(() => {
      document.body.setAttribute('arco-theme', themeMode.value)
    })

    // 监听快捷键更换
    watchEffect(() => {
      if (isBinding.value || shortcutKeys.value.length) return

      shortcutKeys.value = prevShortcutKeys.value.length
        ? prevShortcutKeys.value
        : DEFAULT_SHORTCUT_KEY
    })

    // 监听快捷键绑定状态
    watchEffect(() => {
      if (isBinding.value) {
        prevShortcutKeys.value = shortcutKeys.value
        shortcutKeys.value = []

        unregisterAll()
      } else {
        registerKey()
      }
    })

    // 监听开机自启动
    watchEffect(() => {
      autoStart.value ? enable() : disable()
    })

    // 监听显示设备变化时，重置窗口位置到中间，以防止窗口位置偏移到屏幕外
    appWindow.onScaleChanged(() => {
      appWindow.center()
    })

    return {
      themeMode,
      uuid,
      isFix,
      windowFocused,
      apiKey,
      shortcutKeys,
      isBinding,
      autoStart,
      isMemory,
      isRememberPosition,
      toggleTheme
    }
  },
  {
    persist: {
      paths: [
        'themeMode',
        'uuid',
        'apiKey',
        'shortcutKeys',
        'autoStart',
        'isMemory',
        'isRememberPosition'
      ]
    }
  }
)
