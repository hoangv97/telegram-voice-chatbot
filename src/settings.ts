import { TelegramContext } from "bottender";

const getSettings = (context: TelegramContext): any => {
  return context.state.settings || {}
}

export const setSettings = async (context: TelegramContext, key: string, value: string) => {
  let newValue: any = value
  if (value === 'true') {
    newValue = true
  } else if (value === 'false') {
    newValue = false
  }
  context.setState({
    ...context.state,
    settings: {
      ...getSettings(context),
      [key]: newValue,
    },
  })
}

export const setWhisperLang = async (context: TelegramContext, language: string) => {
  await setSettings(context, 'whisperLang', language)
}

export const getWhisperLang = (context: TelegramContext) => {
  return getSettings(context).whisperLang || 'en';
}

export const setAzureVoiceName = async (context: TelegramContext, voiceName: string) => {
  await setSettings(context, 'azureVoiceName', voiceName)
}

export const getAzureVoiceName = (context: TelegramContext) => {
  return getSettings(context).azureVoiceName || 'en-US-JennyNeural';
}