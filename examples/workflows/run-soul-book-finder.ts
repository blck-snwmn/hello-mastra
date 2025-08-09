/**
 * Soul Book Finder Workflow実行例
 * 深い対話を通じて魂に響く運命の一冊を見つけます
 * 
 * 実行方法: pnpm tsx examples/workflows/run-soul-book-finder.ts
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

// 質問タイプに応じた演出
function displayQuestionContext(questionType: string, depth: number) {
  console.log('\n' + '='.repeat(50));
  
  switch (questionType) {
    case 'introduction':
      console.log('🌙 第一の扉: 表層意識');
      break;
    case 'memory':
      console.log('📚 第二の扉: 記憶の回廊');
      break;
    case 'desire':
      console.log('💫 第三の扉: 深層心理');
      break;
    case 'riddle':
      console.log('🦊 最後の試練: 月読堂の謎かけ');
      break;
    default:
      console.log(`🌸 第${depth}の問い`);
  }
  
  console.log('='.repeat(50));
}

async function runSoulBookFinder() {
  console.log('🌙 魂の一冊探しワークフロー');
  console.log('='.repeat(50) + '\n');

  try {
    // 初回実行
    const workflow = mastra.getWorkflow('soulBookFinderWorkflow');
    if (!workflow) {
      throw new Error('Soul book finder workflow not found');
    }
    const run = await workflow.createRunAsync();
    let result = await run.start({ inputData: {} });
    
    // 対話ループ（4回の深い対話）
    while (result.status === 'suspended') {
      // suspendデータを取得
      const suspendedSteps = result.suspended[0];
      const suspendedStepId = suspendedSteps[0];
      const stepResult = result.steps[suspendedStepId];
      
      
      const questionType = (stepResult as any)?.suspendPayload?.questionType || 'continue';
      const depth = (stepResult as any)?.suspendPayload?.depth || 1;
      const rankaQuestion = (stepResult as any)?.suspendPayload?.rankaQuestion;
      const responses = (stepResult as any)?.suspendPayload?.responses || [];
      
      if (!rankaQuestion) {
        console.log('\n[システム: 対話データの取得に失敗しました]\n');
        break;
      }
      
      // 質問の演出
      displayQuestionContext(questionType, depth);
      console.log(`\n🦊 蘭華: ${rankaQuestion}\n`);
      
      // ユーザーの回答を取得
      const userResponse = await getUserInput('あなた: ');
      
      // ワークフローを再開
      console.log(`[DEBUG] Resuming with response: "${userResponse}", depth: ${depth}, previous responses: ${responses.length}`);
      result = await run.resume({
        step: suspendedStepId,
        resumeData: { 
          userResponse,
          previousResponses: responses 
        }
      });
      console.log(`[DEBUG] After resume - status: ${result.status}`);
    }

    // 最終結果を表示
    if (result.status === 'success' && result.result) {
      const { soulData, chosenBook, finalMessage } = result.result;

      console.log('\n' + '='.repeat(60));
      console.log('✨ 結果 ✨');
      console.log('='.repeat(60));
      console.log('');

      console.log('--- 分析結果 ---');
      console.log(`感情状態: ${soulData.emotionalState}`);
      console.log(`深層心理: ${soulData.deepDesire}`);

      console.log('\n=== 運命の一冊 ===\n');
      console.log(`📖 『${chosenBook.title}』`);
      console.log(`✍️  著者: ${chosenBook.author}`);
      console.log(`⏰  時代: ${chosenBook.era}`);
      
      console.log('\n--- あらすじ ---');
      console.log(chosenBook.summary);
      
      console.log('\n--- 選定理由 ---');
      console.log(chosenBook.whyThisBook);
      
      console.log('\n--- 特別な力 ---');
      console.log(chosenBook.specialPower);
      
      console.log('\n--- 推薦コメント ---');
      console.log(chosenBook.rankaRevelation);
      
      console.log('\n' + '='.repeat(60));
      console.log('\n--- 最終メッセージ ---');
      console.log(finalMessage);
    }

    console.log('\n✨ ワークフロー完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runSoulBookFinder().catch(console.error);
}