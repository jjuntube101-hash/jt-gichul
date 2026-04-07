/**
 * law.go.kr API 클라이언트 (서버사이드)
 *
 * 법령 검색 및 조문 상세 조회.
 * jt-law-mcp의 로직을 Next.js 서버에서 직접 호출하도록 포팅.
 */

// --- 상수 ---

const API_SEARCH = 'https://www.law.go.kr/DRF/lawSearch.do';
const API_DETAIL = 'https://www.law.go.kr/DRF/lawService.do';
const OC = process.env.KOREAN_LAW_OC || 'jjuntax';
const TIMEOUT_MS = 15_000;

/** 주요 세법 MST 사전 매핑 (검색 없이 바로 조문 조회 가능) */
export const KNOWN_LAWS: Record<string, { mst: string; keywords: string[] }> = {
  '소득세법': { mst: '276127', keywords: ['소득세', '소득', '종합소득', '양도소득', '근로소득', '사업소득'] },
  '법인세법': { mst: '276111', keywords: ['법인세', '법인', '익금', '손금'] },
  '부가가치세법': { mst: '276112', keywords: ['부가가치세', '부가세', '매출세액', '매입세액', '영세율', '면세'] },
  '국세기본법': { mst: '276073', keywords: ['국세기본', '가산세', '수정신고', '경정청구', '세무조사'] },
  '국세징수법': { mst: '276085', keywords: ['국세징수', '체납', '납부', '징수'] },
  '상속세 및 증여세법': { mst: '276116', keywords: ['상속세', '증여세', '상속', '증여', '유산'] },
  '종합부동산세법': { mst: '276168', keywords: ['종합부동산세', '종부세'] },
  '지방세법': { mst: '276149', keywords: ['지방세', '취득세', '재산세', '등록면허세'] },
  '지방세기본법': { mst: '276147', keywords: ['지방세기본'] },
  '조세특례제한법': { mst: '276130', keywords: ['조세특례', '조특법', '감면', '세액공제'] },
};

// --- 인터페이스 ---

export interface LawArticle {
  articleNum: string;   // "제4조"
  title: string;        // 조문 제목
  content: string;      // 조문 내용 (항/호/목 포함)
}

export interface LawSearchResult {
  lawName: string;
  mst: string;
  enforcementDate: string;
}

export interface LawContext {
  lawName: string;
  articles: LawArticle[];
  source: string; // "law.go.kr"
}

// --- API 호출 ---

async function fetchWithTimeout(url: string, timeoutMs = TIMEOUT_MS): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** 법령 검색 → MST 반환 */
export async function searchLaw(query: string): Promise<LawSearchResult[]> {
  const params = new URLSearchParams({
    OC,
    target: 'law',
    type: 'XML',
    query,
    display: '5',
  });

  const xml = await fetchWithTimeout(`${API_SEARCH}?${params}`);
  return parseLawSearchXml(xml);
}

/** 조문 상세 조회 */
export async function getLawArticles(mst: string): Promise<LawArticle[]> {
  const params = new URLSearchParams({
    OC,
    target: 'law',
    type: 'XML',
    MST: mst,
  });

  const xml = await fetchWithTimeout(`${API_DETAIL}?${params}`, 30_000);
  return parseLawDetailXml(xml);
}

// --- XML 파싱 (경량 정규식 기반, 외부 라이브러리 없이) ---

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[1]);
  }
  return results;
}

function extractAllBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, 'g');
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[0]);
  }
  return results;
}

function parseLawSearchXml(xml: string): LawSearchResult[] {
  // <law> 블록들을 찾아서 파싱
  const lawBlocks = xml.match(/<law>[\s\S]*?<\/law>/g) || [];
  // 대체 태그명 지원 (API가 <법령> 태그를 쓸 수도 있음)
  const altBlocks = xml.match(/<법령>[\s\S]*?<\/법령>/g) || [];
  const blocks = lawBlocks.length > 0 ? lawBlocks : altBlocks;

  return blocks.slice(0, 5).map((block) => ({
    lawName: extractTag(block, '법령명한글') || extractTag(block, '법령명'),
    mst: extractTag(block, '법령일련번호') || extractTag(block, 'MST'),
    enforcementDate: extractTag(block, '시행일자'),
  }));
}

function parseLawDetailXml(xml: string): LawArticle[] {
  const articleBlocks = extractAllBlocks(xml, '조문단위');
  if (articleBlocks.length === 0) return [];

  return articleBlocks.map((block) => {
    const num = extractTag(block, '조문번호');
    const branchNum = extractTag(block, '조문가지번호');
    const title = extractTag(block, '조문제목');
    const mainContent = extractTag(block, '조문내용');

    // 항 내용 수집
    const hangBlocks = extractAllBlocks(block, '항');
    const hangTexts = hangBlocks.map((h) => {
      const hangNum = extractTag(h, '항번호');
      const hangContent = extractTag(h, '항내용');
      // 호 내용
      const hoBlocks = extractAllBlocks(h, '호');
      const hoTexts = hoBlocks.map((ho) => {
        const hoNum = extractTag(ho, '호번호');
        const hoContent = extractTag(ho, '호내용');
        return `  ${hoNum}. ${cleanHtml(hoContent)}`;
      });
      const hangText = `${hangNum ? `(${hangNum}) ` : ''}${cleanHtml(hangContent)}`;
      return hoTexts.length > 0 ? `${hangText}\n${hoTexts.join('\n')}` : hangText;
    });

    const articleNum = branchNum ? `제${num}조의${branchNum}` : `제${num}조`;
    const fullContent = hangTexts.length > 0
      ? `${cleanHtml(mainContent)}\n${hangTexts.join('\n')}`
      : cleanHtml(mainContent);

    return {
      articleNum,
      title: cleanHtml(title),
      content: fullContent,
    };
  });
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')       // HTML 태그 제거
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// --- 고수준 API ---

/**
 * 질문에서 법명 키워드를 추출하여 해당 법령의 관련 조문을 반환.
 * 실패 시 빈 배열 반환 (graceful fallback).
 */
export async function searchLawContext(question: string): Promise<LawContext[]> {
  try {
    // 1. 질문에서 매칭되는 법령 찾기
    const matchedLaws: { name: string; mst: string }[] = [];

    for (const [lawName, info] of Object.entries(KNOWN_LAWS)) {
      if (info.keywords.some((kw) => question.includes(kw))) {
        matchedLaws.push({ name: lawName, mst: info.mst });
      }
    }

    // 매칭 없으면 빈 반환
    if (matchedLaws.length === 0) return [];

    // 최대 2개 법령만 조회 (토큰 절약)
    const targets = matchedLaws.slice(0, 2);

    // 2. 조문 번호 추출 시도 (예: "제4조", "20조")
    const articleNums = extractArticleNumbers(question);

    // 3. 법령별 조문 조회
    const results: LawContext[] = [];

    for (const target of targets) {
      const allArticles = await getLawArticles(target.mst);
      if (allArticles.length === 0) continue;

      let selected: LawArticle[];

      if (articleNums.length > 0) {
        // 특정 조문 번호가 언급된 경우 해당 조문만
        selected = allArticles.filter((a) =>
          articleNums.some((num) => a.articleNum.includes(num))
        );
      } else {
        // 조문 번호 없으면 처음 3개 조문만 (토큰 절약)
        selected = allArticles.slice(0, 3);
      }

      // 컨텍스트 크기 제한 (~400 토큰/법령)
      const trimmed = trimArticles(selected, 400);

      if (trimmed.length > 0) {
        results.push({
          lawName: target.name,
          articles: trimmed,
          source: 'law.go.kr',
        });
      }
    }

    return results;
  } catch {
    // API 실패 시 graceful fallback
    return [];
  }
}

/** 질문에서 조문 번호 추출 (예: "제4조", "20조", "제4조의2") */
function extractArticleNumbers(question: string): string[] {
  const nums: string[] = [];
  // "제N조" 또는 "제N조의M" 패턴
  const re1 = /제(\d+)조(?:의(\d+))?/g;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(question)) !== null) {
    nums.push(m[2] ? `제${m[1]}조의${m[2]}` : `제${m[1]}조`);
  }
  // "N조" 패턴 (제 없이)
  const re2 = /(\d+)조(?:의(\d+))?/g;
  while ((m = re2.exec(question)) !== null) {
    const full = m[2] ? `제${m[1]}조의${m[2]}` : `제${m[1]}조`;
    if (!nums.includes(full)) nums.push(full);
  }
  return nums;
}

/** 토큰 제한에 맞게 조문 트리밍 */
function trimArticles(articles: LawArticle[], maxChars: number): LawArticle[] {
  const result: LawArticle[] = [];
  let totalChars = 0;

  for (const article of articles) {
    const articleLen = article.articleNum.length + article.title.length + article.content.length;
    if (totalChars + articleLen > maxChars * 2 && result.length > 0) break; // ~2 chars per token
    result.push(article);
    totalChars += articleLen;
  }

  return result;
}
