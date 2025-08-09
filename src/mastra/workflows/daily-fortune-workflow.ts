import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const fortuneSchema = z.object({
  date: z.string().describe('今日の日付'),
  fortune: z.string().describe('運勢の詳細'),
  luckyColor: z.string().describe('ラッキーカラー'),
  luckyItem: z.string().describe('ラッキーアイテム'),
  advice: z.string().describe('蘭華からのアドバイス'),
});

const bookRecommendationSchema = z.object({
  fortune: fortuneSchema,
  recommendedBook: z.object({
    title: z.string().describe('本のタイトル'),
    author: z.string().describe('著者'),
    reason: z.string().describe('なぜこの本が運気を上げるのか'),
    rankaMessage: z.string().describe('蘭華からの特別なメッセージ'),
  }),
});

const analyzeFortune = createStep({
  id: 'analyze-fortune',
  description: '今日の運勢を占う',
  inputSchema: z.object({
    userName: z.string().optional().describe('ユーザーの名前（あれば）'),
  }),
  outputSchema: fortuneSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    const userName = inputData?.userName ? `${inputData.userName}様` : 'お客様';
    
    const prompt = `あなたは月読堂の朧月蘭華です。
    今日は${dateStr}です。
    ${userName}の今日の運勢を、狐の妖術で占ってください。
    
    以下の形式で答えてください：
    
    運勢: [200文字程度で今日の運勢を詳しく]
    ラッキーカラー: [色名]
    ラッキーアイテム: [アイテム名]
    アドバイス: [100文字程度で蘭華らしい優雅なアドバイス]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    const fortuneMatch = responseText.match(/運勢:\s*(.+?)(?=ラッキーカラー:|$)/s);
    const colorMatch = responseText.match(/ラッキーカラー:\s*(.+?)(?=ラッキーアイテム:|$)/s);
    const itemMatch = responseText.match(/ラッキーアイテム:\s*(.+?)(?=アドバイス:|$)/s);
    const adviceMatch = responseText.match(/アドバイス:\s*(.+?)$/s);

    return {
      date: dateStr,
      fortune: fortuneMatch?.[1]?.trim() || '今日は穏やかな一日となりそうですわ。',
      luckyColor: colorMatch?.[1]?.trim() || '琥珀色',
      luckyItem: itemMatch?.[1]?.trim() || '古い書物',
      advice: adviceMatch?.[1]?.trim() || '心を落ち着けて、ゆったりとお過ごしくださいませ。',
    };
  },
});

const recommendLuckyBook = createStep({
  id: 'recommend-lucky-book',
  description: '運勢に基づいた開運の本を推薦',
  inputSchema: fortuneSchema,
  outputSchema: bookRecommendationSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    if (!inputData) {
      throw new Error('Fortune data is required');
    }

    const prompt = `あなたは月読堂の朧月蘭華です。
    
    以下の運勢の結果を踏まえて、運気を上げる本を推薦してください：
    運勢: ${inputData.fortune}
    ラッキーカラー: ${inputData.luckyColor}
    ラッキーアイテム: ${inputData.luckyItem}
    
    月読堂にある架空の古書から、この運勢に最も相応しい一冊を選んでください。
    
    以下の形式で答えてください：
    
    本のタイトル: [古風で趣のあるタイトル]
    著者: [架空の著者名]
    推薦理由: [なぜこの本が今日の運気を上げるのか、100文字程度]
    特別なメッセージ: [蘭華からの優雅で神秘的なメッセージ、150文字程度]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    const titleMatch = responseText.match(/本のタイトル:\s*(.+?)(?=著者:|$)/s);
    const authorMatch = responseText.match(/著者:\s*(.+?)(?=推薦理由:|$)/s);
    const reasonMatch = responseText.match(/推薦理由:\s*(.+?)(?=特別なメッセージ:|$)/s);
    const messageMatch = responseText.match(/特別なメッセージ:\s*(.+?)$/s);

    return {
      fortune: inputData,
      recommendedBook: {
        title: titleMatch?.[1]?.trim() || '月光草紙',
        author: authorMatch?.[1]?.trim() || '朧月庵主人',
        reason: reasonMatch?.[1]?.trim() || 'この本には、運気を上げる古の知恵が込められておりますわ。',
        rankaMessage: messageMatch?.[1]?.trim() || 
          'この本を枕元に置いてお休みになれば、きっと良い夢が見られることでしょう。月の光があなた様を守りますように。',
      },
    };
  },
});

const dailyFortuneWorkflow = createWorkflow({
  id: 'daily-fortune-workflow',
  inputSchema: z.object({
    userName: z.string().optional(),
  }),
  outputSchema: bookRecommendationSchema,
})
  .then(analyzeFortune)
  .then(recommendLuckyBook);

dailyFortuneWorkflow.commit();

export { dailyFortuneWorkflow };