const assert = require('node:assert/strict');
const vm = require('node:vm');
const createPageHarness = require('./page-harness.cjs');

module.exports = (async () => {
  const { context, getElement, pending, canvases, finish } = createPageHarness();
  const preview = () => getElement('chartWrap').children[0];
  const update = (soprano, alto, bass = 11, tenor = 12) => {
    for (const [part, value] of Object.entries({soprano, alto, bass, tenor})) getElement(part).value = String(value);
    vm.runInContext('runAssign()', context);
    return pending.at(-1);
  };

  await Promise.all(pending.map(image => finish(image)));
  assert.equal(preview().tagName, 'IMG');
  assert.match(preview().src, /^data:image\/png;base64,/);
  assert.match(getElement('chartSource').innerHTML, /<svg id="chart"/);
  assert.match(preview().alt, /소프라노 26명/);

  // PNG 변환 완료 순서를 바꿔 늦은 이미지가 최신 배치를 덮지 않는지 확인한다.
  const conversions = [];
  context.testConvert = () => new Promise((resolve,reject) => conversions.push({resolve,reject}));
  vm.runInContext('svgToPngDataUrl = testConvert', context);
  const tick = () => new Promise(resolve => setImmediate(resolve));
  update(26,14);
  const old = conversions.at(-1);
  update(29,17);
  const latest = conversions.at(-1);
  latest.resolve('data:image/png;base64,latest');
  await tick();
  const latestUrl = preview().src;
  assert.match(preview().alt, /소프라노 29명, 알토 17명/);
  old.resolve('data:image/png;base64,old');
  await tick();
  assert.equal(preview().src, latestUrl);

  // 정원 초과 상태에 늦게 도착한 이미지가 다시 나타나지 않는다.
  update(26,14);
  const valid = conversions.at(-1);
  update(999,14);
  assert.equal(getElement('chartWrap').children.length, 0);
  assert.equal(getElement('chartSource').innerHTML, '');
  assert.equal(getElement('saveBtn').hidden, true);
  const error = getElement('error').textContent;
  valid.resolve('data:image/png;base64,valid');
  await tick();
  assert.equal(getElement('chartWrap').children.length, 0);
  assert.equal(getElement('error').textContent, error);

  // 실패 안내 후 다음 정상 입력에서 복구된다.
  update(26,14);
  conversions.at(-1).reject(new Error('test failure'));
  await tick();
  assert.match(getElement('error').textContent, /배치도를 표시하지 못했어요/);
  vm.runInContext('svgToPngDataUrl = window.__testPng', context);
  update(26,14);
  await tick();
  assert.equal(getElement('error').textContent, '');
  assert.equal(getElement('saveBtn').hidden, false);
  assert.match(preview().alt, /소프라노 26명, 알토 14명/);

  // 화면 미리보기와 PNG 저장은 동일한 원본 SVG와 변환 경로를 사용한다.
  const saved = vm.runInContext('window.__testPng()', context);
  assert.equal(await saved, preview().src);
  assert.equal(pending.length, 4, '네 종류 얼굴 이미지를 재사용해야 함');
  assert.ok(pending.every(image => image.href.startsWith('data:image/png;')), 'SVG 이미지 디코딩 없이 PNG만 로딩');
  canvases.forEach(canvas => {
    assert.equal(canvas.width, 2740);
    assert.equal(canvas.height, 1930);
    assert.deepEqual(canvas.scale, [2,2]);
    assert.deepEqual(canvas.commands[0], {name:'fillRect',args:[0,0,1370,965],color:'#fffaf4'});
    const labels = canvas.commands.filter(command => command.name === 'fillText');
    assert.ok(labels.some(command => command.color === '#168DDF'), '소프라노 원래 파랑');
    assert.ok(labels.some(command => command.color === '#D66A12'), '알토 원래 오렌지');
    assert.ok(labels.some(command => command.color === '#D83232'), '베이스 원래 빨강');
    assert.ok(labels.some(command => command.color === '#292929'), '테너 원래 검정');
    assert.equal(canvas.commands.filter(command => command.name === 'drawImage').length, labels.some(command => command.args[0] === '총원 63명') ? 67 : 68);
  });

  // 얼굴 로딩 실패를 캐시에 남기지 않아 정상 입력에서 다시 시도할 수 있다.
  const retry = createPageHarness();
  const failed = retry.pending[0];
  await retry.finish(failed, true);
  await Promise.all(retry.pending.slice(1).map(image => retry.finish(image)));
  assert.match(retry.getElement('error').textContent, /얼굴 이미지 로딩 실패/);
  vm.runInContext('runAssign()', retry.context);
  assert.equal(retry.pending.length, 5);
  await retry.finish(retry.pending.at(-1));
  assert.equal(retry.getElement('chartWrap').children[0].tagName, 'IMG');
  assert.equal(retry.getElement('error').textContent, '');
  console.log('PNG PREVIEW CHECKS PASSED (literal colors, initial render, rapid updates, invalid input, recovery, export parity)');
})();
