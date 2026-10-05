// 브라우저 테스트와 같은 테스트를 외부 패키지 없이 실행한다.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({
  console,
  document: {
    getElementById: () => ({ appendChild() {} }),
    createElement: () => ({ style: {} }),
  },
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../site/assign.js'), 'utf8'), context);
const html = fs.readFileSync(path.join(__dirname, 'tests.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInContext(script, context);
process.exitCode = vm.runInContext('failCount', context) ? 1 : 0;
