import { Action, TelegramContext } from 'bottender';
import { ChatAction } from 'bottender/dist/telegram/TelegramTypes';
import { router, text } from 'bottender/router';
import { clearServiceData, handleAudioForChat, handleChat } from './context';
import { setAzureVoiceName, setWhisperLang } from './settings';

async function HandleCommand(
  context: TelegramContext,
  {
    match: {
      groups: { command, content },
    },
  }: any
) {
  switch (command.toLowerCase()) {
    case 'new':
      await clearServiceData(context);
      break;
    case 'voice':
      await setAzureVoiceName(context, content)
      break;
    case 'language':
      await setWhisperLang(context, content)
      break;
    default:
      await context.sendText('Sorry! Command not found.');
      break;
  }
}

async function HandleVoice(context: TelegramContext) {
  await handleAudioForChat(context)
}

async function HandleText(context: TelegramContext) {
  await context.sendChatAction(ChatAction.Typing);
  let { text, replyToMessage } = context.event;
  const { text: replyText } = replyToMessage || {}
  if (replyText) {
    text += `\n${replyText}`
  }

  await handleChat(context, text)
}

export default async function App(
  context: TelegramContext
): Promise<Action<any> | void> {
  if (context.event.voice) {
    return HandleVoice;
  }
  return router([
    text(/^[/.](?<command>\w+)(?:\s(?<content>.+))?/i, HandleCommand),
    text('*', HandleText),
  ])
};
