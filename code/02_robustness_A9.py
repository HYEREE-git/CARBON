# -*- coding: utf-8 -*-
"""
02_robustness_A9.py
────────────────────────────────────────────────────────────────────
부록 A9 강건성 검증(A9.1–A9.6) 전체를 재현한다.

  A9.1  순열검정 (placebo N=2 더미, 20,000회, seed 고정)
  A9.2  Leave-one-out (한국/대만 각각 제외)
  A9.3  6개 그룹 더미 다중비교 보정 (Bonferroni·Holm·FDR)
  A9.4  그룹 정의 임계값 격자 탐색 (소득 × 제조업 비중)
  A9.5  기준연도 민감도 (2000·2005 기준 재계산)
  A9.6  조건(iv) 제거 대안 정의 (한국·대만·일본)

입력 : data/country_panel_48.csv
출력 : output/A9_*.csv + 콘솔 요약(게재 수치 자동 대조 포함)
실행 : python code/02_robustness_A9.py
필요 : pandas, numpy, statsmodels
"""
import os
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from statsmodels.stats.multitest import multipletests

SEED = 20260711          # 순열검정 재현용 고정 시드
N_PERM = 20000

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "output")
os.makedirs(OUT, exist_ok=True)

df = pd.read_csv(os.path.join(ROOT, "data", "country_panel_48.csv"))

# ── 파생변수: 국가별 장기 Tapio DI 및 DI Gap (1995–2019) ────────
def tapio(e0, e1, g0, g1):
    return ((e1 - e0) / e0) / ((g1 - g0) / g0)

df["DI_PBE"] = tapio(df.PBE_1995, df.PBE_2019, df.GDP_1995, df.GDP_2019)
df["DI_CBE"] = tapio(df.CBE_1995, df.CBE_2019, df.GDP_1995, df.GDP_2019)
df["DI_Gap"] = df.DI_PBE - df.DI_CBE
df["D_sand"] = (df.group == "Non-EU Sandwich").astype(int)

def ols_dummy(d, dummy_col, y="DI_Gap"):
    m = smf.ols(f"{y} ~ {dummy_col}", data=d).fit(cov_type="HC1")
    return m.params[dummy_col], m.pvalues[dummy_col]

coef0, p0 = ols_dummy(df, "D_sand")
print(f"[기준] Sandwich 더미(이변량, HC1): coef={coef0:+.4f}, p={p0:.4f}  (N={len(df)})")

# ═══ A9.1 순열검정 ═══════════════════════════════════════════════
rng = np.random.default_rng(SEED)
y = df.DI_Gap.values
n = len(df)
count = 0
for _ in range(N_PERM):
    pick = rng.choice(n, 2, replace=False)
    mask = np.zeros(n, bool); mask[pick] = True
    # 이변량 더미 회귀의 계수 = 두 집단 평균차 (수학적 동치, 고속화)
    if abs(y[mask].mean() - y[~mask].mean()) >= abs(coef0):
        count += 1
p_emp = count / N_PERM
print(f"\n[A9.1 순열검정] 경험적 p = {p_emp:.3f}  ({N_PERM:,}회, seed={SEED})")

# ═══ A9.2 Leave-one-out ══════════════════════════════════════════
loo_rows = []
for drop, remain in (("Republic of Korea", "대만"), ("Taiwan", "한국")):
    dd = df[df.name != drop].copy()
    c, p = ols_dummy(dd, "D_sand")
    loo_rows.append({"제외": drop, "잔여": remain, "coef": round(c, 3), "p": round(p, 4)})
    print(f"[A9.2 LOO] {drop} 제외 → coef={c:+.3f}, p={p:.4f}")
pd.DataFrame(loo_rows).to_csv(os.path.join(OUT, "A9_2_leave_one_out.csv"), index=False)

# ═══ A9.3 다중비교 보정 ══════════════════════════════════════════
res = []
for g in df.group.unique():
    df["_d"] = (df.group == g).astype(int)
    if 0 < df._d.sum() < len(df):
        c, p = ols_dummy(df, "_d")
        res.append({"group": g, "n": int(df._d.sum()), "coef": c, "p_raw": p})
R = pd.DataFrame(res)
for method, name in (("bonferroni", "Bonferroni"), ("holm", "Holm"), ("fdr_bh", "FDR")):
    R["p_" + name] = multipletests(R.p_raw, method=method)[1]
R = R.round(4)
R.to_csv(os.path.join(OUT, "A9_3_multiple_comparison.csv"), index=False)
print("\n[A9.3 다중비교]\n", R.to_string(index=False))

# ═══ A9.4 임계값 격자 탐색 ═══════════════════════════════════════
sweep = []
for thr_inc in (12535, 15000, 20000, 25000, 30000):
    for thr_manu in (0.15, 0.18, 0.20, 0.22, 0.25):
        cond = ((df.gdppc_2019 >= thr_inc) & (df.manu_share_2019 >= thr_manu)
                & (df.DI_PBE > 0) & (df.is_eu == 0))
        members = ", ".join(sorted(df.loc[cond, "code"]))
        d = df.copy(); d["_d"] = cond.astype(int)
        c = p = np.nan
        if 0 < d._d.sum() < len(d):
            c, p = ols_dummy(d, "_d")
        sweep.append({"income_thr": thr_inc, "manu_thr": thr_manu,
                      "N": int(cond.sum()), "coef": round(c, 3) if c == c else None,
                      "p": round(p, 3) if p == p else None, "members": members})
S = pd.DataFrame(sweep)
S.to_csv(os.path.join(OUT, "A9_4_threshold_sweep.csv"), index=False)
key = S[(S.income_thr == 20000) & (S.manu_thr.isin([0.20, 0.22]))]
print("\n[A9.4 임계값 격자] (표 A9.3 해당 행)\n", key.to_string(index=False))

# ═══ A9.5 기준연도 민감도 ════════════════════════════════════════
by_rows = []
for by in (1995, 2000, 2005):
    dg = (tapio(df[f"PBE_{by}"], df.PBE_2019, df[f"GDP_{by}"], df.GDP_2019)
          - tapio(df[f"CBE_{by}"], df.CBE_2019, df[f"GDP_{by}"], df.GDP_2019))
    d2 = df.copy(); d2["DGB"] = dg
    m = smf.ols("DGB ~ D_sand", data=d2).fit(cov_type="HC1")
    by_rows.append({"기준연도": by,
                    "한국": round(dg[df.code == "KOR"].iloc[0], 3),
                    "대만": round(dg[df.code == "TWN"].iloc[0], 3),
                    "Sandwich_coef": round(m.params["D_sand"], 3),
                    "p": round(m.pvalues["D_sand"], 3)})
BY = pd.DataFrame(by_rows)
BY.to_csv(os.path.join(OUT, "A9_5_base_year.csv"), index=False)
print("\n[A9.5 기준연도]\n", BY.to_string(index=False))

# ═══ A9.6 조건(iv) 제거 대안 정의 ════════════════════════════════
# 조건 (i) Non-EU, (ii) 1인당 GDP ≥ $20,000, (iii) 자체 탄소가격제 운영.
# (iii)의 후보국 판정: 일본(탄소세) 충족, 말레이시아 미충족 → 대안 그룹 = 한국·대만·일본.
alt = ["KOR", "TWN", "JPN"]
df["_alt"] = df.code.isin(alt).astype(int)
c_alt, p_alt = ols_dummy(df, "_alt")
jp_gap = df.loc[df.code == "JPN", "DI_Gap"].iloc[0]
print(f"\n[A9.6 대안 정의] 그룹={{한국, 대만, 일본}} → coef={c_alt:+.3f}, p={p_alt:.3f} | "
      f"일본 장기 DI Gap={jp_gap:+.3f}, 일본 DI_PBE={df.loc[df.code=='JPN','DI_PBE'].iloc[0]:+.3f} (<0)")

# ═══ 게재 수치 자동 대조 ═════════════════════════════════════════
print("\n=== 게재 수치 대조 (부록 A9) ===")
checks = [
    ("A9 기준 계수 +0.162",         coef0,                 0.162),
    ("A9 기준 p 0.035",             p0,                    0.035),
    ("A9.1 경험적 p 0.302",         p_emp,                 0.302),
    ("A9.2 대만 제외 +0.065",       loo_rows[1]["coef"],   0.259),   # 한국 제외 → 대만
    ("A9.2 한국 제외 +0.259",       loo_rows[0]["coef"],   0.065),   # 대만 제외 → 한국
    ("A9.3 Bonferroni 0.243",       R.loc[R.group == "Non-EU Sandwich", "p_Bonferroni"].iloc[0], 0.243),
    ("A9.3 Holm 0.208",             R.loc[R.group == "Non-EU Sandwich", "p_Holm"].iloc[0],       0.208),
    ("A9.3 FDR 0.122",              R.loc[R.group == "Non-EU Sandwich", "p_FDR"].iloc[0],        0.122),
    ("A9.5 기준 2000 계수 -0.076",  BY.loc[BY.기준연도 == 2000, "Sandwich_coef"].iloc[0], -0.076),
    ("A9.5 기준 2005 계수 +0.507",  BY.loc[BY.기준연도 == 2005, "Sandwich_coef"].iloc[0],  0.507),
    ("A9.6 대안그룹 계수 +0.265",   c_alt,                 0.265),
    ("A9.6 일본 DI Gap +0.474",     jp_gap,                0.474),
]
# 주의: A9.2의 두 행은 '제외국' 기준으로 정렬 — 대만 제외 시 잔여=한국(+0.065), 한국 제외 시 잔여=대만(+0.259)
checks[3] = ("A9.2 대만 제외 → +0.065", loo_rows[1]["coef"], 0.065)
checks[4] = ("A9.2 한국 제외 → +0.259", loo_rows[0]["coef"], 0.259)
for label, got, want in checks:
    flag = "OK " if abs(float(got) - want) < 2.5e-3 else "Δ!!"
    print(f"  [{flag}] {label:28s} 재현 {float(got):+.3f}")
