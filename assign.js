// 찬양대 좌석 구조 (고정)
const LEFT_CAPS = [12, 12, 12, 12, 12]; // 왼쪽 블록: 소프라노(왼쪽)·알토(오른쪽)
const RIGHT_CAPS = [8, 10, 12, 14];     // 오른쪽 블록: 베이스(왼쪽)·테너(오른쪽), 뒤로 갈수록 넓어지는 사다리꼴

// count명을 모든 줄에 최대한 균등하게 나눈다. 나머지는 앞줄부터 1명씩 추가.
// 좌석 수가 작은 줄이 정원을 넘으면 여유가 가장 큰 줄로 넘긴다.
function distributeToRows(count, capacities) {
  const n = capacities.length;
  const base = Math.floor(count / n), rem = count % n;
  const rows = capacities.map((c, i) => base + (i < rem ? 1 : 0));
  let guard = 200;
  while (guard-- > 0) {
    const over = rows.findIndex((v, i) => v > capacities[i]);
    if (over === -1) break;
    let best = -1, bestFree = 0;
    capacities.forEach((c, i) => {
      const free = c - rows[i];
      if (free > bestFree) { bestFree = free; best = i; }
    });
    if (best === -1) break; // 전체 정원 초과 — assignSeats에서 미리 걸러짐
    rows[over]--; rows[best]++;
  }
  return rows;
}

// 그림과 같은 비율로 줄의 폭 부담을 계산하기 위한 상수 (index.html의 SEAT, R과 동일)
const SEAT_W = 38, PERSON_R = 15;

// 두 파트를 합친 줄별 목표 인원.
// 지그재그에서 줄이 차지하는 폭은 (인원-1)칸(끝에 바짝 붙는 줄) 또는
// (인원-0.5)칸(반 칸 물러나는 줄)이다. 한 명씩, 추가해도 폭 부담(필요 폭/의자 폭)이
// 가장 작은 줄에 넣는다(동률이면 앞줄부터). 그래야 간격을 최대한 벌려 의자를 채울 수 있다.
// flushParity: 끝에 바짝 붙는 줄의 홀짝 (왼쪽 블록 0 = 1·3·5줄, 오른쪽 블록 1 = 2·4줄)
function fillTargets(count, capacities, flushParity) {
  const inner = capacities.map(c => c * SEAT_W - PERSON_R * 2);
  const rows = capacities.map(() => 0);
  for (let k = 0; k < count; k++) {
    let best = -1, bestLoad = Infinity;
    capacities.forEach((cap, i) => {
      if (rows[i] >= cap) return;
      const d = rows[i] + 1 - (i % 2 === flushParity ? 1 : 0.5);
      const load = d / inner[i];
      if (load < bestLoad - 1e-9) { bestLoad = load; best = i; }
    });
    rows[best]++;
  }
  return rows;
}

// 두 파트(a, b)의 줄별 합계를 목표(targets)에 맞춘다.
// 합계가 넘치는 줄에서 모자란 줄로 1명씩 옮기되,
// 그 줄에 더 많이 앉은 파트(동률이면 a)에서 옮긴다. a, b를 직접 수정한다.
function balanceToTargets(a, b, targets) {
  let guard = 500;
  while (guard-- > 0) {
    const over = targets.findIndex((t, i) => a[i] + b[i] > t);
    const under = targets.findIndex((t, i) => a[i] + b[i] < t);
    if (over === -1 || under === -1) return;
    if (a[over] >= b[over]) { a[over]--; a[under]++; }
    else { b[over]--; b[under]++; }
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
  balanceToTargets(sop, alto, fillTargets(counts.soprano + counts.alto, LEFT_CAPS, 0));
  const bass = distributeToRows(counts.bass, RIGHT_CAPS);
  const tenor = distributeToRows(counts.tenor, RIGHT_CAPS);
  balanceToTargets(bass, tenor, fillTargets(counts.bass + counts.tenor, RIGHT_CAPS, 1));

  return {
    ok: true,
    left: LEFT_CAPS.map((c, i) => ({ capacity: c, soprano: sop[i], alto: alto[i] })),
    right: RIGHT_CAPS.map((c, i) => ({ capacity: c, bass: bass[i], tenor: tenor[i] })),
  };
}

if (typeof module !== "undefined") {
  module.exports = { LEFT_CAPS, RIGHT_CAPS, distributeToRows, fillTargets, balanceToTargets, assignSeats };
}
