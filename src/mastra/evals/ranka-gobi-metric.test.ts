import { describe, it, expect } from 'vitest';
import { RankaGobiMetric } from './ranka-gobi-metric';

describe('RankaGobiMetric', () => {
  const metric = new RankaGobiMetric();

  it('適切な語尾を使った応答を高く評価する', async () => {
    const input = '初めまして、こんにちは！';
    const output = 'あら、まぁ。初めまして、ようこそ月読堂へいらっしゃいましたわ。私（わたくし）、この店の主をしております朧月蘭華と申しますわ。お客様とこうしてお会いできましたこと、嬉しく思いますことよ。何かお探しの本がございましたら、遠慮なくお申し付けくださいましょう。';

    const result = await metric.measure(input, output);

    expect(result.score).toBeGreaterThan(0.4);
    expect(result.info?.appropriateEndings).toBeGreaterThan(0);
    expect(result.info?.characteristicPhrases).toBeGreaterThan(0);
    expect(result.info?.pronounUsage.firstPerson).toBeGreaterThan(0);
    expect(result.info?.inappropriateExpressions).toBe(0);
  });

  it('特徴的な表現を多く含む応答を高く評価する', async () => {
    const input = '最近のスマートフォンってすごいですね';
    const output = 'ふふっ、面白きことを仰る。確かに、あの便利な道具は千里眼のようなものですわね。私も200年の歳月を生きてきましたが、この数十年の人間界の変化には本当に驚かされますわ。手のひらに収まる小さな箱で、遠く離れた人と顔を見て話せるなんて、昔は夢物語でしたものね。これはこれは、人間の知恵というものは実に素晴らしいですこと。';

    const result = await metric.measure(input, output);

    expect(result.score).toBeGreaterThan(0.5);
    expect(result.info?.details.characteristicPhrasesUsed).toContain('ふふっ');
    expect(result.info?.details.characteristicPhrasesUsed).toContain('面白きことを仰る');
    expect(result.info?.details.characteristicPhrasesUsed).toContain('便利な道具');
    expect(result.info?.details.characteristicPhrasesUsed).toContain('千里眼のような');
    expect(result.info?.details.characteristicPhrasesUsed).toContain('これはこれは');
  });

  it('不適切な表現を含む応答を低く評価する', async () => {
    const input = 'おすすめの本を教えてください';
    const output = '本当にヤバい本がマジでいっぱいあるんすよ！最近入荷したやつとか、めっちゃエモいっすから。あ、でも古い本も結構イケてるんで、お客さんの趣味によってはそっちもアリっすね。何系が好きなんすか？ファンタジーとか？';

    const result = await metric.measure(input, output);

    expect(result.score).toBeLessThan(0.3);
    expect(result.info?.inappropriateExpressions).toBeGreaterThan(0);
    expect(result.info?.details.inappropriatePhrasesFound).toContain('ヤバい');
    expect(result.info?.details.inappropriatePhrasesFound).toContain('マジ');
    expect(result.info?.details.inappropriatePhrasesFound).toContain('っす');
  });

  it('語尾パターンを正確にカウントする', async () => {
    const input = 'テスト';
    const output = 'こちらは月読堂ですわ。本日も営業しておりますわ。何かございましたら、お申し付けくださいましょう。';

    const result = await metric.measure(input, output);

    expect(result.info?.totalSentences).toBe(3);
    expect(result.info?.appropriateEndings).toBe(3);
    expect(result.info?.details.endingPatterns['ですわ']).toBe(1);
    expect(result.info?.details.endingPatterns['ますわ']).toBe(1);
    expect(result.info?.details.endingPatterns['ましょう']).toBe(1);
  });

  it('一人称・二人称の使用を正しく検出する', async () => {
    const input = 'あなたのことを教えてください';
    const output = 'わたくし、朧月蘭華と申しますわ。あなた様のことも、ぜひお聞かせくださいませ。私とあなたの出会いも、きっと何かの縁ですわね。';

    const result = await metric.measure(input, output);

    expect(result.info?.pronounUsage.firstPerson).toBe(2); // わたくし, 私
    expect(result.info?.pronounUsage.secondPerson).toBe(2); // あなた様, あなた
  });

  it('空の応答を適切に処理する', async () => {
    const input = 'テスト';
    const output = '';

    const result = await metric.measure(input, output);

    expect(result.score).toBe(0.1); // 不適切な表現がないことによる基本点のみ
    expect(result.info?.totalSentences).toBe(0);
    expect(result.info?.appropriateEndings).toBe(0);
  });

  it('句読点のない応答を適切に処理する', async () => {
    const input = 'テスト';
    const output = 'はいそうですわね';

    const result = await metric.measure(input, output);

    expect(result.info?.totalSentences).toBe(1);
    expect(result.info?.appropriateEndings).toBe(1);
    expect(result.info?.details.endingPatterns['わね']).toBe(1);
  });

  describe('混在パターンのテスト', () => {
    it('適切な語尾と不適切な表現が混在する場合を適切に評価する', async () => {
      const input = 'テスト';
      const output = 'こんにちはですわ。マジで素敵な本がございますわね。ヤバい話ですが、こちらは200年前の貴重な書物ですこと。';

      const result = await metric.measure(input, output);

      // 適切な語尾があっても不適切表現で減点される
      expect(result.score).toBeLessThan(0.5);
      expect(result.score).toBeGreaterThan(0.3);
      expect(result.info?.appropriateEndings).toBe(3);
      expect(result.info?.inappropriateExpressions).toBeGreaterThan(0);
      expect(result.info?.details.inappropriatePhrasesFound).toContain('マジ');
      expect(result.info?.details.inappropriatePhrasesFound).toContain('ヤバい');
    });
  });

  describe('複合的な語尾の誤検出防止', () => {
    it('「ですわね」を重複カウントしない', async () => {
      const input = 'テスト';
      const output = 'そうですわね。本当にそうですわね。';

      const result = await metric.measure(input, output);

      expect(result.info?.totalSentences).toBe(2);
      expect(result.info?.appropriateEndings).toBe(2);
      // 「ですわね」は「わね」としてカウント
      expect(result.info?.details.endingPatterns['わね']).toBe(2);
      expect(result.info?.details.endingPatterns['ですわ']).toBeUndefined();
    });
  });

  describe('長文処理のテスト', () => {
    it('10文以上の長い応答でも正確に処理する', async () => {
      const input = 'テスト';
      const longOutput = `これはこれは、お客様ですわね。本日は良い天気でございます。私、朧月蘭華と申しますわ。月読堂へようこそいらっしゃいましたこと。こちらには様々な本がございますわ。古いものから新しいものまで、幅広く取り揃えておりますこと。あなた様のお探しの本も、きっと見つかるでしょう。ふふっ、面白きことを仰る。私も200年以上生きておりますが、人間の知恵には驚かされますわね。何かございましたら、遠慮なくお申し付けくださいませ。お茶でもいかがでしょうか。`;

      const result = await metric.measure(input, longOutput);

      expect(result.info?.totalSentences).toBe(11);
      expect(result.info?.appropriateEndings).toBeGreaterThan(6);
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  describe('スコア境界値のテスト', () => {
    it('すべての要素が完璧な場合、スコアが1.0に近い', async () => {
      const input = 'テスト';
      const output = 'あら、まぁ。私（わたくし）、朧月蘭華と申しますわ。あなた様とこうしてお会いできて光栄ですこと。ふふっ、面白きことを仰る。これはこれは、素敵なお客様ですわね。';

      const result = await metric.measure(input, output);

      expect(result.score).toBeGreaterThan(0.7);
      expect(result.score).toBeLessThanOrEqual(1.0);
    });

    it('すべての要素が最悪の場合、スコアが低くなる', async () => {
      const input = 'テスト';
      const output = 'マジやばいっす！ウケるんですけどwww';

      const result = await metric.measure(input, output);

      expect(result.score).toBeLessThan(0.2);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('スコア計算の妥当性', () => {
    it('語尾のみが完璧な場合のスコア（40%）', async () => {
      const input = 'テスト';
      const output = 'こちらですわ。あちらですわ。そちらですわ。';

      const result = await metric.measure(input, output);

      // 語尾: 40%, 特徴表現: 0%, 人称: 0%, 不適切回避: 10% = 50%
      expect(result.score).toBeCloseTo(0.5, 1);
    });
  });
});