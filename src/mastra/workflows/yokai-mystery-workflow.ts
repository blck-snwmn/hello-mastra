import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const yokaiTypeSchema = z.object({
  yokaiType: z.string().describe('妖怪の種類'),
  yokaiName: z.string().describe('妖怪の名前'),
  characteristics: z.array(z.string()).describe('妖怪の特徴'),
  powers: z.array(z.string()).describe('妖怪の能力'),
});

const eraSchema = z.object({
  yokai: yokaiTypeSchema,
  era: z.string().describe('時代'),
  location: z.string().describe('舞台となる場所'),
  historicalContext: z.string().describe('歴史的背景'),
});

const protagonistSchema = z.object({
  yokai: yokaiTypeSchema,
  era: z.string(),
  location: z.string(),
  protagonist: z.object({
    name: z.string().describe('主人公の名前'),
    age: z.number().describe('年齢'),
    occupation: z.string().describe('職業'),
    personality: z.string().describe('性格'),
    motivation: z.string().describe('動機・目的'),
  }),
});

const conflictSchema = z.object({
  yokai: yokaiTypeSchema,
  era: z.string(),
  location: z.string(),
  protagonist: z.any(),
  encounter: z.string().describe('出会いの場面'),
  initialConflict: z.string().describe('最初の葛藤'),
  emotionalTension: z.string().describe('感情的な緊張'),
});

const climaxSchema = z.object({
  previousData: z.any(),
  climaxScene: z.string().describe('クライマックスシーン'),
  revelation: z.string().describe('明かされる真実'),
  criticalChoice: z.string().describe('重要な選択'),
});

const endingSchema = z.object({
  previousData: z.any(),
  climax: z.any(),
  resolution: z.string().describe('結末'),
  aftermath: z.string().describe('その後'),
  theme: z.string().describe('物語のテーマ'),
});

const boundBookSchema = z.object({
  story: z.object({
    yokai: yokaiTypeSchema,
    era: z.string(),
    protagonist: z.any(),
    plot: z.string().describe('完全なあらすじ'),
    ending: z.string(),
    theme: z.string(),
  }),
  book: z.object({
    title: z.string().describe('本のタイトル'),
    subtitle: z.string().describe('副題'),
    author: z.string().describe('架空の著者名'),
    binding: z.string().describe('装丁の描写'),
    rankaComment: z.string().describe('蘭華からのコメント'),
  }),
});

const selectYokaiType = createStep({
  id: 'select-yokai-type',
  description: '妖怪の種類を選定',
  inputSchema: z.object({
    preferredType: z.string().optional().describe('希望する妖怪タイプ'),
  }),
  outputSchema: yokaiTypeSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    const preferredType = inputData?.preferredType || 'ランダム';
    
    const prompt = `あなたは月読堂の朧月蘭華です。
    妖怪譚を創作するため、物語の中心となる妖怪を選んでください。
    ${preferredType !== 'ランダム' ? `希望: ${preferredType}` : ''}
    
    日本の伝統的な妖怪から選び、以下の形式で答えてください：
    
    妖怪の種類: [例：狐、猫又、雪女、天狗、鬼、etc.]
    妖怪の名前: [物語用の固有名詞]
    特徴: [3つの特徴を、で区切って]
    能力: [3つの能力を、で区切って]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    const typeMatch = responseText.match(/妖怪の種類:\s*(.+?)(?=妖怪の名前:|$)/s);
    const nameMatch = responseText.match(/妖怪の名前:\s*(.+?)(?=特徴:|$)/s);
    const characteristicsMatch = responseText.match(/特徴:\s*(.+?)(?=能力:|$)/s);
    const powersMatch = responseText.match(/能力:\s*(.+?)$/s);

    return {
      yokaiType: typeMatch?.[1]?.trim() || '狐',
      yokaiName: nameMatch?.[1]?.trim() || '銀月',
      characteristics: characteristicsMatch?.[1]?.trim().split('、').map(s => s.trim()) || 
        ['美しい人間の姿に化ける', '月光を浴びて力を得る', '千年の記憶を持つ'],
      powers: powersMatch?.[1]?.trim().split('、').map(s => s.trim()) || 
        ['幻術', '記憶操作', '時間を操る'],
    };
  },
});

const defineEra = createStep({
  id: 'define-era',
  description: '時代背景を設定',
  inputSchema: yokaiTypeSchema,
  outputSchema: eraSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    if (!inputData) {
      throw new Error('Yokai data is required');
    }

    const prompt = `あなたは月読堂の朧月蘭華です。
    ${inputData.yokaiName}という${inputData.yokaiType}の妖怪の物語の時代背景を設定してください。
    
    以下の形式で答えてください：
    
    時代: [平安、鎌倉、室町、江戸、明治など]
    場所: [具体的な地名と場所の描写]
    歴史的背景: [100文字程度でその時代の特徴と雰囲気]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    const eraMatch = responseText.match(/時代:\s*(.+?)(?=場所:|$)/s);
    const locationMatch = responseText.match(/場所:\s*(.+?)(?=歴史的背景:|$)/s);
    const contextMatch = responseText.match(/歴史的背景:\s*(.+?)$/s);

    return {
      yokai: inputData,
      era: eraMatch?.[1]?.trim() || '江戸時代後期',
      location: locationMatch?.[1]?.trim() || '京都の古い町並み',
      historicalContext: contextMatch?.[1]?.trim() || 
        '西洋文化が流入し始め、古き良き日本と新しい時代が交錯する時期。妖怪と人間の境界も曖昧になりつつあった。',
    };
  },
});

const createProtagonist = createStep({
  id: 'create-protagonist',
  description: '主人公の人間キャラクターを生成',
  inputSchema: eraSchema,
  outputSchema: protagonistSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    if (!inputData) {
      throw new Error('Era data is required');
    }

    const prompt = `あなたは月読堂の朧月蘭華です。
    ${inputData.era}の${inputData.location}を舞台に、
    ${inputData.yokai.yokaiName}（${inputData.yokai.yokaiType}）と出会う人間の主人公を創造してください。
    
    以下の形式で答えてください：
    
    名前: [時代に合った日本名]
    年齢: [数字のみ]
    職業: [時代に合った職業]
    性格: [100文字程度で性格描写]
    動機: [なぜ妖怪と関わることになるのか、100文字程度]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    const nameMatch = responseText.match(/名前:\s*(.+?)(?=年齢:|$)/s);
    const ageMatch = responseText.match(/年齢:\s*(\d+)/);
    const occupationMatch = responseText.match(/職業:\s*(.+?)(?=性格:|$)/s);
    const personalityMatch = responseText.match(/性格:\s*(.+?)(?=動機:|$)/s);
    const motivationMatch = responseText.match(/動機:\s*(.+?)$/s);

    return {
      yokai: inputData.yokai,
      era: inputData.era,
      location: inputData.location,
      protagonist: {
        name: nameMatch?.[1]?.trim() || '藤原清明',
        age: parseInt(ageMatch?.[1] || '25'),
        occupation: occupationMatch?.[1]?.trim() || '書物商',
        personality: personalityMatch?.[1]?.trim() || 
          '真面目で正義感が強いが、どこか影のある青年。書物を愛し、知識を追い求める。',
        motivation: motivationMatch?.[1]?.trim() || 
          '行方不明になった恋人を探すため、妖怪の世界に足を踏み入れることになる。',
      },
    };
  },
});

const developConflict = createStep({
  id: 'develop-conflict',
  description: '妖怪と人間の出会いと葛藤を構築',
  inputSchema: protagonistSchema,
  outputSchema: conflictSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    if (!inputData) {
      throw new Error('Protagonist data is required');
    }

    const prompt = `あなたは月読堂の朧月蘭華です。
    ${inputData.protagonist.name}（${inputData.protagonist.occupation}）と
    ${inputData.yokai.yokaiName}（${inputData.yokai.yokaiType}）の出会いと葛藤を描写してください。
    
    舞台: ${inputData.era}の${inputData.location}
    主人公の動機: ${inputData.protagonist.motivation}
    
    以下の形式で答えてください：
    
    出会いの場面: [150文字程度で劇的な出会いを描写]
    最初の葛藤: [100文字程度で両者の対立や緊張]
    感情的な緊張: [100文字程度で心理的な駆け引き]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    const encounterMatch = responseText.match(/出会いの場面:\s*(.+?)(?=最初の葛藤:|$)/s);
    const conflictMatch = responseText.match(/最初の葛藤:\s*(.+?)(?=感情的な緊張:|$)/s);
    const tensionMatch = responseText.match(/感情的な緊張:\s*(.+?)$/s);

    return {
      yokai: inputData.yokai,
      era: inputData.era,
      location: inputData.location,
      protagonist: inputData.protagonist,
      encounter: encounterMatch?.[1]?.trim() || 
        '月明かりの夜、主人公は偶然妖怪と出会う。それは運命の出会いだった。',
      initialConflict: conflictMatch?.[1]?.trim() || 
        '人間と妖怪という立場の違いが、二人の間に深い溝を作る。',
      emotionalTension: tensionMatch?.[1]?.trim() || 
        '互いに惹かれ合いながらも、決して交わることのできない運命を感じていた。',
    };
  },
});

const weaveClimax = createStep({
  id: 'weave-climax',
  description: '物語のクライマックスを紡ぐ',
  inputSchema: conflictSchema,
  outputSchema: climaxSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    if (!inputData) {
      throw new Error('Conflict data is required');
    }

    const prompt = `あなたは月読堂の朧月蘭華です。
    ${inputData.protagonist.name}と${inputData.yokai.yokaiName}の物語のクライマックスを創造してください。
    
    これまでの流れ:
    - 出会い: ${inputData.encounter}
    - 葛藤: ${inputData.initialConflict}
    - 緊張: ${inputData.emotionalTension}
    
    以下の形式で答えてください：
    
    クライマックスシーン: [200文字程度で最も劇的な場面]
    明かされる真実: [150文字程度で重要な秘密や真実]
    重要な選択: [100文字程度で主人公が迫られる究極の選択]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    const climaxMatch = responseText.match(/クライマックスシーン:\s*(.+?)(?=明かされる真実:|$)/s);
    const revelationMatch = responseText.match(/明かされる真実:\s*(.+?)(?=重要な選択:|$)/s);
    const choiceMatch = responseText.match(/重要な選択:\s*(.+?)$/s);

    return {
      previousData: inputData,
      climaxScene: climaxMatch?.[1]?.trim() || 
        '満月の夜、ついに運命の時が訪れる。すべてが明らかになる瞬間だった。',
      revelation: revelationMatch?.[1]?.trim() || 
        '実は妖怪には深い事情があった。それは人間への深い愛情から生まれた悲しみだった。',
      criticalChoice: choiceMatch?.[1]?.trim() || 
        '主人公は選ばなければならない。妖怪と共に生きるか、人間の世界に留まるか。',
    };
  },
});

const resolveEnding = createStep({
  id: 'resolve-ending',
  description: '結末を決定',
  inputSchema: climaxSchema,
  outputSchema: endingSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    if (!inputData) {
      throw new Error('Climax data is required');
    }

    const prompt = `あなたは月読堂の朧月蘭華です。
    物語の結末を決めてください。
    
    クライマックス: ${inputData.climaxScene}
    明かされた真実: ${inputData.revelation}
    重要な選択: ${inputData.criticalChoice}
    
    以下の形式で答えてください：
    
    結末: [200文字程度で物語の結末]
    その後: [150文字程度で登場人物たちのその後]
    テーマ: [50文字程度で物語が伝えたいメッセージ]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    const resolutionMatch = responseText.match(/結末:\s*(.+?)(?=その後:|$)/s);
    const aftermathMatch = responseText.match(/その後:\s*(.+?)(?=テーマ:|$)/s);
    const themeMatch = responseText.match(/テーマ:\s*(.+?)$/s);

    return {
      previousData: inputData.previousData,
      climax: inputData,
      resolution: resolutionMatch?.[1]?.trim() || 
        '主人公は苦渋の決断を下す。それは愛と別離の物語だった。',
      aftermath: aftermathMatch?.[1]?.trim() || 
        '年月が流れ、二人の物語は伝説となった。今も月夜には、その面影が見えるという。',
      theme: themeMatch?.[1]?.trim() || 
        '愛は時空を超えて永遠に続く。',
    };
  },
});

const bindAsBook = createStep({
  id: 'bind-as-book',
  description: '完成した物語を本として装丁',
  inputSchema: endingSchema,
  outputSchema: boundBookSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('rankaAgent');
    if (!agent) {
      throw new Error('Ranka agent not found');
    }

    if (!inputData) {
      throw new Error('Ending data is required');
    }

    const storyData = inputData.previousData;
    
    const prompt = `あなたは月読堂の朧月蘭華です。
    完成した妖怪譚に、ふさわしいタイトルと装丁を決めてください。
    
    物語の概要:
    - 妖怪: ${storyData.yokai.yokaiName}（${storyData.yokai.yokaiType}）
    - 時代: ${storyData.era}
    - テーマ: ${inputData.theme}
    
    以下の形式で答えてください：
    
    本のタイトル: [古風で美しいタイトル]
    副題: [タイトルを補完する副題]
    著者名: [架空の著者名、古風な名前]
    装丁: [150文字程度で本の外観を描写]
    蘭華のコメント: [200文字程度で、この物語への思いを優雅に]`;

    const response = await agent.generate([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = response.text || '';
    
    const titleMatch = responseText.match(/本のタイトル:\s*(.+?)(?=副題:|$)/s);
    const subtitleMatch = responseText.match(/副題:\s*(.+?)(?=著者名:|$)/s);
    const authorMatch = responseText.match(/著者名:\s*(.+?)(?=装丁:|$)/s);
    const bindingMatch = responseText.match(/装丁:\s*(.+?)(?=蘭華のコメント:|$)/s);
    const commentMatch = responseText.match(/蘭華のコメント:\s*(.+?)$/s);

    const fullPlot = `${storyData.era}の${storyData.location}。${storyData.protagonist.name}は${storyData.encounter} ${storyData.initialConflict} ${inputData.climax.climaxScene} ${inputData.resolution}`;

    return {
      story: {
        yokai: storyData.yokai,
        era: storyData.era,
        protagonist: storyData.protagonist,
        plot: fullPlot,
        ending: inputData.resolution,
        theme: inputData.theme,
      },
      book: {
        title: titleMatch?.[1]?.trim() || '月下の契り',
        subtitle: subtitleMatch?.[1]?.trim() || '～人と妖の千年恋歌～',
        author: authorMatch?.[1]?.trim() || '月詠堂散人',
        binding: bindingMatch?.[1]?.trim() || 
          '深い藍色の布装に銀糸で月と狐の紋様を刺繍。表紙を開くと、淡い金箔で妖怪の姿が浮かび上がる。ページは和紙を使い、墨の香りがほのかに漂う。',
        rankaComment: commentMatch?.[1]?.trim() || 
          'この物語は、人と妖怪の間に生まれる愛の美しさと哀しさを描いております。月読堂に永く伝わる物語の一つとして、大切に保管させていただきますわ。きっとあなた様の心にも、深く響くことでしょう。',
      },
    };
  },
});

const yokaiMysteryWorkflow = createWorkflow({
  id: 'yokai-mystery-workflow',
  inputSchema: z.object({
    preferredType: z.string().optional(),
  }),
  outputSchema: boundBookSchema,
})
  .then(selectYokaiType)
  .then(defineEra)
  .then(createProtagonist)
  .then(developConflict)
  .then(weaveClimax)
  .then(resolveEnding)
  .then(bindAsBook);

yokaiMysteryWorkflow.commit();

export { yokaiMysteryWorkflow };