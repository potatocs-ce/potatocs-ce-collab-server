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
