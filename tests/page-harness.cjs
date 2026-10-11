// DOM과 이미지 로딩을 제어하여 실제 페이지의 비동기 갱신을 검증한다.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

module.exports = function createPageHarness() {
  const site = path.join(__dirname, '../site');
  const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
  class Element {
    constructor(tagName = 'DIV') {
      this.tagName = tagName.toUpperCase();
      this.value = '0';
      this.textContent = '';
      this.hidden = false;
      this.children = [];
      this._html = '';
    }
    get innerHTML() { return this._html; }
    set innerHTML(value) { this._html = value; this.children = []; }
    replaceChildren(...children) { this._html = ''; this.children = children; }
    addEventListener() {}
  }
  const elements = new Map();
  const parseSvg = source => [...source.matchAll(/<(rect|line|text|image)\b([^>]*)(?:\/>|>([\s\S]*?)<\/\1>)/g)].map(([, name, attrs, text]) => {
    const attributes = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key,value]));
    return { localName: name, textContent: text || '', getAttribute: key => attributes[key] ?? null };
  });
  const getElement = id => {
    if (id === 'chart') {
      const source = getElement('chartSource').innerHTML;
      return source ? { children: parseSvg(source) } : null;
    }
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  for (const [, id, value] of html.matchAll(/<input id="([^"]+)"[^>]*value="([^"]+)"/g)) getElement(id).value = value;
  const pending = [];
  const canvases = [];
  class TestImage {
    set src(url) { this.href = url; this.imageId = pending.length; pending.push(this); }
  }
  const createElement = tagName => {
    const element = new Element(tagName);
    if (tagName === 'canvas') {
      element.commands = [];
      const stack = [];
      const record = (name, args, properties = {}) => element.commands.push({name,args,...properties});
      const ctx = {
        save() { stack.push({fillStyle:ctx.fillStyle,strokeStyle:ctx.strokeStyle,lineWidth:ctx.lineWidth,globalAlpha:ctx.globalAlpha}); },
        restore() { Object.assign(ctx,stack.pop()); },
        scale(...args) { element.scale = args; },
        fillRect(...args) { record('fillRect', args, {color:ctx.fillStyle}); },
        beginPath() { record('beginPath', []); },
        closePath() { record('closePath', []); },
        moveTo(...args) { record('moveTo', args); },
        lineTo(...args) { record('lineTo', args); },
        arcTo(...args) { record('arcTo', args); },
        fill() { record('fill', [], {color:ctx.fillStyle}); },
        stroke() { record('stroke', [], {color:ctx.strokeStyle,width:ctx.lineWidth,alpha:ctx.globalAlpha}); },
        fillText(...args) { record('fillText', args, {color:ctx.fillStyle,font:ctx.font,align:ctx.textAlign}); },
        drawImage(image, ...args) { record('drawImage', args, {imageId:image.imageId}); },
      };
      element.getContext = () => ctx;
      // 이미지 인코딩만 대체한다. 실제 직렬화와 캔버스 호출, Promise는 페이지 코드를 실행한다.
      element.toDataURL = () => 'data:image/png;base64,' + Buffer.from(JSON.stringify(element.commands)).toString('base64');
      canvases.push(element);
    }
    return element;
  };
  const context = vm.createContext({
    console, Date, window: {}, navigator: { userAgent: '' },
    document: { getElementById: getElement, querySelectorAll: () => [], createElement },
    Image: TestImage,
  });
  for (const file of ['assign.js', 'emoji-assets.js']) vm.runInContext(fs.readFileSync(path.join(site, file), 'utf8'), context);
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  const finish = async (image, error) => {
    if (error) image.onerror(); else image.onload();
    await new Promise(resolve => setImmediate(resolve));
  };
  return { context, getElement, pending, canvases, finish, html };
};
