// 실제 화면의 SVG 생성 함수를 실행해 좌석 위치와 팔걸이 기준 인원 표시를 검증한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.join(__dirname, '../site');
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
const { context } = require('./page-harness.cjs')();

const render = counts => vm.runInContext(`renderChart(assignSeats(${JSON.stringify(counts)}))`, context);
const images = svg => [...svg.matchAll(/<image data-part="(\w+)" x="([^"]+)" y="([^"]+)" width="32"/g)]
  .map(([, part, x, y]) => ({ part, x: Number(x) + 16, y: Number(y) + 16 }));

// 생성된 SVG에서 실제 좌석 위치와 숫자가 일치하는지 확인한다.
for (const [soprano, alto] of [[26,14], [29,17], [32,17], [33,17], [34,17], [0,0], [0,4], [5,0], [0,60], [60,0], [31,29]]) {
  const counts = {soprano, alto, bass:11, tenor:12};
  const svg = render(counts);
  const seats = images(svg);
  assert.match(svg, /width="1370" height="965"/);
  assert.match(svg, /width="1370" height="965" fill="#ffffff"/);
  assert.equal(seats.filter(s => s.part === 'soprano').length, soprano);
  assert.equal(seats.filter(s => s.part === 'alto').length, alto);
  assert.equal(seats.filter(s => s.part === 'bass').length, 11);
  assert.equal(seats.filter(s => s.part === 'tenor').length, 12);
  const rows = JSON.parse(vm.runInContext(`JSON.stringify(assignSeats(${JSON.stringify(counts)}).left)`, context));
  const halfRows = [];
  rows.forEach((row, i) => {
    const cy = 20 + (4-i) * 126 + 23;
    const left = seats.filter(s => s.y === cy && (s.part === 'soprano' || s.part === 'alto'));
    const n = row.soprano + row.alto;
    assert.equal(left.length, n);
    const rightCount = left.filter(s => s.x > 326).length;
    const leftCount = left.filter(s => s.x < 326).length;
    assert.equal(rightCount, Math.ceil(n/2), `${soprano}/${alto} ${i+1}줄 좌우 균등`);
    assert.ok(Math.abs(rightCount - leftCount) <= 1, '좌우 인원 쏠림');
    left.forEach((s,k) => {
      assert.ok(s.x >= 113 - 1e-8 && s.x <= 539 + 1e-8, '의자 밖 좌석');
      assert.ok(s.x <= 307 + 1e-8 || s.x >= 345 - 1e-8, '팔걸이 위 좌석');
      if (k) assert.ok(s.x - left[k-1].x >= 32 - 1e-8, '얼굴 겹침');
    });
    halfRows.push({left:left.filter(s => s.x < 326),right:left.filter(s => s.x > 326)});
    const crossed = left.filter(s => s.part === 'soprano' && s.x > 326).length;
    const centralText = [...svg.matchAll(/<text x="326" y="([^"]+)" text-anchor="middle"[^>]*>(\d+)<\/text>/g)]
      .find(([, y]) => Math.abs(Number(y) - (20 + (4-i)*126 + 46 + 40 + 92*0.35)) < 1e-8);
    assert.equal(centralText ? Number(centralText[2]) : 0, crossed, '팔걸이 오른쪽 소프라노 숫자');
  });
  const gapRow = halfRows.flatMap(row => [row.left,row.right]).find(half => half.length > 1);
  const gap = gapRow ? gapRow[1].x - gapRow[0].x : null;
  halfRows.forEach((row, i) => {
    for (const [side, half] of Object.entries(row)) {
      if (!half.length) continue;
      for (let k=1; k<half.length; k++) assert.ok(Math.abs(half[k].x-half[k-1].x-gap)<1e-8, '양쪽 반줄 공통 간격');
      if (soprano + alto < 50) {
        if (side === 'left' && i % 2 === 1) assert.ok(Math.abs(half.at(-1).x-307)<1e-8, '왼쪽 짝수 줄은 중앙 경계에 붙음');
        if (side === 'right' && i % 2 === 0) assert.ok(Math.abs(half[0].x-345)<1e-8, '오른쪽 홀수 줄은 중앙 경계에 붙음');
        if (gap !== null) {
          const offset=side==='left' ? 307-half.at(-1).x : half[0].x-345;
          const shifted=side==='left' ? i%2===0 : i%2===1;
          assert.ok(Math.abs(offset-(shifted?gap/2:0))<1e-8, `${side} ${i+1}줄 반 칸 지그재그`);
        }
      } else {
        const center=side==='left'?210:442;
        assert.ok(Math.abs((half[0].x+half.at(-1).x)/2-center)<1e-8, '50명 이상은 반줄 가운데 정렬');
      }
    }
  });
  if (soprano === 26 && alto === 14 && process.env.CHOIR_PREVIEW_PATH) {
    fs.writeFileSync(process.env.CHOIR_PREVIEW_PATH, svg);
  }
}

// 모든 가능한 줄 인원에서도 균등 배분과 좌석/팔걸이 범위를 지킨다.
for (let total = 0; total <= 60; total++) {
  const svg = render({soprano:total,alto:0,bass:0,tenor:0});
  images(svg).forEach(s => assert.ok(s.x >= 113 - 1e-8 && s.x <= 539 + 1e-8));
}

// 페이지의 밝은 색상 설정은 PNG 저장에 들어가지 않는다.
assert.match(html, /<meta name="color-scheme" content="light">/);
assert.match(html, /color-scheme:\s*only light/);
assert.match(html, /\.inputs input\s*\{[^}]*background:\s*#fff;[^}]*color:\s*#302d27;/);
assert.match(html, /const scale = 2;/);
assert.match(html, /canvas\.width = CHART_W \* scale;/);
assert.match(html, /canvas\.height = CHART_H \* scale;/);
console.log('SVG RENDER CHECKS PASSED (26/14, 29/17, 49/50/51, bilateral zigzag, bounds, part counts, boundary labels, PNG format)');
