# 배포 가이드 (무료 호스팅)

이 프로젝트는 **React(Vite) + Node(Express) API** 한 덩어리로 배포합니다.  
빌드 후 `dist` 정적 파일과 `/api` 를 같은 서버가 제공합니다.

## 1. GitHub에 올리기

```bash
git add -A
git commit -m "배포 설정 및 기능 업데이트"
git push origin main
```

## 2. Render.com (무료, 추천)

1. [Render](https://render.com) 가입 → **New** → **Blueprint** 또는 **Web Service**
2. GitHub 저장소 `Redpillar/MyOtherHalf` 연결
3. 저장소 루트의 `render.yaml` 이 있으면 Blueprint로 자동 설정됩니다.
4. 수동 설정 시:
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
5. 환경 변수:
   - `ADMIN_PASSWORD` — 관리자 로그인 비밀번호 (반드시 강한 값으로 설정)
   - (선택) `VITE_NAVER_MAPS_CLIENT_ID` — 네이버 지도 사용 시, **빌드 시** 필요하면 Render의 Environment에 추가 후 재배포

배포 URL 예: `https://myotherhalf.onrender.com`

> 무료 플랜은 15분 미사용 시 슬립 후 첫 접속이 느릴 수 있습니다.  
> `server/data/` 는 git에 없어서, 재배포·재시작 시 회원/공지 등 **로컬 JSON 데이터는 초기화**될 수 있습니다.

## 3. 관리자 접속

- URL: `https://<배포도메인>/admin`
- 비밀번호: Render에 설정한 `ADMIN_PASSWORD` (설정 안 하면 기본 `admin123` — 운영에서는 반드시 변경)

## 4. 로컬에서 프로덕션 모드 확인

```bash
npm run build
npm start
# http://localhost:8787
```
