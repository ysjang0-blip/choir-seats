// 찬양대 좌석 구조 (고정)
const LEFT_CAPS = [12, 12, 12, 12, 12]; // 왼쪽 블록: 소프라노(왼쪽)·알토(오른쪽)
const RIGHT_CAPS = [6, 8, 9, 9];        // 오른쪽 블록: 베이스(왼쪽)·테너(오른쪽)

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

if (typeof module !== "undefined") {
  module.exports = { LEFT_CAPS, RIGHT_CAPS, distributeToRows, rebalance, assignSeats };
}
