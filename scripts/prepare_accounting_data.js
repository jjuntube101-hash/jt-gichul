/**
 * 회계 기출 데이터 변환 스크립트
 *
 * 소스: 출판/수험서/회계/작업자료/자료조사/기출/exam_questions_accounting_v1.json
 * 출력:
 *   - public/data/questions/chunk_accounting_0.json, chunk_accounting_1.json (400문항씩)
 *   - public/data/exam_index_accounting.json
 *   - public/data/questions/meta.json (업데이트)
 *
 * no 재매핑: 2001~ (세법 1~1245와 충돌 방지)
 */

const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.resolve(__dirname, '../../../../../출판/수험서/회계/작업자료/자료조사/기출/exam_questions_accounting_v1.json');
const OUTPUT_DIR = path.resolve(__dirname, '../public/data/questions');
const INDEX_OUTPUT = path.resolve(__dirname, '../public/data/exam_index_accounting.json');
const META_PATH = path.join(OUTPUT_DIR, 'meta.json');
const CHUNK_SIZE = 400;
const NO_OFFSET = 2001;

function main() {
  console.log('=== 회계 기출 데이터 변환 ===\n');

  // 1. 소스 읽기
  console.log('1. 소스 파일 읽기...');
  const raw = fs.readFileSync(SOURCE_PATH, 'utf-8');
  const source = JSON.parse(raw);
  const questions = source.questions;
  console.log(`   - 총 문항: ${questions.length}`);

  // 2. no 재매핑 + 필드 정규화
  console.log('\n2. no 재매핑 (2001~) + 필드 정규화...');
  const mapped = questions.map((q, i) => {
    const newNo = NO_OFFSET + i;

    // analysis 정규화: 회계 데이터의 analysis 구조를 세법과 호환되도록 변환
    const analysis = q.analysis || {};

    // 세법 앱에서 기대하는 필드 중 누락된 것들에 기본값 설정
    const normalizedAnalysis = {
      question_type: analysis.question_type || '',
      question_subtype: analysis.question_subtype || '',
      difficulty: analysis.difficulty || 0,
      estimated_correct_rate: analysis.estimated_correct_rate || 0,
      choices_analysis: (analysis.choices_analysis || []).map(ca => ({
        choice_num: ca.choice_num,
        verdict: ca.verdict || 'O',
        law_ref: ca.law_ref || '',
        analysis: ca.analysis || '',
        trap_type: ca.trap_type || null,
        distortion: ca.distortion || null,
      })),
      intent: analysis.intent || '',
      discrimination_point: analysis.discrimination_point || '',
      trap_patterns: analysis.trap_patterns || [],
      keywords: analysis.keywords || [],
      related_questions: (analysis.related_questions || []).map(n => n + NO_OFFSET - 1),
      struct_note_section: analysis.struct_note_section || analysis.cross_reference?.struct_note_section || '',
      ox_convertible: analysis.ox_convertible || false,
      ox_items: (analysis.ox_items || []).map(ox => ({
        ox_text: ox.ox_text || '',
        answer: ox.answer || 'O',
        law_ref: ox.law_ref || '',
      })),
      study_guide: analysis.study_guide || {
        what_examiner_tests: '',
        how_to_study: '',
        common_mistakes: '',
        study_priority: '중',
        revision_tag: '',
      },
      analysis_basis: analysis.analysis_basis || '',
    };

    return {
      no: newNo,
      tax_type: '회계',  // 세법과 구분하기 위한 마커
      subject: q.subject || '회계학',
      시험_구분: q.시험_구분 || '',
      직급: q.직급 || '9급',
      과목명: q.subject || '회계학',
      시행년도: q.시행년도 || 0,
      문제번호: q.문제번호 || 0,
      문제_내용: q.문제_내용 || '',
      보기: q.보기 || '',
      선택지: q.선택지 || [],
      정답: q.정답,
      대분류: q.대분류 || '미분류',
      중분류: q.중분류 || '',
      소분류: q.소분류 || '',
      근거법령: q.근거법령 || '',
      analysis: normalizedAnalysis,
    };
  });

  console.log(`   - 매핑 완료: no ${mapped[0].no} ~ ${mapped[mapped.length - 1].no}`);

  // 3. 청크 분할
  console.log('\n3. 청크 분할...');
  const chunks = [];
  for (let i = 0; i < mapped.length; i += CHUNK_SIZE) {
    chunks.push(mapped.slice(i, i + CHUNK_SIZE));
  }
  console.log(`   - 청크 수: ${chunks.length} (각 ${CHUNK_SIZE}문항, 마지막 ${chunks[chunks.length - 1].length}문항)`);

  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = path.join(OUTPUT_DIR, `chunk_accounting_${i}.json`);
    fs.writeFileSync(chunkPath, JSON.stringify(chunks[i], null, 2), 'utf-8');
    console.log(`   - chunk_accounting_${i}.json: ${chunks[i].length}문항 (no ${chunks[i][0].no}~${chunks[i][chunks[i].length - 1].no})`);
  }

  // 4. meta.json 업데이트 (기존 세법 청크에 회계 청크 추가)
  console.log('\n4. meta.json 업데이트...');
  const existingMeta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));

  // 기존 회계 청크 제거 (재실행 안전)
  existingMeta.chunks = existingMeta.chunks.filter(c => !c.file.startsWith('chunk_accounting_'));

  // 회계 청크 추가
  const accountingChunks = chunks.map((chunk, i) => ({
    file: `chunk_accounting_${i}.json`,
    start_no: chunk[0].no,
    end_no: chunk[chunk.length - 1].no,
    count: chunk.length,
    subject: 'accounting',
  }));

  existingMeta.chunks.push(...accountingChunks);

  // 회계 메타 정보 추가
  existingMeta._meta.accounting = {
    total_questions: mapped.length,
    no_range: [NO_OFFSET, NO_OFFSET + mapped.length - 1],
    chunk_count: chunks.length,
    chunk_size: CHUNK_SIZE,
    generated: new Date().toISOString().split('T')[0],
  };

  fs.writeFileSync(META_PATH, JSON.stringify(existingMeta, null, 2), 'utf-8');
  console.log('   - meta.json 업데이트 완료');

  // 5. exam_index_accounting.json 생성
  // 구조: categories[대분류][중분류][소분류 or 중분류] = TopicEntry
  // CategoryTree와 호환을 위해 3단계 구조 유지
  // 소분류가 없는 경우 중분류를 소분류로 사용
  console.log('\n5. exam_index_accounting.json 생성...');
  const categories = {};

  for (const q of mapped) {
    const 대분류 = q.대분류 || '미분류';
    const 중분류 = q.중분류 || '기타';

    if (!categories[대분류]) categories[대분류] = {};
    if (!categories[대분류][중분류]) {
      categories[대분류][중분류] = {
        card_path: '',
        total: 0,
        recent_5y: 0,
        grade: '★',
        grade_recent: '—',
        by_exam: {},
      };
    }

    const entry = categories[대분류][중분류];
    entry.total++;

    if (q.시행년도 >= 2021) {
      entry.recent_5y++;
    }

    const examKey = `${q.시험_구분}_${q.직급}`;
    entry.by_exam[examKey] = (entry.by_exam[examKey] || 0) + 1;
  }

  // 등급 계산
  for (const [, topics] of Object.entries(categories)) {
    for (const [, entry] of Object.entries(topics)) {
      const e = entry;
      // 전체 등급
      if (e.total >= 30) e.grade = '★★★';
      else if (e.total >= 15) e.grade = '★★';
      else e.grade = '★';

      // 최근 5년 등급
      if (e.recent_5y >= 10) e.grade_recent = '★★★';
      else if (e.recent_5y >= 5) e.grade_recent = '★★';
      else if (e.recent_5y >= 1) e.grade_recent = '★';
      else e.grade_recent = '—';
    }
  }

  // CategoryTree 호환을 위해 3단계 구조로 래핑
  // CategoryTree 기대 구조: categories[header][cardName=대분류][topicName=중분류] = TopicEntry
  // 세법:  categories["국세"]["국세기본법"]["납세의무"] = TopicEntry
  // 회계:  categories["회계"]["회계원리"]["회계순환과정"] = TopicEntry
  // practice 페이지에서 law=대분류, topic=중분류로 필터하므로 이 구조가 정확히 맞음
  const wrappedCategories = {
    "회계": categories,
  };

  // 통계 계산
  const examTypes = {};
  for (const q of mapped) {
    const key = `${q.시험_구분}_${q.직급}`;
    examTypes[key] = (examTypes[key] || 0) + 1;
  }

  const examIndex = {
    version: '1.0',
    generated: new Date().toISOString().split('T')[0],
    total_questions: mapped.length,
    exam_types: examTypes,
    categories: wrappedCategories,
  };

  fs.writeFileSync(INDEX_OUTPUT, JSON.stringify(examIndex, null, 2), 'utf-8');
  console.log(`   - exam_index_accounting.json 생성 완료 (${Object.keys(categories).length}개 대분류)`);

  // 6. 검증
  console.log('\n6. 검증...');
  let errorCount = 0;

  // 청크 재조립 확인
  const reassembled = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = path.join(OUTPUT_DIR, `chunk_accounting_${i}.json`);
    const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
    reassembled.push(...chunkData);
  }

  if (reassembled.length !== mapped.length) {
    console.error(`   ❌ 문항 수 불일치! 원본: ${mapped.length}, 재조립: ${reassembled.length}`);
    errorCount++;
  } else {
    console.log(`   ✅ 문항 수 일치: ${reassembled.length}`);
  }

  // no 중복 확인
  const noSet = new Set(mapped.map(q => q.no));
  if (noSet.size !== mapped.length) {
    console.error('   ❌ no 중복 발견!');
    errorCount++;
  } else {
    console.log('   ✅ no 중복 없음');
  }

  // no 범위 확인 (세법과 충돌 없음)
  const minNo = Math.min(...mapped.map(q => q.no));
  const maxNo = Math.max(...mapped.map(q => q.no));
  if (minNo < NO_OFFSET) {
    console.error(`   ❌ no 범위 오류: min=${minNo} < ${NO_OFFSET}`);
    errorCount++;
  } else {
    console.log(`   ✅ no 범위: ${minNo} ~ ${maxNo} (세법 1~1245와 충돌 없음)`);
  }

  // 대분류 통계
  const byCategory = {};
  for (const q of mapped) {
    byCategory[q.대분류] = (byCategory[q.대분류] || 0) + 1;
  }
  console.log('\n   대분류별 문항 수:');
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${cat}: ${count}`);
  }

  console.log(`\n=== 완료 (오류: ${errorCount}) ===`);
  if (errorCount > 0) process.exit(1);
}

main();
