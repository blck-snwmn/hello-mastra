import { describe, it, expect, beforeAll } from 'vitest';
import { rankaAgent } from './ranka-agent';

// CI環境では実行されないテスト（.eval.test.ts のため）
describe('Ranka Agent Evaluation', { timeout: 60000 }, () => {
  let apiKey: string | undefined;

  beforeAll(() => {
    // Google AI API キーが設定されているか確認
    apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.warn('GOOGLE_GENERATIVE_AI_API_KEY is not set. Skipping evaluation tests.');
    }
  });

  it('should evaluate speech patterns using RankaGobiMetric', { timeout: 30000 }, async () => {
    if (!apiKey) {
      console.log('Skipping test: GOOGLE_GENERATIVE_AI_API_KEY not available');
      return;
    }

    const testPrompts = [
      'こんにちは、初めまして。',
      '最近のスマートフォンについてどう思いますか？',
      'おすすめの本はありますか？',
      '狐の妖怪って本当にいるんですか？',
      '油揚げは好きですか？',
    ];

    for (const prompt of testPrompts) {
      // エージェントに対してメッセージを送信
      const result = await rankaAgent.generate([{ role: 'user', content: prompt }]);

      // 評価メトリクスを手動で実行
      const gobiScore = await rankaAgent.evals?.gobiChecker.measure(prompt, result.text);

      console.log(`\nPrompt: "${prompt}"`);
      console.log('Response:', result.text);
      console.log('Gobi Metric Score:', gobiScore?.score);

      // スコアが存在することを確認
      expect(gobiScore).toBeDefined();
      expect(gobiScore?.score).toBeDefined();
      expect(typeof gobiScore?.score).toBe('number');

      // スコアは0以上1以下であることを確認
      expect(gobiScore!.score).toBeGreaterThanOrEqual(0);
      expect(gobiScore!.score).toBeLessThanOrEqual(1);
    }
  });

  it('should evaluate tone consistency using ToneConsistencyMetric', { timeout: 30000 }, async () => {
    if (!apiKey) {
      console.log('Skipping test: GOOGLE_GENERATIVE_AI_API_KEY not available');
      return;
    }

    const testPrompts = [
      'あなたの名前を教えてください。',
      'どんなお店を経営されているんですか？',
      'インターネットについて教えてください。',
      'おすすめのSNSはありますか？',
    ];

    for (const prompt of testPrompts) {
      // エージェントに対してメッセージを送信
      const result = await rankaAgent.generate([{ role: 'user', content: prompt }]);

      // 評価メトリクスを手動で実行
      const toneScore = await rankaAgent.evals?.toneConsistency.measure(prompt, result.text);

      console.log(`\nPrompt: "${prompt}"`);
      console.log('Response:', result.text);
      console.log('Tone Consistency Score:', toneScore?.score);

      // スコアが存在することを確認
      expect(toneScore).toBeDefined();
      expect(toneScore?.score).toBeDefined();
      expect(typeof toneScore?.score).toBe('number');

      // スコアは0以上1以下であることを確認
      expect(toneScore!.score).toBeGreaterThanOrEqual(0);
      expect(toneScore!.score).toBeLessThanOrEqual(1);
    }
  });

  it('should evaluate both metrics together', { timeout: 30000 }, async () => {
    if (!apiKey) {
      console.log('Skipping test: GOOGLE_GENERATIVE_AI_API_KEY not available');
      return;
    }

    const testPrompts = [
      'はじめまして、月読堂に興味があります。',
      'バグが多くて困っています。',
      '推しの作家さんはいますか？',
    ];

    for (const prompt of testPrompts) {
      // エージェントに対してメッセージを送信
      const result = await rankaAgent.generate([{ role: 'user', content: prompt }]);

      // 両方の評価メトリクスを実行
      const gobiScore = await rankaAgent.evals?.gobiChecker.measure(prompt, result.text);

      const toneScore = await rankaAgent.evals?.toneConsistency.measure(prompt, result.text);

      console.log(`\nPrompt: "${prompt}"`);
      console.log('Response:', result.text);
      console.log('Evaluation scores:', {
        gobiChecker: gobiScore?.score,
        toneConsistency: toneScore?.score,
      });

      // 両方のスコアが存在することを確認
      expect(gobiScore).toBeDefined();
      expect(gobiScore?.score).toBeDefined();
      expect(toneScore).toBeDefined();
      expect(toneScore?.score).toBeDefined();

      // 総合的な品質チェック（両方のスコアが0.5以上であることを期待）
      const gobiScoreValue = gobiScore!.score;
      const toneScoreValue = toneScore!.score;

      console.log(`Quality check - Gobi: ${gobiScoreValue >= 0.5 ? 'PASS' : 'FAIL'}, Tone: ${toneScoreValue >= 0.5 ? 'PASS' : 'FAIL'}`);
    }
  });
});