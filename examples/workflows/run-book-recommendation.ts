/**
 * Book Recommendation Workflow実行例
 * 対話形式でユーザーの好みを収集し、オリジナルの物語と本を推薦します
 * 
 * 実行方法: pnpm tsx examples/workflows/run-book-recommendation.ts
 */

import { mastra } from '../../src/mastra/index';
import readline from 'readline';

// ユーザー入力を取得するヘルパー関数
function getUserInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function runBookRecommendation() {
  console.log('📖 本推薦ワークフロー');
  console.log('='.repeat(40) + '\n');

  try {
    // 初回実行
    const workflow = mastra.getWorkflow('bookRecommendationWorkflow');
    if (!workflow) {
      throw new Error('Book recommendation workflow not found');
    }
    const run = await workflow.createRunAsync();
    let result = await run.start({ inputData: {} });
    
    // 対話ループ（最大3回の質問）
    while (result.status === 'suspended') {
      // suspendデータを取得
      const suspendedSteps = result.suspended[0];
      const suspendedStepId = suspendedSteps[0];
      const stepResult = result.steps[suspendedStepId];
      
      // 蘭華からの質問を表示
      const rankaMessage = (stepResult as any)?.suspendPayload?.rankaMessage;
      if (!rankaMessage) {
        console.log('\n[システム: 対話データの取得に失敗しました]\n');
        break;
      }
      console.log(`\n🦊 蘭華: ${rankaMessage}\n`);
      
      // ユーザーの回答を取得
      const userResponse = await getUserInput('あなた: ');
      
      // ワークフローを再開
      result = await run.resume({
        step: suspendedStepId,
        resumeData: { userResponse }
      });
    }

    // 最終結果を表示
    if (result.status === 'success' && result.result) {
      const { recommendations, finalMessage } = result.result;

      console.log('\n=== 蘭華からの推薦 ===\n');
      
      recommendations.forEach((rec: any, index: number) => {
        console.log(`📖 推薦 ${index + 1}:`);
        console.log(`   タイトル: 『${rec.title}』`);
        console.log(`   著者: ${rec.author}`);
        console.log(`   あらすじ: ${rec.summary}`);
        console.log(`   蘭華のコメント: ${rec.rankaComment}`);
        console.log('');
      });

      console.log('--- 最終メッセージ ---');
      console.log(finalMessage);
    }

    console.log('\n✨ ワークフロー完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runBookRecommendation().catch(console.error);
}