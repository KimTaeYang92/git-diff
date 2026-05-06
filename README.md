# 🚀 AI PR Summarizer for Non-Developers

개발자의 복잡한 코드 변경 사항(Git Diff)을 분석하여 **비개발자(운영팀, 기획자, QA)가 이해하기 쉬운 리포트**로 자동 요약해주는 GitHub Action입니다. 대상 브랜치에 따라 맞춤형 페르소나(QA 매니저, PM)를 제공합니다.

---

## ✨ 주요 기능

*   **🔍 비개발자 친화적 요약:** 어려운 기술 용어를 화면 기능과 비즈니스 가치 중심으로 번역하여 설명합니다.
*   **🧪 맞춤형 검증 가이드 (QA):** QA 브랜치로의 PR일 경우, 비개발자가 따라 할 수 있는 상세 테스트 시나리오와 영향 범위를 안내합니다.
*   **🚀 운영 업데이트 리포트 (OP):** 운영/운영 브랜치로의 PR일 경우, 사용자 가치와 운영 시 주의사항 중심으로 요약합니다.
*   **⚙️ 유연한 브랜치 매핑:** Regex 패턴 설정을 통해 프로젝트마다 다른 브랜치 전략(qa, test, prod, main 등)에 완벽히 대응합니다.
*   **🧠 컨텍스트 기반 추론:** PR 제목, 본문(Description), 커밋 메시지, 전체 Diff를 종합 분석하여 정확도를 높였습니다.

---

## 🛠️ 시작하기 (Quick Start)

이 액션을 사용하려는 **프로젝트 저장소**에서 아래 설정을 진행하세요.

### 1. GitHub Secrets 설정
저장소의 **Settings > Secrets and variables > Actions** 메뉴에서 다음 값을 추가합니다.
*   `OPENAI_API_KEY`: [OpenAI API Key](https://platform.openai.com/api-keys)를 입력합니다.
*   `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급받은 키를 입력합니다.

### 2. 워크플로우 파일 생성
`.github/workflows/pr-summary.yml` 파일을 생성하고 아래 내용을 복사하여 붙여넣습니다.

```yaml
name: AI PR Summary

on:
  pull_request:
    # 요약 리포트를 받고 싶은 대상 브랜치들을 지정하세요.
    branches: [main, master, qa, test, op]
    types: [opened, synchronize]

jobs:
  summarize:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write # PR에 댓글을 달기 위해 필요합니다.
      contents: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Generate AI Report
        uses: KimTaeYang92/git-diff@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
          # (선택 사항) OpenAI를 사용하고 싶다면 아래 주석을 해제하세요.
          # openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          # ai-provider: 'openai'
```

---

## ⚙️ 입력값 (Inputs)

| 입력값 | 필수 여부 | 기본값 | 설명 |
| :--- | :---: | :--- | :--- |
| `ai-provider` | No | `auto` | 사용할 AI 엔진 선택 (`openai`, `gemini`, `auto`). `auto` 설정 시 Gemini가 우선 선택됩니다. |
| `github-token` | Yes | - | `${{ secrets.GITHUB_TOKEN }}` 를 사용하세요. |
| `openai-api-key` | No | - | OpenAI API 키 (선택 사항) |
| `gemini-api-key` | No | - | Google Gemini API 키 (선택 사항) |
| `qa-branch-pattern` | No | `qa\|test` | QA용 리포트를 생성할 대상 브랜치 정규식 패턴 |
| `op-branch-pattern` | No | `main\|master\|op\|prod` | 운영용 리포트를 생성할 대상 브랜치 정규식 패턴 |
| `openai-model` | No | `gpt-5.2-mini` | 사용할 OpenAI 모델명 |
| `gemini-model` | No | `gemini-3-flash-preview` | 사용할 Gemini 모델명 |

---

## 📝 리포트 예시

### 🧪 QA 브랜치 적용 시 (검증 가이드)
> **# 🧪 [운영/QA 검증 가이드] 장바구니 결제 로직 수정**
> 
> **🔎 1. 어떤 기능이 수정되었나요?**
> - **기존:** 결제 버튼 클릭 시 간헐적으로 무한 로딩 발생
> - **변경:** API 응답 지연 시 재시도 로직을 추가하여 멈춤 현상 해결
> 
> **🛠 2. 이렇게 테스트해보세요!**
> 1. 장바구니에 상품을 담고 결제 페이지로 이동합니다.
> 2. 결제하기 버튼을 누르고 3초 이내에 다음 화면으로 넘어가는지 확인합니다.

### 🚀 운영 브랜치 적용 시 (서비스 리포트)
> **# 🚀 [운영 업데이트 리포트] 장바구니 안정성 개선**
> 
> **👤 운영자님, 이 기능이 바뀌었어요!**
> 
> **🎯 무엇이 좋아졌나요?**
> - 결제 과정에서 화면이 멈추는 불편함을 해소하여 고객의 이탈을 방지했습니다.

---

## 🤝 기여하기
이 액션의 핵심 로직이나 프롬프트를 수정하고 싶다면 `src/prompt.js`를 수정한 후 `npm run build`를 통해 `dist/index.js`를 갱신해야 합니다.
