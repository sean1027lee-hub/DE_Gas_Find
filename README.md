# Tankpreis — 내 주변 독일 주유 가격

주유소 앞에서 **한 손으로 3초 안에 "어디가 제일 싼가"** 를 판단하는 모바일 우선 PWA.
독일 공식 실시간 가격(MTS-K, Tankerkönig API)에 Fleet Card 할인을 반영한 **카드 적용 예상가**로 비교합니다.

- 가장 싼 곳을 주유소 가격판 스타일 카드로 맨 위에, 그 아래 가격순 리스트(최저가 대비 차이 표시)
- 연료(E10/E5/Diesel)·반경(2/5/10/25km)·목록/지도 전환은 화면 하단 엄지 영역
- "07:04 기준" 데이터 시각 상시 표시, 10분 지나면 강조, 오프라인이면 마지막 결과를 명시해서 표시
- 지도: 가격 라벨 마커(저렴/보통/비쌈 3단계), 겹치면 싼 곳 우선으로 라벨을 남기고 나머지는 점으로
- 상세 시트: 세 연료 가격, 주소, 영업시간, Apple/Google 지도 길안내, 즐겨찾기
- 라이트/다크, WCAG AA, 스크린리더·키보드 지원, `prefers-reduced-motion` 존중

가격 데이터: [Tankerkönig](https://creativecommons.tankerkoenig.de) / MTS-K (CC BY 4.0) · 지도: © OpenFreeMap © OpenMapTiles © OpenStreetMap 기여자 · 위치 검색: Nominatim

---

## 배포 가이드 (Vercel, 무료)

### 1. Tankerkönig API 키 받기
1. <https://creativecommons.tankerkoenig.de> 접속 → **API-Key** 메뉴에서 이메일로 신청 (무료)
2. 메일로 받은 키(UUID 형식)를 메모해 둡니다. **이 키는 앱 코드나 GitHub에 절대 넣지 않습니다.**

### 2. Vercel에 연결
1. <https://vercel.com> 에 GitHub 계정으로 가입/로그인
2. **Add New… → Project** → `DE_Gas_Find` 저장소 **Import**
3. Framework Preset은 자동으로 **Next.js**가 잡힙니다. 빌드 설정은 그대로 둡니다.

### 3. 환경변수 설정
Import 화면의 **Environment Variables**(또는 배포 후 *Settings → Environment Variables*)에 추가:

| 이름 | 값 |
| --- | --- |
| `TANKERKOENIG_API_KEY` | 1단계에서 받은 키 |

`TANKERKOENIG_MOCK`는 **추가하지 않습니다**(샘플 데이터 모드, 개발용). 저장 후 **Deploy**.
환경변수를 나중에 바꿨다면 *Deployments → 최신 배포 → Redeploy* 해야 반영됩니다.

### 4. 확인
- 배포 주소(예: `https://de-gas-find.vercel.app`)를 아이폰 Safari로 엽니다.
- 상단에 노란 **"샘플 데이터"** 띠가 보이면 키가 설정되지 않은 것입니다 → 3단계 확인.
- "가격 서버에 연결하지 못했어요"가 계속 뜨면 Vercel *Logs*에서 `[tankerkoenig]` 줄을 확인하세요.

### 5. 아이폰 홈 화면에 추가
1. Safari에서 배포 주소 열기 → 하단 **공유 버튼(□↑)**
2. **홈 화면에 추가** → 이름 확인 → **추가**
3. 홈 화면 아이콘으로 열면 주소창 없이 앱처럼 실행됩니다.
4. 처음 "내 주변 가격 보기"를 누를 때 위치 권한을 **허용**하세요.
   거부했다면: *설정 → 개인정보 보호 및 보안 → 위치 서비스 → Safari 웹 사이트 → 앱을 사용하는 동안*.

---

## 로컬 개발

```bash
npm install
cp .env.example .env.local     # TANKERKOENIG_API_KEY 입력, 또는 TANKERKOENIG_MOCK=1
npm run dev                    # http://localhost:3000
```

| 명령 | 내용 |
| --- | --- |
| `npm test` | Vitest 단위 테스트 (브랜드 매핑, 할인, 정렬, 가격 포맷, 응답 파싱, 캐시) |
| `npm run e2e` | Playwright E2E (390×844, 샘플 데이터로 빌드 후 실행): 위치 모킹 → 리스트 → 상세 시트 → 길안내 링크, API 키 미노출, 오프라인, axe 접근성(라이트/다크) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run icons` | PWA 아이콘·iOS 스플래시 재생성 (`scripts/generate-icons.mjs`) |

### 구조

```
src/lib/        tankerkoenig.ts (Zod 스키마·클라이언트), brands.ts (브랜드 정규화·할인 그룹),
                pricing.ts (할인·정렬·가격대), format.ts, geo.ts, nav.ts, cache.ts, geocode.ts, store.ts
src/app/api/    stations · prices · station(영업시간) · geocode — 키 은닉 + 캐시 프록시
src/components/ App(화면 조립), NearbyList, SummaryCard, StationRow, StationSheet, MapView(지연 로딩) …
src/hooks/      useNearby(위치→가격), usePullToRefresh, useClientState
public/sw.js    서비스워커(앱 셸 오프라인, 정적 자산 캐시)
```

### 품질 측정 (로컬, 샘플 데이터)
- Lighthouse 모바일: Performance 82–100 (5회 중앙값 98, 샌드박스 CPU 편차 있음) · Accessibility 100 · Best Practices 100 · SEO 100
- 클라이언트 번들/네트워크 응답에 API 키 없음: 가짜 키로 빌드 후 `.next/static` 검색 + E2E에서 응답 본문 검사

---

## Decisions

문서에 없던 부분은 아래 기본값으로 정했습니다.

- **항상 25km로 조회**: 서버는 반경 칩과 무관하게 25km 결과를 가져오고 클라이언트가 걸러냅니다. 반경 전환이 요청 없이 즉시 바뀌고, 캐시 키가 그리드 셀당 하나라 Tankerkönig 호출도 줄어듭니다.
- **거리는 클라이언트가 계산**: 서버에는 ~1km 그리드로 반올림한 좌표만 보내고(개인정보 + 캐시), 실제 위치 기준 거리는 기기에서 하버사인으로 계산합니다.
- **캐시 2중**: 서버 인메모리 TTL(5분, 동시 요청 병합) + `Cache-Control: s-maxage=300` (Vercel CDN). 캐시 히트여도 `fetchedAt`은 실제 조회 시각을 그대로 내려서 "기준 시각"을 부풀리지 않습니다.
- **"마지막 가격 변경 시각"**: Tankerkönig 무료 API는 주유소별 변경 시각을 주지 않으므로 **조회 시각**을 표시합니다.
- **위치 재요청**: 첫 실행은 반드시 버튼을 눌러야 권한을 요청합니다. 한 번 허용한 사용자에게는 이후 실행 시 버튼 없이 위치를 다시 가져옵니다(iOS 홈 화면 앱은 실행마다 권한을 다시 묻는 경우가 있음). 거부 상태면 자동 요청하지 않고 집 위치로 대체합니다.
- **위치 검색은 Nominatim, 제출형**: 키가 필요 없지만 이용 정책상 자동완성(타이핑 중 검색)이 금지라 검색 버튼/엔터로만 조회하고, 서버에서 초당 1회로 제한 + 24시간 캐시합니다.
- **현재 위치 이름**: Nominatim 역지오코딩으로 "Darmstadt-Bessungen 근처"처럼 표시합니다(그리드 단위 캐시). 실패하면 "현재 위치".
- **가격대 색**: 현재 결과(영업 중)의 33/67 분위수 기준. 색만으로 구분하지 않도록 리스트엔 "최저"·"+2ct" 텍스트, 지도엔 범례와 "최저" 라벨을 함께 둡니다. 최저가와 같은 가격도 "최저"로 표시합니다.
- **영업 종료 주유소**: 리스트 맨 아래 접힌 섹션("영업 종료 n곳 보기"). 영업 중 섹션 제목이 "영업 중 n곳"이라 각 행에 "영업 중"을 반복하지 않습니다.
- **선택한 연료 가격이 없는 주유소**는 리스트에서 빼고 개수를 알려줍니다.
- **절약액**: "평균보다 리터당 x ct · 50L 주유 시 €y 절약". 주유량(기본 50L)은 설정에서 변경.
- **할인 단계**: 0.5ct 단위, 0–15ct.
- **브랜드 매칭**: brand 필드가 비어 있으면 주유소 이름의 *앞부분*으로만 판별합니다("Aralstraße" 같은 오탐 방지).
- **지도 스타일**: OpenFreeMap `positron`(라이트) / `dark`(다크). 지도 라이브러리는 지도 탭을 열 때만 로드(초기 번들 제외). 라벨이 겹치면 싼 곳부터 남기고 나머지는 색 점으로 접고, 확대하면 다시 라벨로 나옵니다.
- **서비스워커는 직접 작성**: Next 16(Turbopack)과 플러그인 호환 리스크를 피했습니다. API 응답은 SW에서 캐시하지 않고, 앱이 마지막 결과를 `localStorage`에 보관해 시각과 함께 보여줍니다.
- **샘플 데이터 모드**: `TANKERKOENIG_MOCK=1`일 때만, 화면에 "샘플 데이터" 띠를 항상 표시. 키가 없으면 조용히 샘플로 넘어가지 않고 오류를 보여줍니다.
- **폰트 셀프 호스팅**: Pretendard(동적 서브셋)·JetBrains Mono를 npm 패키지에서 번들링. 외부 CDN 의존이 없고 오프라인에서도 유지됩니다. 고정폭은 가격에만, 거리·시각은 Pretendard tabular 숫자.
- **포인트 색**: 시그널 블루 하나(상호작용 전용). 저렴(초록)/보통(황토)/비쌈(빨강)은 의미색으로만 사용.

## 2차 기능 조사 (Phase 5, 진행 전 확인 필요)

- **가격 추세**: Tankerkönig는 과거 가격을 PostgreSQL 덤프/CSV(Azure 저장소)로 공개하지만, 라이선스가 **CC BY-NC-SA 4.0**으로 표기된 자료가 있어 API(CC BY 4.0)와 조건이 다를 수 있습니다. 개인 비상업 용도라면 문제없어 보이지만 수 GB 단위 데이터를 가공할 서버/스토리지가 필요합니다. 대안: 앱이 직접 본 가격을 기기에 쌓아 "보통 저녁 7시 이후가 싸요" 같은 단순 패턴만 표시(서버 불필요, 며칠 사용 후부터 의미 있음).
- **경로상 주유**: 키 없는 무료 라우팅은 OSRM 공개 데모 서버뿐인데, 운영용 사용은 권장되지 않습니다. openrouteservice(무료 키, 일일 한도)가 현실적인 선택지입니다.
- **가격 알림**: iOS 16.4+에서 **홈 화면에 추가한 웹앱**만 웹 푸시를 받을 수 있습니다(사용자 동작 후 권한 요청, 매니페스트·서비스워커 필수). 다만 "가격이 x 이하일 때" 알림은 서버가 주기적으로 가격을 확인하고 구독 정보를 저장해야 하므로, 현재의 "서버 DB 없음" 결정과 충돌합니다(Vercel Cron + KV 같은 저장소 필요).
