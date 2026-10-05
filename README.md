# 찬양대 자리배치

[서비스 열기](https://ysjang0-blip.github.io/choir-seats/)

소프라노·알토·테너·베이스 인원을 입력하면 자리배치가 즉시 표시됩니다. PNG 저장과 휴대폰 공유를 지원합니다.

## 로컬 또는 Codex 클라우드에서 작업

GitHub 저장소 `ysjang0-blip/choir-seats`의 `main` 브랜치를 선택합니다. 별도의 설치나 비밀키는 필요 없습니다.

```sh
node tests/run.cjs
python3 -m http.server 8000
```

화면: `http://localhost:8000/site/index.html`
브라우저 테스트: `http://localhost:8000/tests/tests.html`

최신 규칙은 `AGENTS.md`에 있습니다. `docs/superpowers/`의 초기 설계는 과거 기록이며 최신 규칙보다 우선하지 않습니다.

## 배포

GitHub Pages는 기존 `gh-pages` 브랜치 루트를 사용합니다. `main`을 수정한 것만으로 웹페이지가 배포되지는 않습니다. 배포 요청 시 `site/`의 파일을 gh-pages 루트로 복사해 커밋·푸시하고 공개 URL을 확인합니다. 소스와 테스트는 gh-pages에 복사하지 않습니다.

클라우드에서 수정 후 PR(변경 내용을 검토하는 요청)을 만들고 main에 반영하면 다음 작업에서도 변경 내용을 이어서 사용할 수 있습니다.
