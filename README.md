<div align="center">
  <img src="./apps/frontend/public/Logo.png" alt="Artune Logo" width="200" />
  <h3>감정에 따른 음원 추천 서비스</h3>
  <p>
    당신의 하루, 당신의 감정을 텍스트로 들려주세요.<br/>
    <strong>AI(OPENAI)</strong>가 분석한 감정에 맞춰 <strong>음악(Spotify + Apple Music)</strong>과 <strong>디저트 아트워크(DALL-E)</strong>를 선물합니다.
  </p>

  <br/>

  <p>
    <img src="https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/NestJS-11.0-E0234E?logo=nestjs&logoColor=white" alt="NestJS">
    <img src="https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite&logoColor=white" alt="Vite">
    <img src="https://img.shields.io/badge/Turborepo-2.6-EF4444?logo=turborepo&logoColor=white" alt="Turborepo">
    <img src="https://img.shields.io/badge/OpenAI-GPT--4.1--mini-412991?logo=openai&logoColor=white" alt="OpenAI">
  </p>
</div>

## 📖 프로젝트 소개

**Artune**은 사용자가 입력한 일기나 짧은 텍스트를 분석하여, 현재 감정 상태에 가장 적합한 음악 플레이리스트와 시각적 즐거움을 주는 픽셀 아트 디저트를 제공하는 웹 서비스입니다.

단순 음악 추천이 아닌 감정을 **더 깊이 느끼고 싶을 때(Immerse)** 와 **전환하고 싶을 때(Soothe)** 두 가지 선택지를 제공합니다.

## 🌟 핵심 기능

- **AI 감정 분석 & 큐레이션**: OpenAI GPT 4.1 mini 모델을 활용해 텍스트의 미묘한 감정선을 분석하고, Spotify API 파라미터(Valence, Energy, Tempo)로 변환합니다.
- **Dual Mode Playlist**:
  - 🎶 **감정 심취 (Immerse)**: 슬플 땐 더 슬픈 음악으로, 기쁠 땐 더 신나는 음악으로 감정을 극대화합니다.
  - 🌿 **감정 완화 (Soothe)**: 격한 감정을 차분하게, 혹은 우울한 기분을 산뜻하게 전환합니다.
- **인터랙티브 음악 청취**:
  - Spotify 메타데이터와 **iTunes Search API**를 결합하여 **30초 미리듣기**를 제공합니다.
  - **CD 바이닐 인터랙션**: 음악 재생 시 CD가 플레이어에 들어가고, 정지 시 **DJ 스크래치 효과(Fade-out & Pitch down)**와 함께 멈추는 디테일한 UX를 구현했습니다.
- **감정 맞춤 Pixel Art**: 감정 키워드와 장르를 조합하여 DALL-E 프롬프트를 생성, 매번 다른 '오늘의 디저트' 픽셀 아트를 제공합니다. (해당 기능은 잠시 정지시켰습니다.)
- **실시간 분석 경험**: Server-Sent Events (SSE)를 도입하여 감정 분석 → 음악 탐색 → 이미지 생성의 진행 상황을 실시간 프로그레스 바로 시각화했습니다.

## 🏗️ 시스템 아키텍처

사용자의 텍스트가 어떻게 음악과 이미지로 변환되는지 보여주는 데이터 흐름도입니다.  
**Server-Sent Events (SSE)** 를 도입하여, 각 단계가 완료될 때마다 클라이언트에게 실시간으로 피드백을 제공합니다.

<p align="center">
  <img src="./docs/system_architecture_diagram.png" width="500"  alt="System Architecture Diagram" style="border: 2px solid black" />
</p>

## 🛠 기술 스택

### Architecture

- **Monorepo**: Turborepo (Frontend/Backend 패키지 통합 관리)
- **Package Manager**: npm Workspaces

### Frontend (`apps/frontend`)

- **Core**: React 19, Vite 7
- **State Management**: Zustand 5 (전역 상태 및 비동기 액션 관리)
- **Styling**: Emotion (CSS-in-JS), Framer Motion (고성능 애니메이션)
- **Testing**: Vitest, React Testing Library

### Backend (`apps/backend`)

- **Core**: NestJS 11 (Module 기반 아키텍처)
- **Language**: JavaScript (Babel Transpilation)
- **External APIs**:
  - **OpenAI Assistant API**: 감정 분석 및 프롬프트 엔지니어링
  - **Spotify Web API**: 트랙 검색 및 오디오 피쳐 분석
  - **iTunes Search API**: 미리듣기 음원(Preview URL) 확보 (Spotify API 제약 보완)
  - **DALL-E API**: 이미지 생성
- **Protocol**: HTTP, SSE (Server-Sent Events)

## 📱 UI/UX 미리보기

|                     감정 입력 및 로딩 (SSE)                      |                         결과 페이지 (PC View)                          |                                    모바일/태블릿 반응형                                     |
| :--------------------------------------------------------------: | :--------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------: |
| <img src="./docs/loading.gif" width="280" alt="Loading Process"> | <img src="./docs/pc_result_page.gif" width="280" alt="PC Result Page"> | <img src="./docs/mobile_result_page.gif" width="125" height="250" alt="Mobile Result Page"> |
|                     실시간 분석 진행률 표시                      |                    아트워크와 플레이리스트 분할 뷰                     |                               토글형 뷰 전환 & 터치 인터랙션                                |

## ⚙️ 설치 및 실행

이 프로젝트는 Turborepo를 사용하고 있습니다. 루트 디렉토리에서 한 번의 명령어로 전체 프로젝트를 실행할 수 있습니다.

### 1. 환경 변수 설정 (.env)

#### Backend (`apps/backend/.env`)

```env
PORT=3000
OPENAI_API_KEY=your_openai_key
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
FRONTEND_URL=http://localhost:5173
```

#### Frontend (`apps/frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 개발 서버 실행 (Frontend + Backend)

```bash
npm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

## 📂 프로젝트 구조

```
artune/
├── apps/
│   ├── backend/              # NestJS Server
│   │   └── src/
│   │       ├── emotion/      # 감정 분석 및 오케스트레이션 (Core)
│   │       ├── spotify/      # 음악 추천 로직 (Diversity 알고리즘 등)
│   │       ├── openai/       # GPT 프롬프트 제어
│   │       └── dalle/        # 이미지 생성
│   └── frontend/             # React Client
│       └── src/
│           ├── components/   # LP Card, Toggle, Visualizer 등
│           ├── hooks/        # useAudioScratch, useAudioPlayer
│           ├── stores/       # Zustand Store
│           └── pages/
├── package.json
└── turbo.json
```

## 💡 주요 기술적 고민

### 1. Spotify 미리듣기 문제 해결 (Spotify vs iTunes)

Spotify Web API가 더 이상 `preview_url`을 안정적으로 제공하지 않는 문제를 해결하기 위해 하이브리드 방식을 채택했습니다.

- **Spotify**: 방대한 메타데이터와 추천 알고리즘 활용.
- **iTunes API**: Spotify에서 추천된 트랙 정보를 바탕으로 iTunes Search API를 병렬 조회하여 미리듣기 음원을 확보.

이를 통해 추천의 **정확도**와 **사용자 경험(미리듣기)** 두 마리 토끼를 잡았습니다.

### 2. 오디오 UX 디테일 (Web Audio API & Interaction)

- 단순한 play/pause가 아닌, 실제 LP판을 멈추는 듯한 경험을 주기 위해 커스텀 훅(`useAudioScratch`)을 구현했습니다.
- 재생 속도(`playbackRate`)와 볼륨을 프레임 단위로 조절하여 Pitch Down & Fade Out 효과를 구현했습니다.
- 탭 전환 시 자동 정지, 메모리 누수 방지를 위한 Cleanup 로직을 철저히 적용했습니다.

### 3. 반응형 디자인과 Glassmorphism

- Emotion을 활용해 세련된 Dark Glassmorphism 테마를 구축했습니다.
- PC에서는 한 화면에 아트워크와 리스트를, 모바일에서는 토글 방식을 적용하여 디바이스별 최적화된 레이아웃을 제공합니다.

## 기여자

- 이세민 ([@smnm1998](https://github.com/smnm1998))
