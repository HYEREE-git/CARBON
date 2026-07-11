# Reproduction package — "The 'Non-EU Sandwich' in Global Carbon Governance: Production–Consumption Gaps and CBAM Exposure"

익명 심사용 재현 패키지 (Anonymized reproduction package for peer review).
본 저장소는 원고의 국가군 서술 통계(표 A7·A8, 그림 3–5), 보조 회귀 진단, 그리고
부록 A9의 강건성 검증(A9.1–A9.6) 전체를 재현한다.

## 구성

```
data/
  country_panel_48.csv      48개국 × 6개 시점(1995–2019) PBE·CBE·GDP 패널 + 그룹 라벨,
                            2019년 1인당 GDP·제조업 비중, EU 여부
code/
  01_reproduce_group_stats.py   표 A7(무역위치 시계열)·표 A8(기간별 Tapio DI)·
                                그림 4(장기 DI Gap)·Box 1(한국·대만) 재현
  02_robustness_A9.py           부록 A9.1–A9.6 강건성 검증 전체 재현
  03_make_figures.py            그림 3·4·5 데이터 기반 재현
output/                     스크립트 실행 결과 (CSV·PNG)
```

## 실행

```bash
pip install -r requirements.txt
python code/01_reproduce_group_stats.py
python code/02_robustness_A9.py
python code/03_make_figures.py
```

각 스크립트는 실행 말미에 원고 게재 수치와의 자동 대조(`[OK]`/`[Δ!!]`)를 출력한다.
순열검정(A9.1)은 `seed=20260711`로 고정되어 있어 결과(경험적 p=0.302)가 완전 재현된다.

## 데이터 출처 및 파생 방법

| 변수 | 원천 | 비고 |
|---|---|---|
| PBE·CBE (MtCO2e) | OECD Greenhouse Gas Footprint Indicators (DSD_ICIO_GHG_TRADE_2023) | 1995·2000·2005·2010·2015·2019 |
| GDP (실질, 백만 2017 USD) | Penn World Table 10.0, `rgdpna` | 대만 포함 |
| 1인당 GDP (2019) | Penn World Table 10.0 | 그룹 정의 조건 (ii) |
| 제조업 비중 (2019) | World Development Indicators; 대만은 DGBAS | 그룹 정의 조건 (iii)의 제조업 기준 |

파생 변수 정의:
- 무역위치 = (PBE − CBE) / PBE  (그룹 값은 국가군 합산 PBE·CBE 기준)
- Tapio DI = (ΔE/E₀) / (ΔGDP/GDP₀), DI Gap = DI_PBE − DI_CBE
- long-period DI Gap은 1995→2019 단일 기간으로 산정 (그룹 값은 합산 기준)

그림 1·2(GVC 위치)는 PWT 10.0 `csh_x`(수출의존도)와 1995년 제조업 비중(WDI/UN NA/BEA)
등 추가 원천이 필요하며 본 패키지 범위 밖이다(원고 그림 캡션에 원천 명기).
그림 6–8(CBAM 부문 노출)은 OECD 양자·부문 내재배출 자료(동일 DSD) 기반이다.

## 재현 범위 주의사항

- 표 A5의 Model 1–3(통제변수 포함 사양)은 저자 마스터 데이터의 전체 공변량이 필요하다.
  본 패키지의 `02_robustness_A9.py`는 부록 A9가 명시한 진단 사양(이변량 그룹 더미,
  HC1)을 재현하며, A9에 게재된 모든 수치와 일치함을 자동 대조로 확인한다.
- 모든 결과는 진단적(diagnostic) 참고 지표로 제시되며, 원고 본문의 해석 지위
  (확증적 증거 아님)를 따른다.

## License

Code: MIT (Anonymous Authors). Derived data: 원천 데이터베이스(OECD, PWT, World Bank)의
각 이용약관을 따르며, 여기에는 파생·가공된 수치만 포함한다.
