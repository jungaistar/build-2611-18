// 로그인 설정 — 이 파일 한 곳만 바꾸면 된다(생성: build-2611-00/tools/kit/apply-kit.mjs, 대문 문구 출처 docs/plan.json).
// 내 Supabase 로 옮길 때: url · anonKey 를 내 프로젝트 값으로, 카카오를 설정하지 않았으면 kakao: false. 안내 = docs/내_깃허브로_옮기기.md
// prefix 는 supabase/auth.sql 의 표 이름 앞부분과 같아야 한다.
window.AUTH_CONFIG = {
  "url": "https://hcmgdztsgjvzcyxyayaj.supabase.co",
  "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbWdkenRzZ2p2emN5eHlheWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzU4ODcsImV4cCI6MjA4NzAxMTg4N30.gznaPzY1l8qDAPsEyYNR9KS7f7VqS3xaw-_2HTSwSZw",
  "prefix": "build261118",
  "kakao": true,
  "idleMinutes": 30,
  "localBypass": true,
  "board": true,
  "site": {
    "title": "굴착기 인양력 비교 · 시각화",
    "summary": "자사 · 경쟁사 굴착기 인양력 표준 CSV(19열)를 올리면 옵션별로 걸러 전방 · 측방 인양력을 2D · 3D 로 비교하고, 기준 모델 대비 차이(%)와 엑셀 자료를 만드는 브라우저 도구입니다. 기획자가 Python(Streamlit)으로 만든 V6 프로그램을 설치 없이 쓰는 웹 판으로 옮겼습니다.",
    "course": "생성형 AI 업무자동화 전문가과정 · 2차수",
    "features": [
      {
        "name": "표준 CSV 읽기",
        "desc": "CSV · 엑셀 여러 개를 이어 붙이고, 못 읽은 줄은 위치와 이유를 알립니다."
      },
      {
        "name": "옵션별 거르기",
        "desc": "제조사 · 모델 · 블레이드 · 붐/암 · 캐빈 · 슈 · CW 를 눌러 같은 조건끼리 비교합니다."
      },
      {
        "name": "2D 비교",
        "desc": "고른 높이에서 반경에 따른 전방 · 측방 인양력 곡선. 기준 모델은 별 표식입니다."
      },
      {
        "name": "3D 비교",
        "desc": "반경 × 높이 × 인양력을 한 그림에 놓고 끌어서 돌려 봅니다."
      },
      {
        "name": "기준 대비 차이표",
        "desc": "지정 반경의 인양력과 차이(%). 사이 반경은 「추정」으로 표시합니다."
      },
      {
        "name": "AI 자동정리 변환",
        "desc": "AI 가 읽은 JSON 을 검증해 단위 · 표기를 맞춘 표준 CSV 로 바꿉니다."
      }
    ],
    "steps": [
      "데이터 올리기",
      "표준화",
      "조건 고르기",
      "2D · 3D",
      "기준 대비 차이",
      "내려받기"
    ],
    "flow": [
      {
        "step": "데이터 올리기",
        "desc": "표준 CSV · 엑셀"
      },
      {
        "step": "표준화",
        "desc": "머리글 찾기 · 숫자 · 별표 · 대소문자"
      },
      {
        "step": "조건 고르기",
        "desc": "필터 · 곡선 · 기준 · 높이"
      },
      {
        "step": "2D · 3D",
        "desc": "전방 · 측방 곡선"
      },
      {
        "step": "기준 대비 차이",
        "desc": "보간은 추정 표시"
      },
      {
        "step": "내려받기",
        "desc": "엑셀 · CSV · 인쇄"
      }
    ],
    "goals": [
      "표준 CSV 만 올리면 옵션별 필터 · 2D/3D 비교 · 기준 대비 차이표가 바로 나옵니다.",
      "값을 지어내지 않습니다 — 빈 칸은 빈 칸, 사이 반경은 「추정」 표시, 범위 밖은 값 없음.",
      "경쟁사 표 이미지를 AI 로 읽은 결과(JSON)를 검증해 표준 CSV 로 바꿉니다(API 키 없이)."
    ],
    "screen": "docs/img/screen.png",
    "plan": "plan.html",
    "home": true,
    "guide": {
      "screens": [
        {
          "name": "1. 데이터",
          "desc": "표준 CSV · 엑셀 올리기, 예제, 표준 양식 내려받기"
        },
        {
          "name": "2. 비교 조건",
          "desc": "제조사 · 모델 · 블레이드 · 붐/암 · 캐빈 · 슈 · CW 거르기, 곡선 표시 · 색 · 기준 모델, 높이"
        },
        {
          "name": "3. 2D 비교",
          "desc": "고른 높이에서 반경에 따른 전방 · 측방 인양력 곡선"
        },
        {
          "name": "4. 기준 대비 차이",
          "desc": "지정 반경의 인양력과 차이(%), 사이 반경은 추정 표시, 엑셀 · CSV · 인쇄"
        },
        {
          "name": "5. 3D 비교",
          "desc": "반경 × 높이 × 인양력, 끌어서 회전"
        },
        {
          "name": "6. AI 자동정리",
          "desc": "AI 가 읽은 JSON 을 검증해 표준 CSV 로 변환"
        }
      ],
      "data": [
        {
          "name": "표준 행(19열)",
          "fields": "Manufacturer · Model · Machine Type · Boom Length (m) · Boom opt · Arm Length (m) · Arm opt · Cabin Type · Shoe Type · Counterweight (kg) · weight class · CW opt · Blade up/down · Radius (m) · Height (m) · Front · Side Lifting Capacity (ton) · Operating Weight · notes"
        },
        {
          "name": "곡선",
          "fields": "같은 사양(제조사 · 모델 · 붐 · 암 · 캐빈 · 슈 · CW · 블레이드)의 행 묶음"
        },
        {
          "name": "AI 추출 JSON",
          "fields": "case(1~6) · defaults · notes · cells[radius · height · 단위 · front/front_down/front_up/side · side_scope · 옵션]"
        }
      ],
      "rules": [
        "표준 머리글은 이름으로 찾습니다. Model · Radius (m) · Height (m) 과 Front · Side 중 하나가 없으면 읽지 않습니다.",
        "빈 칸은 0 이 아니라 값 없음입니다. Model 이 비었거나 반경 · 높이가 숫자가 아닌 줄은 건너뛰고 위치와 이유를 알립니다.",
        "같은 사양(제조사 · 모델 · 붐 · 암 · 캐빈 · 슈 · CW · 블레이드)이 한 곡선입니다. 곡선 이름에는 그 모델 안에서 달라지는 항목만 붙입니다.",
        "기본 높이는 0m, 없으면 0 에 가장 가까운 높이입니다.",
        "차이(%) = (값 − 기준) ÷ 기준 × 100. 기준 값이 없으면 차이를 내지 않습니다.",
        "데이터에 없는 사이 반경은 직선 보간이며 「추정」으로 표시합니다. 범위 밖 반경은 값을 만들지 않습니다(바깥으로 늘리지 않음).",
        "별표(*)는 숫자에서 떼어 notes 의 STAR_FRONT=1 · STAR_SIDE=1 로 보존합니다.",
        "AI JSON 변환: kg ÷ 1,000 · kN ÷ 9.80665 · lbs ÷ 2,204.62 → ton, mm ÷ 1,000 · cm ÷ 100 · ft ÷ 3.2808 → m. 단위가 적혀 있지 않으면 변환하지 않고 알립니다.",
        "AI JSON 변환: front_down · front_up 이 있으면 블레이드 내림 · 올림 두 행으로 나누고, 측방은 side_scope(both · up · down)에 맞는 행에만 넣습니다."
      ],
      "limits": [
        "이미지를 직접 올려 AI 로 읽는 기능은 없습니다(API 키를 브라우저 도구에 넣지 않기 위해). 이미지 인식은 쓰시는 AI 서비스에서 하고 결과 JSON 을 붙여 넣습니다.",
        "엑셀 파일 안에 차트 그림을 만들지 않습니다. Front Data · Side Data 시트에서 범위를 잡아 차트를 넣으면 됩니다.",
        "3D 는 곡선 다발로 그립니다(면을 칠한 Surface 가 아님).",
        "올린 데이터는 창을 닫으면 사라집니다. 서버 저장 · 공동 편집은 없습니다.",
        "예제는 가상 모델 값입니다. 실제 장비 비교에는 실제 표준 CSV 를 올려야 합니다."
      ],
      "users": [
        "굴착기 설계 · 제품기획 담당 엔지니어",
        "경쟁사 벤치마킹 자료를 보고받는 팀장"
      ],
      "flow": [
        {
          "step": "데이터 올리기",
          "desc": "표준 CSV · 엑셀"
        },
        {
          "step": "표준화",
          "desc": "머리글 찾기 · 숫자 · 별표 · 대소문자"
        },
        {
          "step": "조건 고르기",
          "desc": "필터 · 곡선 · 기준 · 높이"
        },
        {
          "step": "2D · 3D",
          "desc": "전방 · 측방 곡선"
        },
        {
          "step": "기준 대비 차이",
          "desc": "보간은 추정 표시"
        },
        {
          "step": "내려받기",
          "desc": "엑셀 · CSV · 인쇄"
        }
      ]
    },
    "landing": {
      "slides": [
        {
          "image": "images/slide-1.jpg"
        },
        {
          "image": "images/slide-2.jpg"
        },
        {
          "image": "images/slide-3.jpg"
        }
      ],
      "heroMode": "slide"
    }
  }
};
