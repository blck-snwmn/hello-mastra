import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// スキーマ定義
const preferencesSchema = z.object({
  preferences: z.string().describe('収集したユーザーの好み'),
  responses: z.array(z.string()).describe('これまでの回答履歴'),
  currentMessage: z.string().optional().describe('現在のRankaからのメッセージ'),
});

const storiesSchema = z.object({
  stories: z.array(
    z.object({
      id: z.number(),
      summary: z.string().describe('物語の概要'),
      genre: z.string().describe('ジャンル'),
      theme: z.string().describe('テーマ'),
    })
  ).describe('生成された物語のリスト'),
});

const recommendationsSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string().describe('本のタイトル'),
      author: z.string().describe('著者名'),
      summary: z.string().describe('あらすじ'),
      rankaComment: z.string().describe('蘭華からのコメント'),
    })
  ).describe('推薦する本のリスト'),
  finalMessage: z.string().describe('蘭華からの最終メッセージ'),
});

// Step 1: ユーザーの好みを収集
const collectPreferences = createStep({
  id: 'collect-preferences',
  description: 'ユーザーの好みを対話的に収集',
  inputSchema: z.object({
    previousResponses: z.array(z.string()).optional().describe('これまでの回答'),
  }),
  outputSchema: preferencesSchema,
  suspendSchema: z.object({
    rankaMessage: z.string().describe('蘭華からの質問メッセージ'),
    attemptCount: z.number().describe('質問回数'),
    responses: z.array(z.string()).describe('これまでの回答履歴'),
  }),
  resumeSchema: z.object({
    userResponse: z.string().describe('ユーザーからの回答'),
  }),
  execute: async ({ inputData, resumeData, suspend, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    const previousResponses = inputData?.previousResponses || [];
    
    // 初回またはresumeDataがない場合
    if (!resumeData) {
      const prompt = previousResponses.length === 0
        ? `あなたは月読堂の店主、朧月蘭華です。
           お客様が本を探しに来ました。
           優雅で丁寧な口調で、どのような物語がお好みか尋ねてください。
           具体的な好みを引き出すような質問をしてください。`
        : `これまでのお客様の回答: ${previousResponses.join(', ')}
           
           追加で聞きたいことがあれば、優雅に質問してください。
           十分な情報があれば、「承知いたしました」と伝えてください。`;

      const response = await agent.generate([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      const rankaMessage = response.text;
      if (!rankaMessage) {
        throw new Error('Failed to generate Ranka message');
      }
      
      // suspendDataとして蘭華のメッセージを含める
      await suspend({
        rankaMessage: rankaMessage,
        attemptCount: previousResponses.length + 1,
        responses: previousResponses,
      });

      return { 
        preferences: '', 
        responses: previousResponses,
        currentMessage: rankaMessage,
      };
    }

    // ユーザーの回答を受け取った場合
    const allResponses = [...previousResponses, resumeData.userResponse];
    
    // 十分な情報が集まったか判定（3回まで質問）
    if (allResponses.length >= 3) {
      return {
        preferences: allResponses.join(' '),
        responses: allResponses,
        currentMessage: '承知いたしました。素敵な物語をご用意いたしますわ。',
      };
    }

    // さらに質問が必要な場合
    const prompt = `あなたは月読堂の朧月蘭華です。
                    お客様との対話が続いています。
                    
                    前回のお客様の回答: 「${resumeData.userResponse}」
                    これまでの回答: ${allResponses.join(', ')}
                    
                    お客様の答えに対して軽く反応した後、
                    もう少し詳しくお聞きしたいことがあれば、優雅に追加の質問をしてください。
                    十分であれば「承知いたしました」と言ってください。
                    挨拶は不要です。`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    // 「承知」が含まれていたら終了
    if (responseText.includes('承知')) {
      return {
        preferences: allResponses.join(' '),
        responses: allResponses,
        currentMessage: responseText,
      };
    }

    // まだ質問が必要
    await suspend({
      rankaMessage: responseText,
      attemptCount: allResponses.length + 1,
      responses: allResponses,
    });

    return {
      preferences: '',
      responses: allResponses,
      currentMessage: responseText,
    };
  },
});

// Step 2: 物語を生成
const generateStories = createStep({
  id: 'generate-stories',
  description: '好みに基づいて架空の物語を生成',
  inputSchema: preferencesSchema,
  outputSchema: storiesSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    const prompt = `お客様の好み: ${inputData?.preferences}
    
    朧月蘭華として、月読堂にありそうな架空の物語を3つ創作してください。
    それぞれ異なるジャンルやテーマで、200-300文字程度の概要を作成してください。
    古風で趣のある物語にしてください。
    
    以下の形式で回答してください：
    
    物語1:
    ジャンル: [ジャンル名]
    テーマ: [テーマ]
    概要: [200-300文字の物語概要]
    
    物語2:
    ジャンル: [ジャンル名]
    テーマ: [テーマ]
    概要: [200-300文字の物語概要]
    
    物語3:
    ジャンル: [ジャンル名]
    テーマ: [テーマ]
    概要: [200-300文字の物語概要]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    const stories = [];
    
    // 正規表現で物語を抽出
    const storyRegex = /物語(\d):\s*ジャンル:\s*(.+?)\s*テーマ:\s*(.+?)\s*概要:\s*(.+?)(?=物語\d:|$)/gs;
    let match;
    
    while ((match = storyRegex.exec(responseText)) !== null) {
      stories.push({
        id: parseInt(match[1]),
        genre: match[2].trim(),
        theme: match[3].trim(),
        summary: match[4].trim(),
      });
    }

    // フォールバック
    if (stories.length === 0) {
      stories.push(
        {
          id: 1,
          genre: '幻想',
          theme: '時を超える想い',
          summary: '百年前の京都。記憶を失った狐の妖怪が、人間の姿で生きることを選んだ。彼女は古書店を営みながら、失った記憶の断片を本の中に見つけていく。',
        },
        {
          id: 2,
          genre: '恋愛',
          theme: '禁じられた恋',
          summary: '明治時代の東京。西洋文化に憧れる書生と、代々続く古書店の娘が出会う。しかし、娘には秘密があった。',
        },
        {
          id: 3,
          genre: '冒険',
          theme: '知恵と勇気',
          summary: '江戸時代末期。ある古書店に、不思議な地図が持ち込まれる。それは、失われた妖怪の都への道を示すものだった。',
        }
      );
    }

    return { stories };
  },
});

// Step 3: タイトルと推薦コメントを作成
const createRecommendations = createStep({
  id: 'create-recommendations',
  description: '物語にタイトルをつけて推薦',
  inputSchema: storiesSchema,
  outputSchema: recommendationsSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    const stories = inputData?.stories || [];
    const storiesText = stories
      .map((s) => `物語${s.id}:\nジャンル: ${s.genre}\nテーマ: ${s.theme}\n概要: ${s.summary}`)
      .join('\n\n');

    const prompt = `以下の3つの物語に、古風で趣のあるタイトルと架空の著者名をつけてください。
    また、朧月蘭華として、それぞれの本についてコメントを添えてください。
    
    ${storiesText}
    
    以下の形式で回答してください：
    
    推薦1:
    タイトル: [本のタイトル]
    著者: [架空の著者名]
    蘭華のコメント: [この本についてのコメント、優雅な口調で]
    
    推薦2:
    タイトル: [本のタイトル]
    著者: [架空の著者名]
    蘭華のコメント: [この本についてのコメント、優雅な口調で]
    
    推薦3:
    タイトル: [本のタイトル]
    著者: [架空の著者名]
    蘭華のコメント: [この本についてのコメント、優雅な口調で]
    
    最後に、お客様への締めの言葉も添えてください。`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    const recommendations = [];
    
    // 推薦を抽出
    const recRegex = /推薦(\d):\s*タイトル:\s*(.+?)\s*著者:\s*(.+?)\s*蘭華のコメント:\s*(.+?)(?=推薦\d:|最後に|$)/gs;
    let match;
    let index = 0;

    while ((match = recRegex.exec(responseText)) !== null && index < 3) {
      const storyIndex = parseInt(match[1]) - 1;
      recommendations.push({
        title: match[2].trim(),
        author: match[3].trim(),
        summary: stories[storyIndex]?.summary || '',
        rankaComment: match[4].trim(),
      });
      index++;
    }

    // 最終メッセージを抽出
    const finalMessageMatch = responseText.match(/最後に[：:、]?\s*(.+)$/s);
    const finalMessage = finalMessageMatch 
      ? finalMessageMatch[1].trim() 
      : 'いかがでしょうか。きっとあなた様の心に響く物語が見つかることでしょう。';

    // フォールバック
    if (recommendations.length === 0) {
      stories.forEach((story, i) => {
        recommendations.push({
          title: `物語之書 第${i + 1}巻`,
          author: '月読堂蔵書',
          summary: story.summary,
          rankaComment: 'こちらの本は、きっとあなた様の心に響くことでしょう。',
        });
      });
    }

    return { 
      recommendations,
      finalMessage,
    };
  },
});

// ワークフローの定義
const bookRecommendationWorkflow = createWorkflow({
  id: 'book-recommendation-workflow',
  inputSchema: z.object({
    previousResponses: z.array(z.string()).optional(),
  }),
  outputSchema: recommendationsSchema,
})
  .then(collectPreferences)
  .then(generateStories)
  .then(createRecommendations);

bookRecommendationWorkflow.commit();

export { bookRecommendationWorkflow };