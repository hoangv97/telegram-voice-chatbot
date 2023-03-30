import { TelegramContext } from "bottender";
import { ChatAction, ParseMode } from "bottender/dist/telegram/TelegramTypes";
import { deleteDownloadFile, encodeOggWithOpus } from "./file";
import { createCompletionFromConversation, getTranscription } from "./api/openai";
import { getAzureVoiceName } from "./settings";
import { v4 as uuidv4 } from 'uuid';
import { textToSpeech } from "./api/azure";
import { getFileUrl } from "./api/telegram";

export const clearServiceData = async (context: TelegramContext) => {
  context.setState({
    ...context.state,
    context: [],
  });
  await context.sendText('New conversation.');
};

export const handleAudioForChat = async (context: TelegramContext) => {
  let transcription: any
  const fileUrl = await getFileUrl(context.event.voice.fileId)
  if (fileUrl) {
    transcription = await getTranscription(context, fileUrl)
  }
  if (!transcription) {
    await context.sendText(`Error getting transcription!`);
    return
  }

  // await context.sendMessage(`_${transcription}_`, { parseMode: ParseMode.Markdown });

  await context.sendChatAction(ChatAction.Typing);
  await handleChat(context, transcription)
}

export const handleTextToSpeech = async (context: TelegramContext, message: string, voiceName?: string) => {
  try {
    await context.sendChatAction(ChatAction.Typing);

    // set random filename
    const fileId = uuidv4().replaceAll('-', '')
    const outputDir = `static/voices`
    const outputFile = `${outputDir}/voice_${fileId}.ogg`
    const encodedOutputFile = `${outputDir}/voice_${fileId}_encoded.ogg`

    const result = await textToSpeech(
      message || '',
      outputFile,
      voiceName || getAzureVoiceName(context)
    )
    await encodeOggWithOpus(outputFile, encodedOutputFile)

    const voiceUrl = `${process.env.PROD_API_URL}/${encodedOutputFile}`

    await context.sendVoice(voiceUrl)

    deleteDownloadFile(outputFile)
    deleteDownloadFile(encodedOutputFile)
  } catch (err) {
    console.trace("err - " + err);
  }
}

export const handleChat = async (context: TelegramContext, text: string) => {
  const response = await createCompletionFromConversation(context, [
    ...context.state.context as any,
    { role: 'user', content: text },
  ]);
  if (!response) {
    await context.sendText('Sorry! Please try again.');
    return;
  }
  let content = response.trim()
  // console.log(content)

  await context.sendMessage(content, { parseMode: ParseMode.Markdown });
  await handleTextToSpeech(context, content, getAzureVoiceName(context))

  context.setState({
    ...context.state,
    context: [
      ...context.state.context as any,
      { role: 'user', content: text },
      { role: 'assistant', content },
    ],
  });
}