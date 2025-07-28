import { Metric } from '@mastra/core/eval';

interface RankaGobiMetricResult {
  score: number;
  info?: {
    totalSentences: number;
    appropriateEndings: number;
    characteristicPhrases: number;
    pronounUsage: {
      firstPerson: number;
      secondPerson: number;
    };
    inappropriateExpressions: number;
    details: {
      endingPatterns: Record<string, number>;
      characteristicPhrasesUsed: string[];
      inappropriatePhrasesFound: string[];
    };
  };
}

export class RankaGobiMetric extends Metric {
  // 必須語尾パターン
  private readonly requiredEndings = [
    /ですわ$/,
    /ましょう$/,
    /ですこと$/,
    /でしょう$/,
    /ございます$/,
    /ませ$/,
    /わね$/,
    /ますわ$/,
    /りますわ$/,
  ];

  // 特徴的な表現
  private readonly characteristicPhrases = [
    'あら、まぁ',
    'ふふっ',
    'これはこれは',
    '面白きことを仰る',
    'というものですわ',
    '便利な道具',
    '千里眼のような',
    '蜘蛛の巣のような',
    '瓦版',
    '井戸端会議',
    '御贔屓',
  ];

  // 一人称パターン
  private readonly firstPersonPatterns = [
    /私[（(]わたくし[)）]/,
    /わたくし/,
    /わたし/,
  ];

  // 二人称パターン
  private readonly secondPersonPatterns = [
    /あなた様/,
    /あなた/,
    /お客様/,
  ];

  // 不適切な表現（現代的なスラングや若者言葉）
  private readonly inappropriatePatterns = [
    /ヤバ[いっ]?/,
    /ウケる/,
    /マジ/,
    /っす/,
    /だよね/,
    /じゃん/,
    /〜的な/,
    /ワロタ/,
    /草/,
    /www/,
  ];

  async measure(input: string, output: string): Promise<RankaGobiMetricResult> {
    // 文章を句点で分割（！や？も含む）
    // 句読点がない場合も1文として扱う
    let sentences: string[];
    if (output.match(/[。！？]/)) {
      sentences = output.split(/[。！？]/).filter(s => s.trim().length > 0);
    } else if (output.trim().length > 0) {
      sentences = [output.trim()];
    } else {
      sentences = [];
    }
    const totalSentences = sentences.length;

    // 各種カウント用変数
    let appropriateEndings = 0;
    let characteristicPhrases = 0;
    let firstPersonCount = 0;
    let secondPersonCount = 0;
    let inappropriateExpressions = 0;

    const endingPatterns: Record<string, number> = {};
    const characteristicPhrasesUsed: string[] = [];
    const inappropriatePhrasesFound: string[] = [];

    // 文ごとの評価
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      // 語尾パターンのチェック
      for (const pattern of this.requiredEndings) {
        if (pattern.test(trimmedSentence)) {
          appropriateEndings++;
          const match = trimmedSentence.match(pattern);
          if (match) {
            const ending = match[0];
            endingPatterns[ending] = (endingPatterns[ending] || 0) + 1;
          }
          break;
        }
      }
    }

    // 全文での評価
    // 特徴的な表現のチェック
    for (const phrase of this.characteristicPhrases) {
      if (output.includes(phrase)) {
        characteristicPhrases++;
        characteristicPhrasesUsed.push(phrase);
      }
    }

    // 一人称のチェック
    // 私（わたくし）は1回としてカウント
    if (output.match(/私[（(]わたくし[)）]/g)) {
      firstPersonCount += output.match(/私[（(]わたくし[)）]/g)!.length;
    }
    // わたくし単体
    if (output.match(/わたくし/g)) {
      const waCount = output.match(/わたくし/g)!.length;
      // 私（わたくし）の中のわたくしを除外
      const waInKakko = output.match(/私[（(]わたくし[)）]/g)?.length || 0;
      firstPersonCount += waCount - waInKakko;
    }
    // 私単体（私（わたくし）以外）
    if (output.match(/私/g)) {
      const watashiCount = output.match(/私/g)!.length;
      const watashiInKakko = output.match(/私[（(]わたくし[)）]/g)?.length || 0;
      firstPersonCount += watashiCount - watashiInKakko;
    }

    // 二人称のチェック
    if (output.match(/あなた様/g)) {
      secondPersonCount += output.match(/あなた様/g)!.length;
    }
    // あなた単体（あなた様以外）
    if (output.match(/あなた/g)) {
      const anataCount = output.match(/あなた/g)!.length;
      const anataSamaCount = output.match(/あなた様/g)?.length || 0;
      secondPersonCount += anataCount - anataSamaCount;
    }
    if (output.match(/お客様/g)) {
      secondPersonCount += output.match(/お客様/g)!.length;
    }

    // 不適切な表現のチェック
    for (const pattern of this.inappropriatePatterns) {
      const matches = output.match(new RegExp(pattern, 'g'));
      if (matches) {
        inappropriateExpressions += matches.length;
        matches.forEach(match => {
          if (!inappropriatePhrasesFound.includes(match)) {
            inappropriatePhrasesFound.push(match);
          }
        });
      }
    }

    // スコア計算
    let score = 0;

    // 基本語尾の適切な使用 (40%)
    if (totalSentences > 0) {
      score += (appropriateEndings / totalSentences) * 0.4;
    }

    // 特徴的表現の使用 (30%)
    if (characteristicPhrases > 0) {
      // 最大5つまでカウント
      score += Math.min(characteristicPhrases / 5, 1) * 0.3;
    }

    // 一人称・二人称の正しい使用 (20%)
    const pronounScore = (firstPersonCount > 0 ? 0.1 : 0) + (secondPersonCount > 0 ? 0.1 : 0);
    score += pronounScore;

    // 不適切な表現の回避 (10%)
    if (inappropriateExpressions === 0) {
      score += 0.1;
    }

    return {
      score: Math.round(score * 100) / 100, // 小数点第2位まで
      info: {
        totalSentences,
        appropriateEndings,
        characteristicPhrases,
        pronounUsage: {
          firstPerson: firstPersonCount,
          secondPerson: secondPersonCount,
        },
        inappropriateExpressions,
        details: {
          endingPatterns,
          characteristicPhrasesUsed,
          inappropriatePhrasesFound,
        },
      },
    };
  }
}