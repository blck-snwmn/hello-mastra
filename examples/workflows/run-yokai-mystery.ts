/**
 * Yokai Mystery Workflow実行例
 * 7ステップの壮大な妖怪譚を生成します
 * 
 * 実行方法: pnpm tsx examples/workflows/run-yokai-mystery.ts
 */

import { mastra } from '../../src/mastra/index';

async function runYokaiMystery() {
  console.log('📜 妖怪譚生成ワークフロー');
  console.log('='.repeat(40) + '\n');

  try {
    // 妖怪の種類は指定可能（狐、猫又、雪女、天狗、鬼など）
    // 指定しない場合はランダムに選ばれます
    const workflow = mastra.getWorkflow('yokaiMysteryWorkflow');
    if (!workflow) {
      throw new Error('Yokai mystery workflow not found');
    }
    const run = await workflow.createRunAsync();
    const result = await run.start({
      inputData: {
        preferredType: '狐', // オプション: 特定の妖怪を指定
        // preferredType を省略するとランダム選択
      },
    });

    if (result.status === 'success' && result.result) {
      const { story, book } = result.result;

      console.log('=== 完成した妖怪譚 ===\n');
      
      console.log(`📖 【${book.title}】`);
      console.log(`    ${book.subtitle}`);
      console.log(`✍️  著者: ${book.author}\n`);

      console.log('--- 物語の要素 ---');
      console.log(`👹 妖怪: ${story.yokai.yokaiName}（${story.yokai.yokaiType}）`);
      console.log(`⏰ 時代: ${story.era}`);
      console.log(`👤 主人公: ${story.protagonist.name}（${story.protagonist.age}歳、${story.protagonist.occupation}）`);
      
      console.log('\n--- 妖怪の特徴 ---');
      story.yokai.characteristics.forEach((char: string, i: number) => {
        console.log(`  ${i + 1}. ${char}`);
      });

      console.log('\n--- 妖怪の能力 ---');
      story.yokai.powers.forEach((power: string, i: number) => {
        console.log(`  ${i + 1}. ${power}`);
      });

      console.log('\n--- あらすじ ---');
      console.log(story.plot);

      console.log('\n--- 物語のテーマ ---');
      console.log(`💭 ${story.theme}`);

      console.log('\n--- 装丁 ---');
      console.log(`🎨 ${book.binding}`);

      console.log('\n--- コメント ---');
      console.log(book.rankaComment);
    }

    console.log('\n✨ ワークフロー完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runYokaiMystery().catch(console.error);
}