/**
 * Daily Fortune Workflow実行例
 * 今日の運勢を占い、開運の本を推薦します
 * 
 * 実行方法: pnpm tsx examples/workflows/run-daily-fortune.ts
 */

import { mastra } from '../../src/mastra/index';

async function runDailyFortune() {
  console.log('✨ 今日の運勢ワークフロー');
  console.log('='.repeat(40) + '\n');

  try {
    // ユーザー名はオプション（指定しない場合は「お客様」として扱われる）
    const workflow = mastra.getWorkflow('dailyFortuneWorkflow');
    if (!workflow) {
      throw new Error('Daily fortune workflow not found');
    }
    const run = await workflow.createRunAsync();
    const result = await run.start({
      inputData: {
        userName: '山田太郎', // オプション: 名前を指定できます
      },
    });

    if (result.status === 'success' && result.result) {
      const { fortune, recommendedBook } = result.result;

      console.log('=== 今日の運勢 ===');
      console.log(`📅 ${fortune.date}`);
      console.log(`\n🔮 運勢:\n${fortune.fortune}`);
      console.log(`\n🎨 ラッキーカラー: ${fortune.luckyColor}`);
      console.log(`🍀 ラッキーアイテム: ${fortune.luckyItem}`);
      console.log(`\n💭 アドバイス:\n${fortune.advice}`);

      console.log('\n=== 開運の一冊 ===');
      console.log(`📖 タイトル: ${recommendedBook.title}`);
      console.log(`✍️ 著者: ${recommendedBook.author}`);
      console.log(`\n📝 推薦理由:\n${recommendedBook.reason}`);
      console.log(`\n💌 メッセージ:\n${recommendedBook.rankaMessage}`);
    }

    console.log('\n✨ ワークフロー完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runDailyFortune().catch(console.error);
}