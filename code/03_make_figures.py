# -*- coding: utf-8 -*-
"""
03_make_figures.py
────────────────────────────────────────────────────────────────────
데이터 기반 그림(그림 3·4·5)을 country_panel_48.csv에서 직접 재현한다.

  그림 3 : 국가군별 탄소집약도(PBE/GDP) × 내재배출 무역위치, 1995→2019 궤적
  그림 4 : 국가군별 long-period DI Gap (1995–2019) 막대
  그림 5 : 탄소무역 위치 변화(1995→2019) × 장기 DI Gap

주: 그림 1·2는 PWT 10.0(csh_x)·WDI 제조업 비중(1995년분 포함) 등 별도 원천이
    추가로 필요하며(본문 그림 캡션 참조), 본 저장소 범위에서 제외한다.
    그림 6–8(CBAM 부문 노출)은 OECD DSD_ICIO_GHG_TRADE_2023 양자·부문 자료 기반.

출력 : output/fig3.png, output/fig4.png, output/fig5.png
실행 : python code/03_make_figures.py   (필요: matplotlib, pandas, CJK 폰트)
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

for cand in ("Noto Sans CJK KR", "Noto Sans CJK JP", "Malgun Gothic", "NanumGothic"):
    try:
        from matplotlib import font_manager as fm
        fm.findfont(cand, fallback_to_default=False)
        plt.rcParams["font.family"] = cand
        break
    except Exception:
        continue
plt.rcParams["axes.unicode_minus"] = False

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "output")
os.makedirs(OUT, exist_ok=True)

df = pd.read_csv(os.path.join(ROOT, "data", "country_panel_48.csv"))
agg = df.groupby("group")[[c for c in df.columns if c.startswith(("PBE_", "CBE_", "GDP_"))]].sum()

def tapio(e0, e1, g0, g1):
    return ((e1 - e0) / e0) / ((g1 - g0) / g0)

pos = {y: (agg[f"PBE_{y}"] - agg[f"CBE_{y}"]) / agg[f"PBE_{y}"] for y in (1995, 2019)}
inten = {y: agg[f"PBE_{y}"] * 1e3 / agg[f"GDP_{y}"] for y in (1995, 2019)}  # kgCO2/USD
digap = (tapio(agg.PBE_1995, agg.PBE_2019, agg.GDP_1995, agg.GDP_2019)
         - tapio(agg.CBE_1995, agg.CBE_2019, agg.GDP_1995, agg.GDP_2019))

COLOR = {"EU-Core": "#24567F", "EU-Periphery": "#7FB3D5",
         "High-income Importer": "#9467BD", "China": "#E67E22",
         "ASEAN": "#27A060", "Resource": "#C9A227", "Non-EU Sandwich": "#C0392B"}
LABEL = {"High-income Importer": "Advanced non-EU importers"}
FOCUS = "Non-EU Sandwich"

# ── 그림 4 ───────────────────────────────────────────────────────
order = digap.sort_values(ascending=False)
fig, ax = plt.subplots(figsize=(11, 6), dpi=160)
bars = ax.bar(range(len(order)), order.values,
              color=[("#C0392B" if g == FOCUS else "#1F3D5C") for g in order.index])
for i, (g, v) in enumerate(order.items()):
    ax.text(i, v + (0.006 if v >= 0 else -0.013), f"{v:+.3f}", ha="center",
            fontweight="bold" if g == FOCUS else "normal",
            color="#C0392B" if g == FOCUS else "#333")
ax.set_xticks(range(len(order)))
ax.set_xticklabels([LABEL.get(g, g) for g in order.index], fontsize=10)
ax.axhline(0, color="#444", lw=1)
ax.set_ylabel("Long-period DI Gap (1995–2019)")
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
fig.savefig(os.path.join(OUT, "fig4.png"))
plt.close(fig)

# ── 그림 3 ───────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(9.3, 6.9), dpi=160)
ax.axhspan(0, 0.15, color="#FDF1E8", alpha=0.55, zorder=0)
ax.axhspan(-0.30, 0, color="#EDF3F9", alpha=0.55, zorder=0)
ax.axhline(0, color="#C0392B", ls=(0, (5, 3)), lw=1.2)
for g in agg.index:
    c = COLOR[g]
    x0, y0 = inten[1995][g], pos[1995][g]
    x1, y1 = inten[2019][g], pos[2019][g]
    focus = g == FOCUS
    ax.annotate("", xy=(x1, y1), xytext=(x0, y0),
                arrowprops=dict(arrowstyle="-|>", color=c, lw=3 if focus else 1.5,
                                shrinkA=6, shrinkB=8))
    ax.scatter([x0], [y0], s=55, fc="white", ec=c, lw=1.5, zorder=4)
    ax.scatter([x1], [y1], s=130 if focus else 95, fc=c, ec="white", zorder=5)
    ax.annotate(LABEL.get(g, g), xy=(x1, y1), xytext=(0, 12), textcoords="offset points",
                ha="center", fontsize=9, fontweight="bold", color=c)
ax.set_xlabel("생산기반 탄소집약도 (PBE / GDP, kgCO2/USD)")
ax.set_ylabel("내재배출 무역위치 (PBE − CBE) / PBE")
ax.set_title("탄소집약도 × 무역위치, 1995 → 2019 (빈 원=1995, 채운 원=2019)")
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
fig.savefig(os.path.join(OUT, "fig3.png"))
plt.close(fig)

# ── 그림 5 ───────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(11, 8.4), dpi=160)
ax.axhline(0, color="#43484E", lw=1.4)
ax.axvline(0, color="#43484E", lw=1.4)
for g in agg.index:
    c = COLOR[g]; x = digap[g]; focus = g == FOCUS
    ax.annotate("", xy=(x, pos[2019][g]), xytext=(x, pos[1995][g]),
                arrowprops=dict(arrowstyle="-|>", color=c, lw=3.4 if focus else 2,
                                shrinkA=9, shrinkB=11))
    ax.scatter([x], [pos[1995][g]], s=170, fc="white", ec=c, lw=2.2, zorder=4)
    ax.scatter([x], [pos[2019][g]], s=240, fc=c, ec="white", zorder=5)
    ax.annotate(LABEL.get(g, g), xy=(x, max(pos[1995][g], pos[2019][g])),
                xytext=(0, 14), textcoords="offset points", ha="center",
                fontsize=10.5, fontweight="bold", color=c)
ax.set_xlabel("장기 DI Gap (1995–2019) = DI_PBE − DI_CBE")
ax.set_ylabel("(PBE − CBE) / PBE 상대 격차")
ax.set_title("탄소무역 위치 변화(1995→2019)와 장기 탈동조화 격차 (빈 원=1995, 채운 원=2019)")
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
fig.savefig(os.path.join(OUT, "fig5.png"))
plt.close(fig)

print("saved:", ", ".join(f"fig{i}.png" for i in (3, 4, 5)), "→ output/")
