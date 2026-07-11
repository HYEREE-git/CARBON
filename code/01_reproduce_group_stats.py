# -*- coding: utf-8 -*-
"""
01_reproduce_group_stats.py
────────────────────────────────────────────────────────────────────
논문 본문·부록의 국가군 단위 서술 통계를 원 패널에서 재현한다.

재현 대상
  - 표 A7 : 국가군별 (PBE−CBE)/PBE 상대 격차, 6개 시점 (1995–2019)
  - 표 A8 : 국가군별 기간별 Tapio 탈동조화 지수 (PBE·CBE 기준)
  - 그림 4 : 국가군별 long-period DI Gap (1995–2019)
  - 그림 3·5 좌표 : 탄소집약도(PBE/GDP), 무역위치, DI Gap
  - Box 1 : 한국·대만 하위 기간별 DI Gap 및 상관계수

입력 : data/country_panel_48.csv
출력 : output/table_A7_positions.csv, output/table_A8_DI.csv,
       output/fig4_long_DIgap.csv, output/box1_korea_taiwan.csv
실행 : python code/01_reproduce_group_stats.py
"""
import os
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
df = pd.read_csv(os.path.join(ROOT, "data", "country_panel_48.csv"))

YEARS = [1995, 2000, 2005, 2010, 2015, 2019]
PERIODS = list(zip(YEARS[:-1], YEARS[1:]))

# ── 국가군 합산 ────────────────────────────────────────────────
agg = df.groupby("group")[[c for c in df.columns if c.startswith(("PBE_", "CBE_", "GDP_"))]].sum()

# 표 A7 : (PBE−CBE)/PBE 상대 격차
A7 = pd.DataFrame({y: (agg[f"PBE_{y}"] - agg[f"CBE_{y}"]) / agg[f"PBE_{y}"] for y in YEARS})
A7 = A7.round(3)

# 표 A8 : 기간별 Tapio DI (배출 변화율 / GDP 변화율), PBE·CBE 기준
def tapio(e0, e1, g0, g1):
    return ((e1 - e0) / e0) / ((g1 - g0) / g0)

A8_rows = {}
for basis in ("PBE", "CBE"):
    for g in agg.index:
        A8_rows[(g, basis)] = {
            f"{y0}–{y1}": tapio(agg.loc[g, f"{basis}_{y0}"], agg.loc[g, f"{basis}_{y1}"],
                                agg.loc[g, f"GDP_{y0}"], agg.loc[g, f"GDP_{y1}"])
            for y0, y1 in PERIODS
        }
A8 = pd.DataFrame(A8_rows).T.round(3)
A8.index.names = ["group", "basis"]

# 그림 4 : long-period DI Gap (1995–2019)
def long_di_gap(row_pbe95, row_pbe19, row_cbe95, row_cbe19, g95, g19):
    return tapio(row_pbe95, row_pbe19, g95, g19) - tapio(row_cbe95, row_cbe19, g95, g19)

fig4 = pd.Series({
    g: long_di_gap(agg.loc[g, "PBE_1995"], agg.loc[g, "PBE_2019"],
                   agg.loc[g, "CBE_1995"], agg.loc[g, "CBE_2019"],
                   agg.loc[g, "GDP_1995"], agg.loc[g, "GDP_2019"])
    for g in agg.index
}).round(3).sort_values(ascending=False)


# Box 1 : 한국·대만 하위 기간별 DI Gap 및 상관계수
box1 = {}
for code, label in (("KOR", "Korea"), ("TWN", "Taiwan")):
    r = df.set_index("code").loc[code]
    box1[label] = {
        f"{y0}–{y1}": round(
            tapio(r[f"PBE_{y0}"], r[f"PBE_{y1}"], r[f"GDP_{y0}"], r[f"GDP_{y1}"])
            - tapio(r[f"CBE_{y0}"], r[f"CBE_{y1}"], r[f"GDP_{y0}"], r[f"GDP_{y1}"]), 3)
        for y0, y1 in PERIODS
    }
    box1[label]["long (1995–2019)"] = round(
        long_di_gap(r["PBE_1995"], r["PBE_2019"], r["CBE_1995"], r["CBE_2019"],
                    r["GDP_1995"], r["GDP_2019"]), 3)
box1 = pd.DataFrame(box1)
r_sub = box1.iloc[:5]["Korea"].corr(box1.iloc[:5]["Taiwan"])

# ── 저장 및 출력 ────────────────────────────────────────────────
out = os.path.join(ROOT, "output")
os.makedirs(out, exist_ok=True)
A7.to_csv(os.path.join(out, "table_A7_positions.csv"))
A8.to_csv(os.path.join(out, "table_A8_DI.csv"))
fig4.rename("long_DI_Gap").to_csv(os.path.join(out, "fig4_long_DIgap.csv"))
box1.to_csv(os.path.join(out, "box1_korea_taiwan.csv"))

print("=== 표 A7 : (PBE−CBE)/PBE 상대 격차 ===");            print(A7, "\n")
print("=== 표 A8 : 기간별 Tapio DI (발췌: EU-Core) ===");     print(A8.loc["EU-Core"], "\n")
print("=== 그림 4 : long-period DI Gap (1995–2019) ===");     print(fig4, "\n")
print("=== Box 1 : 한국·대만 하위 기간별 DI Gap ===");         print(box1)
print(f"하위 5개 기간 Pearson r = {r_sub:+.2f}  (본문 Box 1: +0.12, n=5, 서술적 참고치)\n")

# ── 논문 게재 수치와의 자동 대조 (soft check) ───────────────────
EXPECT_FIG4 = {"Non-EU Sandwich": 0.158, "Resource": 0.070, "ASEAN": 0.029,
               "China": -0.046, "EU-Periphery": -0.055,
               "High-income Importer": -0.066, "EU-Core": -0.084}
print("=== 게재 수치 대조 ===")
flag = "OK " if abs(r_sub - 0.12) < 5e-3 else "Δ!!"
print(f"  [{flag}] Box 1 상관계수 r=+0.12        재현 {r_sub:+.2f}")
for g, v in EXPECT_FIG4.items():
    got = fig4.get(g)
    flag = "OK " if got is not None and abs(got - v) < 5e-4 else "Δ!!"
    print(f"  [{flag}] {g:24s} 논문 {v:+.3f} / 재현 {got:+.3f}")
