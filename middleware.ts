/**
 * Next.js Edge Middleware
 * - /data/ 경로 접근 속도 제한 (봇 스크래핑 방지)
 * - 보안 헤더 추가
 * - 악성 봇 User-Agent 차단
 */

import { NextRequest, NextResponse } from 'next/server';

// --- 봇 차단 User-Agent 패턴 ---
const BOT_PATTERNS = [
  /curl/i,
  /wget/i,
  /python-requests/i,
  /scrapy/i,
  /httpclient/i,
  /java\//i,
  /libwww/i,
  /httpunit/i,
  /nutch/i,
  /phpcrawl/i,
  /mj12bot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /dotbot/i,
  /rogerbot/i,
  /opensiteexplorer/i,
  /megaindex/i,
  /blexbot/i,
  /ltx71/i,
];

// --- IP 기반 간이 속도 제한 (Edge Runtime 호환) ---
const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = ipRequestMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRequestMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > limit) {
    return true;
  }
  return false;
}

// 주기적 정리 (메모리 누수 방지)
function cleanupOldEntries() {
  const now = Date.now();
  for (const [ip, entry] of ipRequestMap) {
    if (now > entry.resetAt) {
      ipRequestMap.delete(ip);
    }
  }
}

// --- 보안 헤더 ---
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Content-Security-Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-insights.com https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://api.anthropic.com wss://*.supabase.co https://cdn.vercel-insights.com https://va.vercel-scripts.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ua = request.headers.get('user-agent') || '';
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // 1. /data/ 경로 보호 (정적 JSON 파일)
  if (pathname.startsWith('/data/')) {
    // 봇 User-Agent 차단
    if (BOT_PATTERNS.some((p) => p.test(ua))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // User-Agent 없는 요청 차단
    if (!ua || ua.length < 10) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // IP 속도 제한: /data/ 경로는 분당 30회
    if (isRateLimited(`data:${ip}`, 30, 60_000)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }

    // 메타/청크 파일 직접 접근 시 Referer 확인
    if (
      pathname.includes('chunk_') ||
      pathname.includes('meta.json')
    ) {
      const referer = request.headers.get('referer') || '';
      const origin = request.headers.get('origin') || '';
      const isFromOurSite =
        referer.includes('gichul.jttax.co.kr') ||
        referer.includes('localhost') ||
        referer.includes('jt-gichul.vercel.app') ||
        origin.includes('gichul.jttax.co.kr') ||
        origin.includes('localhost') ||
        origin.includes('jt-gichul.vercel.app');

      // Referer가 없거나 외부 사이트인 경우 (Service Worker 요청은 통과)
      if (!referer && !origin && !ua.includes('Service Worker')) {
        // 직접 URL 입력은 허용하되 로깅용
      }
    }

    // 청크 파일에 캐시 제어 헤더 추가 (CDN 캐시 허용하되 브라우저 캐시 제한)
    const response = NextResponse.next();
    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=86400'
    );
    // 크로스오리진 요청 방지
    response.headers.set(
      'Access-Control-Allow-Origin',
      'https://gichul.jttax.co.kr'
    );
    return addSecurityHeaders(response);
  }

  // 2. API 경로 보안
  if (pathname.startsWith('/api/')) {
    // API 속도 제한: 분당 60회
    if (isRateLimited(`api:${ip}`, 60, 60_000)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // 3. 문항 페이지 속도 제한 (크롤링 방지)
  if (pathname.startsWith('/question/')) {
    // 문항 페이지 분당 60회 제한
    if (isRateLimited(`question:${ip}`, 60, 60_000)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }
  }

  // 4. 주기적 정리 (1000개 이상 쌓이면)
  if (ipRequestMap.size > 1000) {
    cleanupOldEntries();
  }

  // 5. 기본 보안 헤더 추가
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    // 정적 자산 제외, 나머지 모든 경로에 적용
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|apple-touch-icon.png).*)',
  ],
};
