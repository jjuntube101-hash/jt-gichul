/**
 * 기출 데이터 청크 분할 + 전수 검증 스크립트
 *
 * 원본: 공통/기출인덱스/exam_questions_v3.json (1,245문항)
 * 출력: public/data/questions/chunk_0~N.json (200문항씩)
 * 검증: 원본과 청크의 텍스트 완전 일치 확인 (1글자도 변형 없음)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const CHUNK_SIZE = 200;
const SOURCE_PATH = path.resolve(__dirname, '../../../../../공통/기출인덱스/exam_questions_v3.json');
const OUTPUT_DIR = path.resolve(__dirname, '../public/data/questions');
const INDEX_SOURCE = path.resolve(__dirname, '../../../../../공통/기출인덱스/exam_index.json');
const INDEX_OUTPUT = path.resolve(__dirname, '../public/data/exam_index.json');

function main() {
  console.log('=== JT기출 데이터 청크 분할 + 전수 검증 ===\n');

  // 1. 원본 읽기
  console.log('1. 원본 파일 읽기...');
  const rawSource = fs.readFileSync(SOURCE_PATH, 'utf-8');
  const source = JSON.parse(rawSource);
  const questions: any[] = source.questions;
  const meta = source._meta;

  console.log(`   - 버전: ${meta.version}`);
  console.log(`   - 총 문항: ${meta.total_questions}`);
  console.log(`   - 실제 배열 길이: ${questions.length}`);
  console.log(`   - 최종 업데이트: ${meta.last_updated}`);

  if (questions.length !== meta.total_questions) {
    console.error(`   ❌ 메타 총 문항(${meta.total_questions})과 실제(${questions.length}) 불일치!`);
    process.exit(1);
  }

  // 2. 청크 분할
  console.log('\n2. 청크 분할...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const chunks: any[][] = [];
  for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
    chunks.push(questions.slice(i, i + CHUNK_SIZE));
  }
  console.log(`   - 청크 수: ${chunks.length} (각 ${CHUNK_SIZE}문항, 마지막 ${chunks[chunks.length - 1].length}문항)`);

  // 메타 정보 파일 (청크 인덱스)
  const chunkMeta = {
    _meta: {
      ...meta,
      chunked: true,
      chunk_size: CHUNK_SIZE,
      chunk_count: chunks.length,
      chunked_at: new Date().toISOString().split('T')[0],
    },
    chunks: chunks.map((chunk, i) => ({
      file: `chunk_${i}.json`,
      start_no: chunk[0].no,
      end_no: chunk[chunk.length - 1].no,
      count: chunk.length,
    })),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'meta.json'),
    JSON.stringify(chunkMeta, null, 2),
    'utf-8'
  );

  // 각 청크 파일 저장
  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = path.join(OUTPUT_DIR, `chunk_${i}.json`);
    fs.writeFileSync(chunkPath, JSON.stringify(chunks[i], null, 2), 'utf-8');
    console.log(`   - chunk_${i}.json: ${chunks[i].length}문항 (no ${chunks[i][0].no}~${chunks[i][chunks[i].length - 1].no})`);
  }

  // 3. exam_index.json 복사
  console.log('\n3. exam_index.json 복사...');
  fs.copyFileSync(INDEX_SOURCE, INDEX_OUTPUT);
  console.log(`   - ${INDEX_OUTPUT}`);

  // 4. 전수 검증 — 원본 vs 청크
  console.log('\n4. 전수 검증 시작...');
  let errorCount = 0;
  let verifiedCount = 0;

  // 청크를 다시 읽어서 합치기
  const reassembled: any[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = path.join(OUTPUT_DIR, `chunk_${i}.json`);
    const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
    reassembled.push(...chunkData);
  }

  console.log(`   - 재조립 문항 수: ${reassembled.length}`);

  if (reassembled.length !== questions.length) {
    console.error(`   ❌ 문항 수 불일치! 원본: ${questions.length}, 재조립: ${reassembled.length}`);
    process.exit(1);
  }

  // 문항별 JSON 문자열 비교
  for (let i = 0; i < questions.length; i++) {
    const originalStr = JSON.stringify(questions[i]);
    const reassembledStr = JSON.stringify(reassembled[i]);

    if (originalStr !== reassembledStr) {
      errorCount++;
      console.error(`   ❌ 문항 no=${questions[i].no} 불일치!`);

      // 어디가 다른지 찾기
      const origKeys = Object.keys(questions[i]);
      const reassKeys = Object.keys(reassembled[i]);

      for (const key of origKeys) {
        const origVal = JSON.stringify(questions[i][key]);
        const reassVal = JSON.stringify(reassembled[i][key]);
        if (origVal !== reassVal) {
          console.error(`      필드 "${key}" 다름`);
          console.error(`      원본: ${origVal.substring(0, 100)}...`);
          console.error(`      청크: ${reassVal.substring(0, 100)}...`);
        }
      }
    } else {
      verifiedCount++;
    }
  }

  // 5. 해시 검증 (추가 안전장치)
  console.log('\n5. SHA-256 해시 검증...');
  const originalHash = crypto.createHash('sha256')
    .update(JSON.stringify(questions))
    .digest('hex');
  const reassembledHash = crypto.createHash('sha256')
    .update(JSON.stringify(reassembled))
    .digest('hex');

  console.log(`   - 원본 해시:   ${originalHash}`);
  console.log(`   - 재조립 해시: ${reassembledHash}`);

  if (originalHash === reassembledHash) {
    console.log('   ✅ 해시 일치!');
  } else {
    console.error('   ❌ 해시 불일치!');
    errorCount++;
  }

  // 6. 결과 요약
  console.log('\n=== 검증 결과 ===');
  console.log(`   총 문항: ${questions.length}`);
  console.log(`   검증 통과: ${verifiedCount}`);
  console.log(`   오류: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n   ✅ 전수 검증 통과! 1,245문항 × 모든 필드 완전 일치.');
    console.log(`   📁 출력: ${OUTPUT_DIR}/`);
    console.log(`      - meta.json (청크 인덱스)`);
    for (let i = 0; i < chunks.length; i++) {
      console.log(`      - chunk_${i}.json (${chunks[i].length}문항)`);
    }
    console.log(`      - ${INDEX_OUTPUT} (93좌표 인덱스)`);
  } else {
    console.error('\n   ❌ 검증 실패! 데이터 무결성 위반.');
    process.exit(1);
  }
}

main();
