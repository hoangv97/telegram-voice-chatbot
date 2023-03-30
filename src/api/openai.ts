import fs from 'fs';
import { TelegramContext } from "bottender";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { convertOggToMp3, deleteDownloadFile, downloadFile } from '../file';
import { encode } from 'gpt-3-encoder';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const getTokens = (messages: ChatCompletionRequestMessage[]) => {
  const tokens = messages.reduce((prev, curr) => prev + encode(curr.content).length, 0)
  // console.log(tokens)
  return tokens;
}

const handleError = async (context: TelegramContext, error: any) => {
  let message;
  try {
    if (error.response) {
      message = error.response.data.error.message;
    } else {
      message = error.message;
    }
  } catch (e) {
    console.log(e)
  } finally {
    await context.sendText(message || 'Error!');
  }
};

export const createCompletion = async (messages: ChatCompletionRequestMessage[], max_tokens?: number, temperature?: number) => {
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages,
    max_tokens,
    temperature,
  });
  return response.data.choices;
};

export const createCompletionFromConversation = async (
  context: TelegramContext,
  messages: ChatCompletionRequestMessage[]) => {
  try {
    // limit response to avoid message length limit
    const response_max_tokens = 500
    const GPT3_MAX_TOKENS = 4096
    const max_tokens = Math.min(getTokens(messages) + response_max_tokens, GPT3_MAX_TOKENS)

    const response = await createCompletion(messages, max_tokens);
    return response[0].message?.content;
  } catch (e) {
    handleError(context, e);
    return null;
  }
};

const downloadsPath = './static/voices';

export const getTranscription = async (context: TelegramContext, url: string, language?: string) => {
  try {
    let filePath = await downloadFile(url, downloadsPath);
    if (filePath.endsWith('.oga')) {
      const newFilePath = filePath.replace('.oga', '.mp3')
      await convertOggToMp3(filePath, newFilePath)
      deleteDownloadFile(filePath)
      filePath = newFilePath
    }
    const response = await openai.createTranscription(
      fs.createReadStream(filePath) as any,
      'whisper-1',
      undefined, undefined, undefined,
      language,
    );
    deleteDownloadFile(filePath)
    return response.data.text
  } catch (e) {
    handleError(context, e);
    return null;
  }
}