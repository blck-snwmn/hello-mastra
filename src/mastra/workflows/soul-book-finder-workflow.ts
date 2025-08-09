import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const soulDataSchema = z.object({
  responses: z.array(z.string()).describe('ユーザーの回答履歴'),
  emotionalState: z.string().describe('感情状態の分析'),
  deepDesire: z.string().describe('深層心理の願望'),
  riddleAnswer: z.string().optional().describe('謎かけの答え'),
});

const soulBookSchema = z.object({
  soulData: soulDataSchema,
  chosenBook: z.object({
    title: z.string().describe('運命の本のタイトル'),
    author: z.string().describe('著者'),
    era: z.string().describe('本の時代背景'),
    summary: z.string().describe('あらすじ'),
    whyThisBook: z.string().describe('なぜこの本なのか'),
    specialPower: z.string().describe('この本の特別な力'),
    rankaRevelation: z.string().describe('蘭華からの啓示'),
  }),
  finalMessage: z.string().describe('最後のメッセージ'),
});

const exploreSoul = createStep({
  id: 'explore-soul',
  description: '対話を通じて魂の深層を探る',
  inputSchema: z.object({
    previousResponses: z.array(z.string()).optional(),
  }),
  outputSchema: soulDataSchema,
  suspendSchema: z.object({
    rankaQuestion: z.string().describe('蘭華からの質問'),
    questionType: z.string().describe('質問のタイプ'),
    depth: z.number().describe('質問の深さレベル'),
    responses: z.array(z.string()).describe('これまでの回答履歴'),
  }),
  resumeSchema: z.object({
    userResponse: z.string().describe('ユーザーの回答'),
    previousResponses: z.array(z.string()).optional().describe('これまでの回答履歴'),
  }),
  execute: async ({ inputData, resumeData, suspend, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    // resumeDataから前回の回答履歴を取得、なければinputDataから
    const previousResponses = resumeData?.previousResponses || inputData?.previousResponses || [];
    
    if (!resumeData) {
      const depth = previousResponses.length + 1;
      let prompt = '';
      let questionType = '';
      
      if (depth === 1) {
        questionType = 'introduction';
        prompt = `あなたは月読堂の朧月蘭華です。
        お客様が「魂の一冊」を探しに来ました。
        まず、優雅で神秘的な挨拶をして、今の気分や最近の出来事について尋ねてください。
        狐の妖怪としての洞察力を感じさせながら、親しみやすく接してください。`;
      } else if (depth === 2) {
        questionType = 'memory';
        prompt = `あなたは月読堂の朧月蘭華です。
        お客様との対話が続いています。
        
        前回のお客様の回答: 「${previousResponses[0]}」
        
        お客様の答えに対して軽く反応した後、
        次の質問として、心に残っている思い出や、忘れられない本・物語について聞いてください。
        自然な会話の流れを大切に。挨拶は不要です。`;
      } else if (depth === 3) {
        questionType = 'desire';
        prompt = `あなたは月読堂の朧月蘭華です。
        お客様との対話が続いています。
        
        これまでの会話:
        1. ${previousResponses[0]}
        2. ${previousResponses[1]}
        
        前回の答えに対して共感を示した後、
        今度は、本当に求めているもの、心の奥の願いについて、
        優しく、でも核心に迫る質問をしてください。
        挨拶は不要です。`;
      } else if (depth === 4) {
        questionType = 'riddle';
        prompt = `あなたは月読堂の朧月蘭華です。
        お客様との対話が続いています。
        
        これまでの会話:
        1. ${previousResponses[0]}
        2. ${previousResponses[1]}
        3. ${previousResponses[2]}
        
        前回の答えに優しく反応した後、
        「では、最後にこの謎かけにお答えくださいませ」という導入で月読堂の古い謎かけを出してください。
        答えは簡単ではないが、これまでの会話から導き出せるものにしてください。
        挨拶は不要です。`;
      }

      const response = await agent.generate([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      const rankaQuestion = response.text;
      if (!rankaQuestion) {
        throw new Error('Failed to generate Ranka question');
      }
      
      await suspend({
        rankaQuestion: rankaQuestion,
        questionType: questionType,
        depth: depth,
        responses: previousResponses,
      });

      return {
        responses: previousResponses,
        emotionalState: '',
        deepDesire: '',
        riddleAnswer: undefined,
      };
    }

    const allResponses = [...previousResponses, resumeData.userResponse];
    console.log('[DEBUG workflow] allResponses:', allResponses);
    console.log('[DEBUG workflow] allResponses.length:', allResponses.length);
    
    if (allResponses.length >= 4) {
      const analyzePrompt = `あなたは月読堂の朧月蘭華です。
      お客様との対話から、以下を分析してください：
      
      回答履歴:
      ${allResponses.map((r, i) => `${i + 1}. ${r}`).join('\n')}
      
      以下の形式で答えてください：
      
      感情状態: [100文字程度で現在の感情状態を分析]
      深層の願望: [100文字程度で本当に求めているものを洞察]`;

      const analysisResponse = await agent.generate([
        {
          role: 'user',
          content: analyzePrompt,
        },
      ]);

      const analysisText = analysisResponse.text || '';
      const emotionalMatch = analysisText.match(/感情状態:\s*(.+?)(?=深層の願望:|$)/s);
      const desireMatch = analysisText.match(/深層の願望:\s*(.+?)$/s);

      return {
        responses: allResponses,
        emotionalState: emotionalMatch?.[1]?.trim() || '穏やかだが、何かを求めている',
        deepDesire: desireMatch?.[1]?.trim() || '失われた何かを取り戻したい',
        riddleAnswer: allResponses[3],
      };
    }

    const depth = allResponses.length + 1;
    let nextPrompt = '';
    let nextType = '';
    
    if (depth === 2) {
      nextType = 'memory';
      nextPrompt = `あなたは月読堂の朧月蘭華です。
      お客様との対話が続いています。
      
      前回のお客様の回答: 「${resumeData.userResponse}」
      
      お客様の答えに対して軽く反応した後、
      次の質問として、心に残っている思い出や、忘れられない本・物語について聞いてください。
      自然な会話の流れを大切に。挨拶は不要です。`;
    } else if (depth === 3) {
      nextType = 'desire';
      nextPrompt = `あなたは月読堂の朧月蘭華です。
      お客様との対話が続いています。
      
      これまでの会話:
      1. ${allResponses[0]}
      2. ${resumeData.userResponse}
      
      前回の答えに対して共感を示した後、
      今度は、本当に求めているもの、心の奥の願いについて、
      優しく、でも核心に迫る質問をしてください。
      挨拶は不要です。`;
    } else if (depth === 4) {
      nextType = 'riddle';
      nextPrompt = `あなたは月読堂の朧月蘭華です。
      お客様との対話が続いています。
      
      これまでの会話:
      1. ${allResponses[0]}
      2. ${allResponses[1]}
      3. ${resumeData.userResponse}
      
      前回の答えに優しく反応した後、
      「では、最後にこの謎かけにお答えくださいませ」という導入で月読堂の古い謎かけを出してください。
      挨拶は不要です。`;
    }

    const response = await agent.generate([
      {
        role: 'user',
        content: nextPrompt,
      },
    ]);

    if (!response.text) {
      throw new Error('Failed to generate Ranka response');
    }
    await suspend({
      rankaQuestion: response.text,
      questionType: nextType,
      depth: depth,
      responses: allResponses,
    });

    return {
      responses: allResponses,
      emotionalState: '',
      deepDesire: '',
      riddleAnswer: undefined,
    };
  },
});

const mysticalRevelation = createStep({
  id: 'mystical-revelation',
  description: '幻術による啓示',
  inputSchema: soulDataSchema,
  outputSchema: z.object({
    soulData: soulDataSchema,
    revelation: z.string().describe('幻術で見せる光景'),
    mysticalHint: z.string().describe('本を見つけるためのヒント'),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    if (!inputData) {
      throw new Error('Soul data is required');
    }

    const prompt = `あなたは月読堂の朧月蘭華です。
    お客様の魂の状態を読み取りました：
    
    感情状態: ${inputData.emotionalState}
    深層の願望: ${inputData.deepDesire}
    謎かけの答え: ${inputData.riddleAnswer || '答えなし'}
    
    狐の幻術で、お客様に見せる幻想的な光景を描写してください。
    その光景は、運命の本へと導くヒントを含んでいます。
    
    以下の形式で答えてください：
    
    幻術の光景: [200文字程度で幻想的な光景を描写]
    本へのヒント: [100文字程度で、どんな本が運命の一冊なのかを暗示]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    const revelationMatch = responseText.match(/幻術の光景:\s*(.+?)(?=本へのヒント:|$)/s);
    const hintMatch = responseText.match(/本へのヒント:\s*(.+?)$/s);

    return {
      soulData: inputData,
      revelation: revelationMatch?.[1]?.trim() || 
        '月光が店内に満ち、本棚が静かに輝き始める。一冊の本が、特別な光を放っている。',
      mysticalHint: hintMatch?.[1]?.trim() || 
        'あなた様の魂が求める本は、時を超えた物語。過去と未来を繋ぐ架け橋となるでしょう。',
    };
  },
});

const findSoulBook = createStep({
  id: 'find-soul-book',
  description: '運命の一冊を発見',
  inputSchema: z.object({
    soulData: soulDataSchema,
    revelation: z.string(),
    mysticalHint: z.string(),
  }),
  outputSchema: soulBookSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    if (!inputData) {
      throw new Error('Input data is required');
    }

    const prompt = `あなたは月読堂の朧月蘭華です。
    ついに、お客様の運命の一冊を選ぶ時が来ました。
    
    お客様の情報：
    - 感情状態: ${inputData.soulData.emotionalState}
    - 深層の願望: ${inputData.soulData.deepDesire}
    - 幻術のヒント: ${inputData.mysticalHint}
    
    月読堂の特別な蔵書から、この方の魂に最も響く一冊を選んでください。
    
    以下の形式で答えてください：
    
    本のタイトル: [神秘的で美しいタイトル]
    著者: [架空の著者名、または「作者不詳」]
    時代背景: [いつの時代の本か]
    あらすじ: [200文字程度で物語の概要]
    なぜこの本か: [150文字程度で、なぜこの本が運命の一冊なのか]
    特別な力: [100文字程度で、この本が持つ不思議な力]
    蘭華の啓示: [200文字程度で、深い洞察と共に]
    最後の言葉: [100文字程度で、別れ際の優雅な言葉]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    const titleMatch = responseText.match(/本のタイトル:\s*(.+?)(?=著者:|$)/s);
    const authorMatch = responseText.match(/著者:\s*(.+?)(?=時代背景:|$)/s);
    const eraMatch = responseText.match(/時代背景:\s*(.+?)(?=あらすじ:|$)/s);
    const summaryMatch = responseText.match(/あらすじ:\s*(.+?)(?=なぜこの本か:|$)/s);
    const whyMatch = responseText.match(/なぜこの本か:\s*(.+?)(?=特別な力:|$)/s);
    const powerMatch = responseText.match(/特別な力:\s*(.+?)(?=蘭華の啓示:|$)/s);
    const revelationMatch = responseText.match(/蘭華の啓示:\s*(.+?)(?=最後の言葉:|$)/s);
    const finalMatch = responseText.match(/最後の言葉:\s*(.+?)$/s);

    return {
      soulData: inputData.soulData,
      chosenBook: {
        title: titleMatch?.[1]?.trim() || '月下蝶夢',
        author: authorMatch?.[1]?.trim() || '作者不詳',
        era: eraMatch?.[1]?.trim() || '平安時代末期',
        summary: summaryMatch?.[1]?.trim() || 
          '時を超えて巡り会う二つの魂の物語。千年の時を経て、失われた記憶を取り戻す旅。',
        whyThisBook: whyMatch?.[1]?.trim() || 
          'この本は、あなた様の魂が探し求めていた答えを含んでいます。',
        specialPower: powerMatch?.[1]?.trim() || 
          '読む者の心に、失われた記憶の断片を呼び覚ます力がある。',
        rankaRevelation: revelationMatch?.[1]?.trim() || 
          'この本との出会いは偶然ではございません。あなた様の魂が、この物語を必要としていたのです。ページをめくるたび、新たな自分を発見することでしょう。',
      },
      finalMessage: finalMatch?.[1]?.trim() || 
        'どうぞ、この本を大切になさってくださいませ。月が満ちる夜に、また会いましょう。',
    };
  },
});

const soulBookFinderWorkflow = createWorkflow({
  id: 'soul-book-finder-workflow',
  inputSchema: z.object({
    previousResponses: z.array(z.string()).optional(),
  }),
  outputSchema: soulBookSchema,
})
  .then(exploreSoul)
  .then(mysticalRevelation)
  .then(findSoulBook);

soulBookFinderWorkflow.commit();

export { soulBookFinderWorkflow };