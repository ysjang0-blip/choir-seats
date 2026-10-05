# 찬양대 자리배치 웹페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 파트별 인원수 4개를 입력하면 좌석 배치도(사람 1명 = 색깔 원 1개)를 그려 주고 PNG로 저장할 수 있는 정적 웹페이지.

**Architecture:** 순수 계산 로직(`assign.js`)과 화면(`index.html`)을 분리한 정적 사이트. 배치도는 SVG로 그리고, SVG→Canvas→PNG 변환으로 이미지 저장. 서버·빌드 도구 없음.

**Tech Stack:** HTML + CSS + Vanilla JavaScript, SVG. 테스트는 브라우저에서 실행하는 `tests/tests.html`(자체 러너). 로컬 확인은 `python -m http.server`.

## Global Constraints

- 외부 라이브러리·CDN 사용 금지 (모든 코드 자체 포함)
- 화면의 모든 문구는 한국어
- Node.js 없음 → 테스트는 `tests/tests.html`을 브라우저(Chrome 자동화)로 열어 확인
- 로컬 서버: 프로젝트 루트에서 `python -m http.server 8000` (백그라운드 실행 유지)
- 파트 색상 고정: 소프라노 `#E15759`, 알토 `#EDC948`, 베이스 `#4E79A7`, 테너 `#59A14F`
- 좌석 구조 고정: 왼쪽 블록 5줄×12석(소프라노 왼쪽/알토 오른쪽), 오른쪽 블록 5·7·9·11석(베이스 왼쪽/테너 오른쪽)
- 배치도 방향: 지휘자(정면)가 찬양대를 바라본 모습 기준. 화면에 이 기준을 명시한다
- SVG는 CSS 클래스가 아닌 **속성(fill/stroke)으로 직접 스타일** 지정 (PNG 변환 시 스타일 유실 방지)
- 커밋 메시지는 한국어, 마지막 줄에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## 파일 구조

- `site/assign.js` — 배치 계산 로직 (화면과 무관한 순수 함수)
- `site/index.html` — 입력 화면 + SVG 배치도 + PNG 저장 (배포 시 `site` 폴더만 올림)
- `tests/tests.html` — 계산 로직 자동 테스트 (브라우저 실행)
- `docs/superpowers/specs/2026-08-06-choir-seats-design.md` — 설계서 (작성 완료)

---

### Task 1: 프로젝트 준비 + 줄 배분 함수 `distributeToRows`

**Files:**
- Create: `site/assign.js`
- Create: `tests/tests.html`

**Interfaces:**
- Produces: `distributeToRows(count, capacities)` → 줄별 인원 배열.
  예: `distributeToRows(22, [12,12,12,12,12])` → `[5,5,4,4,4]`
- Produces: `tests/tests.html`의 테스트 러너 `test(name, fn)`, `assertEqual(actual, expected, msg)` — 이후 태스크의 테스트도 이 파일에 추가
- Produces: 상수 `LEFT_CAPS = [12,12,12,12,12]`, `RIGHT_CAPS = [5,7,9,11]`

배분 규칙: 줄 좌석 수에 **비례** 배분(왼쪽 블록은 좌석 수가 같으므로 자동으로 균등 배분이 됨). 소수점 이하는 버리고, 남는 인원은 소수점이 큰 줄부터(동률이면 앞줄부터) 1명씩 추가 — 왼쪽 블록에서는 "나머지는 앞줄부터"와 동일한 결과.

- [ ] **Step 1: git 저장소 초기화 및 기존 문서 커밋**

```powershell
git init; git add 찬양대의자.txt docs; git commit -m "찬양대 자리배치 설계서 및 좌석 구조 추가"
```
(커밋 메시지 마지막 줄에 Co-Authored-By 트레일러 포함 — 이후 모든 커밋 동일)

- [ ] **Step 2: 테스트 러너와 실패하는 테스트 작성**

`tests/tests.html` 생성:

```html
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>자리배치 로직 테스트</title></head>
<body>
<h1>테스트 결과</h1>
<ul id="results" style="font-family:monospace"></ul>
<script src="../site/assign.js"></script>
<script>
const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, pass: true }); }
  catch (e) { results.push({ name, pass: false, error: e.message }); }
}
function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg || ""} 기대값 ${b}, 실제 ${a}`);
}
function assertTrue(cond, msg) { if (!cond) throw new Error(msg || "조건이 거짓"); }

// ---- Task 1: distributeToRows ----
test("20명을 12석 5줄에 균등 배분", () =>
  assertEqual(distributeToRows(20, LEFT_CAPS), [4, 4, 4, 4, 4]));
test("22명은 나머지 2명이 앞줄부터 추가", () =>
  assertEqual(distributeToRows(22, LEFT_CAPS), [5, 5, 4, 4, 4]));
test("0명이면 모든 줄 0명", () =>
  assertEqual(distributeToRows(0, LEFT_CAPS), [0, 0, 0, 0, 0]));
test("60명이면 모든 줄 만석", () =>
  assertEqual(distributeToRows(60, LEFT_CAPS), [12, 12, 12, 12, 12]));
test("오른쪽 블록 16명은 줄 크기에 비례 배분", () =>
  assertEqual(distributeToRows(16, RIGHT_CAPS), [3, 4, 4, 5]));
test("오른쪽 블록 11명 비례 배분", () =>
  assertEqual(distributeToRows(11, RIGHT_CAPS), [2, 2, 3, 4]));
test("어떤 줄도 좌석 수를 넘지 않음", () => {
  for (let n = 0; n <= 32; n++) {
    const rows = distributeToRows(n, RIGHT_CAPS);
    assertEqual(rows.reduce((a, b) => a + b, 0), n, `합계(${n}명)`);
    rows.forEach((r, i) => assertTrue(r <= RIGHT_CAPS[i], `${n}명일 때 ${i + 1}줄 초과`));
  }
});

// ---- 결과 출력 ----
const ul = document.getElementById("results");
let failCount = 0;
for (const r of results) {
  const li = document.createElement("li");
  li.textContent = (r.pass ? "PASS " : "FAIL ") + r.name + (r.error ? " — " + r.error : "");
  li.style.color = r.pass ? "green" : "red";
  if (!r.pass) failCount++;
  ul.appendChild(li);
}
console.log(failCount === 0 ? "ALL TESTS PASSED (" + results.length + ")" : failCount + " TESTS FAILED");
</script>
</body>
</html>
```

`site/assign.js`는 빈 파일로 생성.

- [ ] **Step 3: 테스트가 실패하는지 확인**

```powershell
python -m http.server 8000   # 백그라운드로 실행, 이후 태스크에서 계속 사용
```
Chrome 자동화로 `http://localhost:8000/tests/tests.html` 열기 → 콘솔에 `TESTS FAILED` 또는 `distributeToRows is not defined` 오류 확인 (실패가 정상).

- [ ] **Step 4: `distributeToRows` 구현**

`site/assign.js`:

```javascript
// 찬양대 좌석 구조 (고정)
const LEFT_CAPS = [12, 12, 12, 12, 12]; // 왼쪽 블록: 소프라노(왼쪽)·알토(오른쪽)
const RIGHT_CAPS = [5, 7, 9, 11];       // 오른쪽 블록: 베이스(왼쪽)·테너(오른쪽)

// count명을 줄 좌석 수(capacities)에 비례해 배분한다.
// 나머지는 소수점이 큰 줄부터(동률이면 앞줄부터) 1명씩 추가.
function distributeToRows(count, capacities) {
  const total = capacities.reduce((a, b) => a + b, 0);
  const ideal = capacities.map(c => (count * c) / total);
  const rows = ideal.map(Math.floor);
  const remainder = count - rows.reduce((a, b) => a + b, 0);
  const order = ideal
    .map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < remainder; k++) rows[order[k].i] += 1;
  return rows;
}

if (typeof module !== "undefined") {
  module.exports = { LEFT_CAPS, RIGHT_CAPS, distributeToRows };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Chrome 자동화로 테스트 페이지 새로고침 → 콘솔에 `ALL TESTS PASSED` 확인.

- [ ] **Step 6: 커밋**

```powershell
git add site/assign.js tests/tests.html; git commit -m "줄 배분 함수 distributeToRows 추가"
```

---

### Task 2: 전체 배치 함수 `assignSeats` (+ 줄 초과 재배분)

**Files:**
- Modify: `site/assign.js`
- Modify: `tests/tests.html` (테스트 추가)

**Interfaces:**
- Consumes: `distributeToRows`, `LEFT_CAPS`, `RIGHT_CAPS` (Task 1)
- Produces: `assignSeats({soprano, alto, tenor, bass})` →
  - 성공: `{ ok: true, left: [{capacity, soprano, alto} ×5], right: [{capacity, bass, tenor} ×4] }`
  - 실패: `{ ok: false, errors: [문자열, ...] }`
- Produces: `rebalance(a, b, capacities)` — 두 파트 줄별 배열을 받아 줄 정원 초과를 여유 있는 줄로 이동시켜 해소 (배열을 직접 수정)

두 파트를 각각 비례 배분하면 반올림 때문에 한 줄이 정원을 1~2명 넘을 수 있다(예: 소프라노 31 + 알토 29 → 1줄이 13명). 블록 전체 정원 이내라면 반드시 배치 가능하므로, 초과 줄에서 여유가 가장 큰 줄로 한 명씩 옮겨 해소한다.

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/tests.html`의 Task 1 테스트 아래에 추가:

```javascript
// ---- Task 2: assignSeats ----
function rowTotalsOk(result) {
  result.left.forEach((row, i) =>
    assertTrue(row.soprano + row.alto <= row.capacity, `왼쪽 ${i + 1}줄 정원 초과`));
  result.right.forEach((row, i) =>
    assertTrue(row.bass + row.tenor <= row.capacity, `오른쪽 ${i + 1}줄 정원 초과`));
}
function partSum(rows, part) { return rows.reduce((a, r) => a + r[part], 0); }

test("기본 배치: 인원 합계와 줄 정원 준수", () => {
  const r = assignSeats({ soprano: 20, alto: 15, tenor: 8, bass: 10 });
  assertTrue(r.ok, "ok여야 함");
  assertEqual(partSum(r.left, "soprano"), 20);
  assertEqual(partSum(r.left, "alto"), 15);
  assertEqual(partSum(r.right, "tenor"), 8);
  assertEqual(partSum(r.right, "bass"), 10);
  rowTotalsOk(r);
});
test("반올림으로 줄이 넘치는 경우 재배분 (소프라노31+알토29)", () => {
  const r = assignSeats({ soprano: 31, alto: 29, tenor: 0, bass: 0 });
  assertTrue(r.ok, "ok여야 함");
  assertEqual(partSum(r.left, "soprano"), 31);
  assertEqual(partSum(r.left, "alto"), 29);
  rowTotalsOk(r);
});
test("오른쪽 블록 만석 (베이스16+테너16)", () => {
  const r = assignSeats({ soprano: 0, alto: 0, tenor: 16, bass: 16 });
  assertTrue(r.ok, "ok여야 함");
  assertEqual(partSum(r.right, "bass"), 16);
  assertEqual(partSum(r.right, "tenor"), 16);
  rowTotalsOk(r);
});
test("왼쪽 블록 정원 초과는 오류", () => {
  const r = assignSeats({ soprano: 35, alto: 26, tenor: 0, bass: 0 });
  assertTrue(!r.ok, "실패해야 함");
  assertTrue(r.errors.length === 1 && r.errors[0].includes("소프라노"), "오류 문구");
});
test("음수·소수 인원은 오류", () => {
  assertTrue(!assignSeats({ soprano: -1, alto: 0, tenor: 0, bass: 0 }).ok);
  assertTrue(!assignSeats({ soprano: 1.5, alto: 0, tenor: 0, bass: 0 }).ok);
});
test("전원 0명도 정상 동작", () => {
  const r = assignSeats({ soprano: 0, alto: 0, tenor: 0, bass: 0 });
  assertTrue(r.ok, "ok여야 함");
  rowTotalsOk(r);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Chrome 자동화로 테스트 페이지 새로고침 → `assignSeats is not defined` 계열 FAIL 확인.

- [ ] **Step 3: `rebalance`와 `assignSeats` 구현**

`site/assign.js`의 `distributeToRows` 아래에 추가:

```javascript
// 한 줄에 두 파트 합이 정원을 넘으면, 여유가 가장 큰 줄로 한 명씩 옮긴다.
// 그 줄에 더 많이 앉은 파트(동률이면 a)에서 옮긴다. a, b를 직접 수정한다.
function rebalance(a, b, capacities) {
  let guard = 200;
  while (guard-- > 0) {
    const over = capacities.findIndex((c, i) => a[i] + b[i] > c);
    if (over === -1) return;
    let best = -1, bestFree = 0;
    capacities.forEach((c, i) => {
      const free = c - a[i] - b[i];
      if (free > bestFree) { bestFree = free; best = i; }
    });
    if (best === -1) return; // 전체 정원 초과 — assignSeats에서 미리 걸러짐
    if (a[over] >= b[over]) { a[over]--; a[best]++; }
    else { b[over]--; b[best]++; }
  }
}

function assignSeats(counts) {
  const errors = [];
  const names = { soprano: "소프라노", alto: "알토", tenor: "테너", bass: "베이스" };
  for (const key of Object.keys(names)) {
    const v = counts[key];
    if (!Number.isInteger(v) || v < 0) {
      errors.push(`${names[key]} 인원수는 0 이상의 정수로 입력해 주세요.`);
    }
  }
  if (errors.length === 0) {
    const leftCap = LEFT_CAPS.reduce((a, b) => a + b, 0);   // 60
    const rightCap = RIGHT_CAPS.reduce((a, b) => a + b, 0); // 32
    if (counts.soprano + counts.alto > leftCap) {
      errors.push(`좌석이 부족합니다: 소프라노+알토 ${counts.soprano + counts.alto}명 (왼쪽 블록 최대 ${leftCap}명)`);
    }
    if (counts.bass + counts.tenor > rightCap) {
      errors.push(`좌석이 부족합니다: 베이스+테너 ${counts.bass + counts.tenor}명 (오른쪽 블록 최대 ${rightCap}명)`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const sop = distributeToRows(counts.soprano, LEFT_CAPS);
  const alto = distributeToRows(counts.alto, LEFT_CAPS);
  rebalance(sop, alto, LEFT_CAPS);
  const bass = distributeToRows(counts.bass, RIGHT_CAPS);
  const tenor = distributeToRows(counts.tenor, RIGHT_CAPS);
  rebalance(bass, tenor, RIGHT_CAPS);

  return {
    ok: true,
    left: LEFT_CAPS.map((c, i) => ({ capacity: c, soprano: sop[i], alto: alto[i] })),
    right: RIGHT_CAPS.map((c, i) => ({ capacity: c, bass: bass[i], tenor: tenor[i] })),
  };
}
```

`module.exports`에 `rebalance, assignSeats` 추가.

- [ ] **Step 4: 테스트 통과 확인**

Chrome 자동화로 새로고침 → 콘솔 `ALL TESTS PASSED` 확인.

- [ ] **Step 5: 커밋**

```powershell
git add site/assign.js tests/tests.html; git commit -m "전체 배치 함수 assignSeats와 줄 초과 재배분 추가"
```

---

### Task 3: 입력 화면 + SVG 배치도

**Files:**
- Create: `site/index.html`

**Interfaces:**
- Consumes: `assignSeats` (Task 2). `<script src="assign.js">`로 로드
- Produces: `renderChart(result)` → SVG 마크업 문자열. `id="chart"`인 `<svg viewBox="0 0 1000 400">` — Task 4의 PNG 변환이 이 id와 viewBox를 사용

그리기 규칙:
- 사람 1명 = 원 1개 (반지름 15), 파트 색상은 Global Constraints의 고정 색상
- 빈 좌석 = 점선 윤곽의 빈 원
- 긴 의자 = 둥근 모서리 사각형 (`fill="#f5efe3" stroke="#c9bda5"`)
- 맨 앞줄이 위. 상단에 "▲ 앞 (지휘자석) — 지휘자가 바라본 방향" 표기
- 왼쪽 블록은 왼쪽 정렬 5줄, 오른쪽 블록은 블록 중심 기준 가운데 정렬 4줄(부채꼴)
- 아래 범례: 파트별 색 원 + 이름 + 인원수
- SVG 스타일은 전부 속성으로 지정 (CSS 클래스 금지)

- [ ] **Step 1: `site/index.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>찬양대 자리배치</title>
<style>
  body { font-family: "Malgun Gothic", sans-serif; margin: 0 auto; padding: 16px; max-width: 720px; background: #fafafa; }
  h1 { font-size: 22px; text-align: center; }
  .inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
  .inputs label { display: flex; flex-direction: column; font-size: 14px; gap: 4px; }
  .inputs input { font-size: 20px; padding: 8px; border: 1px solid #ccc; border-radius: 8px; width: 100%; box-sizing: border-box; }
  button { width: 100%; font-size: 18px; padding: 12px; border: 0; border-radius: 8px; background: #4E79A7; color: #fff; margin-bottom: 8px; cursor: pointer; }
  button.secondary { background: #59A14F; }
  #error { color: #c0392b; font-weight: bold; white-space: pre-line; margin: 8px 0; }
  #chartWrap svg { width: 100%; height: auto; background: #fff; border: 1px solid #eee; border-radius: 8px; }
  .note { font-size: 12px; color: #888; text-align: center; }
</style>
</head>
<body>
<h1>찬양대 자리배치</h1>
<div class="inputs">
  <label>소프라노 <input id="soprano" type="number" min="0" inputmode="numeric" placeholder="0"></label>
  <label>알토 <input id="alto" type="number" min="0" inputmode="numeric" placeholder="0"></label>
  <label>테너 <input id="tenor" type="number" min="0" inputmode="numeric" placeholder="0"></label>
  <label>베이스 <input id="bass" type="number" min="0" inputmode="numeric" placeholder="0"></label>
</div>
<button id="assignBtn">배치하기</button>
<button id="saveBtn" class="secondary" hidden>이미지로 저장</button>
<div id="error"></div>
<div id="chartWrap"></div>
<p class="note">배치도는 지휘자가 찬양대를 바라본 방향 기준입니다.</p>
<script src="assign.js"></script>
<script>
const COLORS = { soprano: "#E15759", alto: "#EDC948", bass: "#4E79A7", tenor: "#59A14F" };
const NAMES = { soprano: "소프라노", alto: "알토", tenor: "테너", bass: "베이스" };
const SEAT = 38, R = 15, BENCH_H = 46, ROW_GAP = 12, TOP = 50, PAD = 8;
const LEFT_X = 20;                       // 왼쪽 블록 시작 x
const RIGHT_CENTER = 759;                // 오른쪽 블록 중심 x

function seatCircle(cx, cy, color) {
  return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${color}" stroke="#00000022"/>`;
}
function emptySeat(cx, cy) {
  return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#d0d0d0" stroke-dasharray="3 3"/>`;
}
// 한 줄: leftPart는 왼쪽 끝부터, rightPart는 오른쪽 끝부터 채운다
function rowSvg(x, y, cap, leftPart, leftN, rightPart, rightN) {
  const w = cap * SEAT + PAD * 2;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${BENCH_H}" rx="10" fill="#f5efe3" stroke="#c9bda5"/>`;
  for (let k = 0; k < cap; k++) {
    const cx = x + PAD + k * SEAT + SEAT / 2, cy = y + BENCH_H / 2;
    if (k < leftN) s += seatCircle(cx, cy, COLORS[leftPart]);
    else if (k >= cap - rightN) s += seatCircle(cx, cy, COLORS[rightPart]);
    else s += emptySeat(cx, cy);
  }
  return s;
}

function renderChart(result) {
  const counts = {
    soprano: result.left.reduce((a, r) => a + r.soprano, 0),
    alto: result.left.reduce((a, r) => a + r.alto, 0),
    bass: result.right.reduce((a, r) => a + r.bass, 0),
    tenor: result.right.reduce((a, r) => a + r.tenor, 0),
  };
  let s = `<svg id="chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400">`;
  s += `<rect x="0" y="0" width="1000" height="400" fill="#ffffff"/>`;
  s += `<text x="500" y="30" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#666">▲ 앞 (지휘자석)</text>`;
  result.left.forEach((row, i) => {
    const y = TOP + i * (BENCH_H + ROW_GAP);
    s += rowSvg(LEFT_X, y, row.capacity, "soprano", row.soprano, "alto", row.alto);
  });
  result.right.forEach((row, i) => {
    const y = TOP + i * (BENCH_H + ROW_GAP);
    const w = row.capacity * SEAT + PAD * 2;
    s += rowSvg(RIGHT_CENTER - w / 2, y, row.capacity, "bass", row.bass, "tenor", row.tenor);
  });
  const legendY = TOP + 5 * (BENCH_H + ROW_GAP) + 20;
  ["soprano", "alto", "bass", "tenor"].forEach((part, i) => {
    const x = 40 + i * 240;
    s += `<circle cx="${x}" cy="${legendY}" r="13" fill="${COLORS[part]}"/>`;
    s += `<text x="${x + 22}" y="${legendY + 7}" font-family="sans-serif" font-size="22" fill="#333">${NAMES[part]} ${counts[part]}명</text>`;
  });
  return s + `</svg>`;
}

document.getElementById("assignBtn").addEventListener("click", () => {
  const num = id => Number(document.getElementById(id).value || 0);
  const result = assignSeats({ soprano: num("soprano"), alto: num("alto"), tenor: num("tenor"), bass: num("bass") });
  const errorEl = document.getElementById("error");
  const wrap = document.getElementById("chartWrap");
  const saveBtn = document.getElementById("saveBtn");
  if (!result.ok) {
    errorEl.textContent = result.errors.join("\n");
    wrap.innerHTML = "";
    saveBtn.hidden = true;
    return;
  }
  errorEl.textContent = "";
  wrap.innerHTML = renderChart(result);
  saveBtn.hidden = false;
});
</script>
</body>
</html>
```

- [ ] **Step 2: 화면 동작 확인 (Chrome 자동화)**

`http://localhost:8000/site/index.html` 열고:
1. 소프라노 20, 알토 15, 테너 8, 베이스 10 입력 → 배치하기 → 스크린샷으로 확인:
   왼쪽 5줄에 빨강+노랑 원, 오른쪽 4줄(부채꼴)에 파랑+초록 원, 빈 좌석은 점선 원, 범례 인원수 정확
2. 소프라노 35, 알토 26 → "좌석이 부족합니다" 빨간 문구, 배치도 없음
3. 콘솔 오류 없음 확인
4. 창 크기를 휴대폰 폭(390px)으로 줄여 스크린샷 → 입력칸 2열, 배치도 가로 스크롤 없이 표시

- [ ] **Step 3: 커밋**

```powershell
git add site/index.html; git commit -m "입력 화면과 SVG 자리배치도 추가"
```

---

### Task 4: PNG 이미지 저장

**Files:**
- Modify: `site/index.html`

**Interfaces:**
- Consumes: `id="chart"` SVG, `viewBox 1000×400` (Task 3), `#saveBtn` 버튼
- Produces: `svgToPngDataUrl()` → Promise<string> (`data:image/png...`). 테스트용으로 `window.__testPng = svgToPngDataUrl` 노출

- [ ] **Step 1: 저장 기능 구현**

Task 3 스크립트의 `assignBtn` 리스너 아래에 추가:

```javascript
function svgToPngDataUrl() {
  return new Promise((resolve, reject) => {
    const svg = document.getElementById("chart");
    if (!svg) return reject(new Error("배치도가 없습니다"));
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = 2; // 카톡 공유용 고해상도
      const canvas = document.createElement("canvas");
      canvas.width = 1000 * scale;
      canvas.height = 400 * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지 변환 실패")); };
    img.src = url;
  });
}
window.__testPng = svgToPngDataUrl;

document.getElementById("saveBtn").addEventListener("click", async () => {
  try {
    const dataUrl = await svgToPngDataUrl();
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.download = `자리배치_${today}.png`;
    a.href = dataUrl;
    a.click();
  } catch (e) {
    document.getElementById("error").textContent = "이미지 저장 중 문제가 생겼어요: " + e.message;
  }
});
```

- [ ] **Step 2: 동작 확인 (Chrome 자동화)**

배치 실행 후 javascript_tool로:
```javascript
window.__testPng().then(u => console.log("PNG OK", u.slice(0, 22), u.length > 10000));
```
콘솔에 `PNG OK data:image/png;base64 true` 확인. 콘솔 오류 없음 확인.

- [ ] **Step 3: 커밋**

```powershell
git add site/index.html; git commit -m "배치도 PNG 이미지 저장 기능 추가"
```

---

### Task 5: 배포 준비 및 최종 확인

**Files:**
- 없음 (확인·안내만)

- [ ] **Step 1: 전체 테스트 최종 실행**

Chrome 자동화로 `http://localhost:8000/tests/tests.html` → `ALL TESTS PASSED` 확인.

- [ ] **Step 2: 실사용 시나리오 확인**

`site/index.html`에서 실제 상황 값(예: 소프라노 18, 알토 14, 테너 7, 베이스 9) 입력 → 배치도 스크린샷을 사용자에게 보여주고 확인받기.

- [ ] **Step 3: 사용자 배포 안내**

사용자에게 안내 (사용자가 직접 수행):
1. https://app.netlify.com/drop 접속 (무료 가입 필요 — 이메일만 있으면 됨)
2. 탐색기에서 `C:\project\choir_seats\site` 폴더를 페이지에 끌어다 놓기
3. 생성된 `https://○○○.netlify.app` 주소를 휴대폰에서 열어 확인
4. 주소를 즐겨찾기/카톡 나에게 보내기로 저장

- [ ] **Step 4: 마무리 커밋**

```powershell
git add -A; git commit -m "찬양대 자리배치 웹페이지 완성"
```

---

## 검증 방법 (전체)

1. `tests/tests.html` — 배치 로직 자동 테스트 전부 PASS
2. `site/index.html` — 정상 입력/정원 초과/0명 입력 각각 화면 확인 (Chrome 자동화 스크린샷)
3. 휴대폰 폭(390px) 화면에서 레이아웃 확인
4. PNG 변환 함수가 유효한 `data:image/png` 반환
5. Netlify 배포 후 휴대폰 실기기에서 사용자 최종 확인
