# Potatocs 서버

Potatocs 서버는 개발, 스테이징, 프로덕션 등 다양한 환경을 지원하도록 설계된 Node.js 기반 백엔드 애플리케이션입니다. API 엔드포인트를 제공하고, 정적 파일을 서빙하며, MongoDB에 연결하여 데이터를 관리합니다. 또한, CORS를 처리하며 S3 및 SES와 같은 선택적 AWS 서비스와 통합할 수 있습니다.

---

## 목차

-   [설치](#설치)
-   [환경 설정](#환경-설정)
-   [사용 가능한 스크립트](#사용-가능한-스크립트)
-   [기능](#기능)
-   [폴더 구조](#폴더-구조)
-   [CORS 구성](#cors-구성)
-   [에러 처리](#에러-처리)
-   [라이선스](#라이선스)

---

## 설치

1. 리포지토리 클론:

    ```bash
    git clone <repository-url>
    ```

2. 프로젝트 디렉토리로 이동:

    ```bash
    cd <project-folder>
    ```

3. 종속성 설치:

    ```bash
    npm install
    ```

4. 필요한 환경 변수를 설정합니다 ([환경 설정](#환경-설정) 참조).

---

## 환경 설정

서버는 여러 환경(개발, 스테이징, 프로덕션)을 지원합니다. `/env` 디렉토리 내에 적절한 `.env` 파일을 구성하세요:

### `.env` 파일 예시:

```env
PORT=3000
LISTEN_ADDRESS=0.0.0.0
MODE=development
VERSION=1.0.0
whiteBoardFolderName=white_board
AWS_ACCESS_KEY=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=<your-region>
AWS_S3_BUCKET=<your-bucket-name>
```

-   `/env`에 `.env` 파일을 `dev.env`, `prod.env`, `staging.env`와 같은 이름으로 배치합니다.
-   `NODE_ENV`를 사용하여 활성 환경(`production`, `development`, `staging`)을 지정합니다.

---

## 사용 가능한 스크립트

### 서버 시작

현재 환경에서 애플리케이션을 실행:

```bash
npm start
```

### 개발 모드

개발 모드에서 애플리케이션 실행:

```bash
npm run dev
```

### 프로덕션 모드

프로덕션 모드에서 애플리케이션 실행:

```bash
npm run prod
```

### 테스트 모드

테스트 실행(가능한 경우):

```bash
npm test
```

---

## 기능

### CORS 구성

애플리케이션은 특정 출처에서의 교차 출처 요청을 허용하도록 구성되어 있습니다. 허용된 출처는 다음과 같습니다:

-   `http://localhost:4200`
-   `http://localhost:4300`
-   `https://potatocs.com`
-   `https://test-potatocs.com`
-   기타 지정된 IP 기반 출처

### MongoDB 통합

서버는 커스텀 모듈(`./database/mongoDB`)을 사용하여 MongoDB 인스턴스에 연결합니다.

### 정적 파일 서빙

-   클라이언트 파일을 `/dist/client`에서 서빙합니다.
-   업로드 파일을 `/uploads`에서 서빙합니다.
-   정적 자산을 `/asset/icons`에서 서빙합니다.
-   화이트보드 관련 파일은 구성된 `whiteBoardFolderPath`에서 서빙됩니다.

### AWS 통합 (선택 사항)

서버는 다음과 같은 AWS 서비스와 통합할 수 있습니다:

-   **S3**: 파일 저장소
-   **SES**: 이메일 발송

AWS 서비스의 구성은 현재 주석 처리되어 있으며, `.env`에 필요한 자격 증명을 제공하고 코드에서 관련 섹션의 주석 처리를 해제하여 활성화할 수 있습니다.

---

## 폴더 구조

```
|-- dist/
|   |-- client/                 # 프론트엔드 빌드 출력물
|-- env/                        # 환경 설정 파일
|-- uploads/                    # 업로드된 파일
|-- asset/                      # 정적 자산 (아이콘 등)
|-- database/
|   |-- mongoDB.js              # MongoDB 연결 설정
|-- routes/
|   |-- api/
|       |-- v1/                 # API 버전 1 라우트
|-- app.js                      # 메인 애플리케이션 진입점
```

---

## CORS 구성

서버는 `cors` 미들웨어를 사용하여 허용된 출처 및 헤더를 제한합니다. 교차 출처 요청을 위한 자격 증명도 허용됩니다. 허용된 출처 목록을 수정하려면 코드에서 `allowedOrigins` 배열을 업데이트하세요.
